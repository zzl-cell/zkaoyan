<template>
  <div class="study-history">
    <van-nav-bar title="刷题记录" left-arrow @click-left="router.back()" />

    <!-- Stats overview -->
    <van-cell-group>
      <van-cell title="累计刷题" :value="stats.total_questions + '题'" />
      <van-cell title="正确率" :value="stats.accuracy + '%'" />
      <van-cell title="学习时长" :value="stats.total_duration_hours + 'h'" />
    </van-cell-group>

    <!-- Today -->
    <van-cell-group title="今日">
      <van-cell title="今日刷题" :value="stats.today_questions + '题'" />
    </van-cell-group>

    <!-- Records list -->
    <van-cell-group title="最近记录">
      <van-loading v-if="loading" style="text-align: center; padding: 20px;" />
      <van-cell
        v-for="record in records"
        :key="record.record_id"
        :title="paperTypeLabel(record.paper_type)"
        :label="`${record.question_count}题 | 正确${record.correct_count}题 | ${formatDuration(record.duration_seconds)}`"
        :value="record.date"
      />
      <van-empty v-if="!loading && records.length === 0" description="暂无刷题记录" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '../../api/request'

const router = useRouter()
const loading = ref(true)
const stats = reactive({ today_questions: 0, total_questions: 0, accuracy: 0, total_duration_hours: 0 })
const records = ref([])

onMounted(async () => {
  try {
    const [statsRes, historyRes] = await Promise.all([
      request.get('/practice/stats'),
      request.get('/practice/history'),
    ])
    Object.assign(stats, statsRes.data)
    records.value = (historyRes.data?.list || []).slice().reverse().slice(0, 20)
  } catch {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
})

function paperTypeLabel(type) {
  const map = { sprint: '考前冲刺', random: '乱序练习', mock: '模拟考试' }
  return map[type] || type
}

function formatDuration(seconds) {
  if (!seconds) return '0分'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}
</script>

<style scoped>
.study-history { min-height: 100vh; background: #f7f8fa; }
</style>
