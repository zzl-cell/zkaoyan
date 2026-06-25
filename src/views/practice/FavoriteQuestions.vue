<template>
  <div class="favorite-questions">
    <van-nav-bar title="收藏题目" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px;" />

    <div v-else-if="list.length === 0" style="padding-top: 80px;">
      <van-empty description="暂无收藏题目" />
    </div>

    <van-cell-group v-else>
      <van-swipe-cell v-for="item in list" :key="item.favorite_id || item.question_id">
        <van-cell
          :title="getStem(item)"
          :label="getLabel(item)"
          is-link
          @click="showDetail(item)"
        />
        <template #right>
          <van-button square type="warning" text="取消收藏" @click="unfavorite(item)" style="height: 100%;" />
        </template>
      </van-swipe-cell>
    </van-cell-group>

    <!-- Question detail popup -->
    <van-popup v-model:show="showPopup" position="bottom" round style="max-height: 80vh;">
      <div class="detail-popup" v-if="detailItem">
        <div class="detail-header">
          <van-tag :type="typeTagType(detailItem)" size="small">{{ typeLabel(detailItem) }}</van-tag>
          <van-tag v-if="detailItem.question_snapshot?.difficulty" size="small" plain>
            {{ diffLabel(detailItem.question_snapshot.difficulty) }}
          </van-tag>
        </div>
        <div class="detail-stem">{{ detailItem.question_snapshot?.stem || detailItem.stem || '题目数据' }}</div>
        <div class="detail-opts">
          <div v-for="opt in (detailItem.question_snapshot?.options || detailItem.options || [])" :key="opt.label" class="detail-opt">
            {{ opt.label }}. {{ opt.content }}
          </div>
        </div>
        <div v-if="detailItem.question_snapshot?.answer || detailItem.answer" class="detail-answer">
          <van-tag type="primary" size="small">答案：{{ detailItem.question_snapshot?.answer || detailItem.answer }}</van-tag>
        </div>
        <div v-if="detailItem.question_snapshot?.explanation || detailItem.explanation" class="detail-explanation">
          解析：{{ detailItem.question_snapshot?.explanation || detailItem.explanation }}
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '../../api/request'

const router = useRouter()
const loading = ref(true)
const list = ref([])
const showPopup = ref(false)
const detailItem = ref(null)

function getStem(item) {
  const stem = item.question_snapshot?.stem || item.stem || ''
  if (!stem) return `题目 ${item.question_id || ''}`
  return stem.length > 60 ? stem.slice(0, 60) + '…' : stem
}

function getLabel(item) {
  const path = item.question_snapshot?.knowledge_path || item.knowledge_path || ''
  const type = item.question_snapshot?.question_type || ''
  const typeMap = { single: '单选', multi: '多选', judge: '判断' }
  return [path.split('/')[0], typeMap[type]].filter(Boolean).join(' · ') || '题目'
}

function typeLabel(item) {
  const type = item.question_snapshot?.question_type || ''
  const map = { single: '单选', multi: '多选', judge: '判断' }
  return map[type] || '题目'
}

function typeTagType(item) {
  const type = item.question_snapshot?.question_type || ''
  const map = { single: 'primary', multi: 'warning', judge: 'success' }
  return map[type] || 'primary'
}

function diffLabel(diff) {
  const map = { easy: '简单', medium: '中等', hard: '困难' }
  return map[diff] || diff
}

function showDetail(item) {
  detailItem.value = item
  showPopup.value = true
}

onMounted(async () => {
  try {
    const res = await request.get('/practice/favorites')
    list.value = res.data?.list || []
  } catch {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
})

async function unfavorite(item) {
  try {
    await showConfirmDialog({ title: '确认取消收藏？' })
    await request.delete(`/practice/favorites/${item.question_id}`)
    list.value = list.value.filter(i => (i.favorite_id || i.question_id) !== (item.favorite_id || item.question_id))
    showToast('已取消收藏')
  } catch {}
}
</script>

<style scoped>
.favorite-questions { min-height: 100vh; background: #f7f8fa; }
.detail-popup { padding: 16px 16px 32px; }
.detail-header { display: flex; gap: 6px; margin-bottom: 12px; }
.detail-stem { font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 12px; }
.detail-opts { margin-bottom: 12px; }
.detail-opt { font-size: 14px; color: #555; padding: 4px 0; }
.detail-answer { margin-bottom: 8px; }
.detail-explanation { font-size: 13px; color: #888; line-height: 1.5; padding: 10px; background: #fffbe8; border-radius: 8px; }
</style>
