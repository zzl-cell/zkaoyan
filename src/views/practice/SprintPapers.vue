<template>
  <div class="sprint-papers">
    <van-nav-bar title="考前冲刺" left-arrow @click-left="router.back()" />
    <van-loading v-if="loading" style="text-align: center; padding: 40px;" />
    <van-cell-group v-else>
      <van-cell
        v-for="paper in papers"
        :key="paper.paper_id"
        :title="paper.name"
        :label="`题目数: ${paper.total_count} | 建议时长: ${paper.suggest_duration || 15}分钟`"
        is-link
        @click="startPaper(paper)"
      >
        <template #right-icon>
          <van-tag v-if="paper.status === 'active'" type="primary">可练习</van-tag>
        </template>
      </van-cell>
    </van-cell-group>
    <van-empty v-if="!loading && papers.length === 0" description="暂无试卷" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '../../api/request'

const router = useRouter()
const loading = ref(true)
const papers = ref([])

onMounted(async () => {
  try {
    const res = await request.get('/practice/sprint/papers')
    papers.value = res.data || []
  } catch (err) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
})

async function startPaper(paper) {
  // Check ongoing session
  try {
    const ongoingRes = await request.get('/practice/session/ongoing')
    if (ongoingRes.data) {
      try {
        await showConfirmDialog({ title: '有未完成的练习', message: '是否放弃当前练习开始新的？' })
        await request.post(`/practice/session/${ongoingRes.data.session_id}/abandon`)
      } catch { return }
    }
  } catch {}

  try {
    const res = await request.post(`/practice/sprint/${paper.paper_id}/start`)
    router.push(`/practice/exam/${res.data.session_id}`)
  } catch (err) {
    showToast(err.message || '启动失败')
  }
}
</script>

<style scoped>
.sprint-papers { min-height: 100vh; background: #f7f8fa; }
</style>
