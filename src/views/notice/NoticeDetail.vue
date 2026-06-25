<template>
  <div class="notice-detail">
    <van-nav-bar :title="notice.title || '公告详情'" left-arrow @click-left="router.back()" />

    <div class="notice-header">
      <van-tag :type="tagType">{{ notice.tag }}</van-tag>
      <div class="notice-time">{{ notice.time }}</div>
    </div>

    <div class="notice-content" v-html="sanitizedContent"></div>

    <div style="padding: 16px;">
      <van-button block @click="router.push('/notice')">返回公告列表</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DOMPurify from 'dompurify'

const router = useRouter()
const route = useRoute()

// Welcome notice (hardcoded, will be replaced by API later)
const welcomeNotice = {
  title: '欢迎来到Z考研',
  tag: '系统通知',
  time: '2026-06-24',
  content: `
    <p>欢迎来到Z考研，你的专属大学生备考社区！</p>
    <br/>
    <p>在这里，你可以：</p>
    <ul>
      <li>📝 <strong>刷题练习</strong>：考前冲刺、乱序练习、模拟考试，多种模式助你高效备考</li>
      <li>📚 <strong>资料购买</strong>：海量学习资料，覆盖经济学、会计学、高等数学等热门学科</li>
      <li>💬 <strong>学习社区</strong>：发布动态、参与讨论，和全国大学生一起进步</li>
      <li>🏆 <strong>称号系统</strong>：刷题、签到、社交互动，解锁专属勋章</li>
    </ul>
    <br/>
    <p>更多精彩内容即将上线，敬请期待！</p>
    <br/>
    <p style="text-align: right; color: #999;">——Z考研团队</p>
  `,
}

// Default fallback notice
const defaultNotice = {
  title: '公告详情',
  tag: '系统通知',
  time: '2026-06-24',
  content: '<p>暂无内容</p>',
}

const notice = ref(defaultNotice)

const tagType = computed(() => {
  const tagMap = {
    '系统通知': 'primary',
    '纠错奖励': 'success',
    '活动公告': 'warning',
  }
  return tagMap[notice.value.tag] || 'primary'
})

const sanitizedContent = computed(() => DOMPurify.sanitize(notice.value.content))

onMounted(() => {
  const id = route.params.id

  // TODO: Replace with API call: const res = await getNoticeDetail(id)
  // For now, serve hardcoded content
  if (id === 'welcome') {
    notice.value = welcomeNotice
  } else {
    notice.value = defaultNotice
  }
})
</script>

<style scoped>
.notice-detail {
  min-height: 100vh;
  background: #fff;
}
.notice-header {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.notice-time {
  font-size: 12px;
  color: #999;
}
.notice-content {
  padding: 0 16px 16px;
  font-size: 15px;
  line-height: 1.8;
  color: #333;
}
.notice-content :deep(ul) {
  padding-left: 20px;
}
.notice-content :deep(li) {
  margin-bottom: 8px;
}
</style>
