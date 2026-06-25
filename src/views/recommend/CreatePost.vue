<template>
  <div class="create-post">
    <van-nav-bar title="发布动态" left-text="取消" right-text="发布" @click-left="router.back()" @click-right="onPublish" />

    <van-field
      v-model="content"
      type="textarea"
      placeholder="分享你的备考心得..."
      rows="6"
      maxlength="2000"
      show-word-limit
    />

    <van-uploader v-model="fileList" multiple :max-count="9" />

    <!-- Topic tags -->
    <van-cell title="添加话题" is-link @click="showTopicSheet = true" />
    <div v-if="topicTags.length" style="padding: 0 16px 8px;">
      <van-tag v-for="tag in topicTags" :key="tag" closable size="medium" type="primary" style="margin-right: 6px;" @close="removeTag(tag)">
        {{ tag }}
      </van-tag>
    </div>

    <van-cell title="佩戴勋章" is-link @click="showBadgeSheet = true" />
    <van-cell v-if="wearingBadge" :title="`已佩戴: ${wearingBadge.name}`" value="取消" @click="wearingBadge = null" />

    <!-- Topic sheet -->
    <van-action-sheet v-model:show="showTopicSheet" title="选择话题">
      <div style="padding: 16px;">
        <van-field v-model="customTopic" placeholder="输入自定义话题" @keydown.enter="addCustomTopic">
          <template #button>
            <van-button size="small" type="primary" @click="addCustomTopic">添加</van-button>
          </template>
        </van-field>
        <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">
          <van-tag
            v-for="t in suggestedTopics"
            :key="t"
            size="medium"
            :type="topicTags.includes(t) ? 'primary' : 'default'"
            @click="toggleTopic(t)"
          >
            {{ t }}
          </van-tag>
        </div>
      </div>
    </van-action-sheet>

    <!-- Badge sheet -->
    <van-action-sheet v-model:show="showBadgeSheet" title="选择佩戴勋章">
      <div style="padding: 16px;">
        <van-empty v-if="!myBadges.length" description="暂无勋章" />
        <van-cell
          v-for="b in myBadges"
          :key="b.badge_id"
          :title="b.name"
          :label="b.description"
          clickable
          @click="wearingBadge = b; showBadgeSheet = false"
        />
      </div>
    </van-action-sheet>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '../../api/request'
import { useFeedStore } from '../../stores/feed'

const router = useRouter()
const feedStore = useFeedStore()

const content = ref('')
const fileList = ref([])
const topicTags = ref([])
const wearingBadge = ref(null)
const showTopicSheet = ref(false)
const showBadgeSheet = ref(false)
const customTopic = ref('')
const myBadges = ref([])
const publishing = ref(false)

const suggestedTopics = ['高等数学', '微观经济学', '英语四级', '线性代数', '会计学', '每日打卡', '学习笔记', '考研']

function toggleTopic(tag) {
  const idx = topicTags.value.indexOf(tag)
  if (idx >= 0) {
    topicTags.value.splice(idx, 1)
  } else if (topicTags.value.length < 5) {
    topicTags.value.push(tag)
  }
}

function removeTag(tag) {
  topicTags.value = topicTags.value.filter(t => t !== tag)
}

function addCustomTopic() {
  const t = customTopic.value.trim()
  if (!t) return
  if (topicTags.value.length >= 5) { showToast('最多5个话题'); return }
  if (topicTags.value.includes(t)) { showToast('话题已存在'); return }
  topicTags.value.push(t)
  customTopic.value = ''
}

async function onPublish() {
  if (!content.value.trim()) { showToast('请输入内容'); return }
  if (publishing.value) return
  publishing.value = true
  try {
    await request.post('/feed/post', {
      content: content.value.trim(),
      images: fileList.value.map(f => f.objectUrl || f.url || ''),
      topic_tags: topicTags.value,
      wearing_badge_id: wearingBadge.value?.badge_id || null,
    })
    // Reset feed so it reloads on next visit
    feedStore.resetFeed()
    showToast('发布成功')
    router.back()
  } catch (err) {
    showToast(err.message || '发布失败')
  } finally {
    publishing.value = false
  }
}

onMounted(async () => {
  try {
    const res = await request.get('/badge/my')
    myBadges.value = res.data?.badges || []
  } catch {}
})
</script>
