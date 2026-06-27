<template>
  <div class="wrong-book">
    <van-nav-bar title="错题本" left-arrow @click-left="router.back()">
      <template #right>
        <span style="font-size: 13px; color: #999;">共 {{ total }} 题</span>
      </template>
    </van-nav-bar>

    <van-loading v-if="loading" style="text-align: center; padding: 40px;" />

    <div v-else-if="sortedList.length === 0" style="padding-top: 80px;">
      <van-empty description="暂无错题，继续加油！" />
    </div>

    <template v-else>
      <!-- Review reminder -->
      <div v-if="dueCount > 0" class="review-banner">
        <van-icon name="bell-o" color="#ff6034" />
        <span>{{ dueCount }} 道题待复习</span>
      </div>

      <!-- Export buttons -->
      <div class="export-bar">
        <van-button plain type="primary" size="small" icon="description" :loading="exporting" loading-text="导出中..." @click="exportWord" style="margin-right: 8px;">
          导出 Word
        </van-button>
        <van-button plain type="success" size="small" icon="down" :loading="exportingCsv" loading-text="导出中..." @click="exportCsv">
          导出 CSV
        </van-button>
      </div>

      <van-cell-group>
        <van-swipe-cell v-for="item in sortedList" :key="item.record_id">
          <van-cell is-link @click="redoItem(item)">
            <template #title>
              <div class="wrong-item">
                <div class="wrong-tags">
                  <van-tag size="small" type="primary">
                    {{ item.question_snapshot?.knowledge_path?.split('/')[0] || '未知' }}
                  </van-tag>
                  <van-tag v-if="item._isDue" size="small" type="danger">待复习</van-tag>
                  <van-tag v-else-if="item._nextReview" size="small" plain>
                    {{ formatReviewDate(item._nextReview) }}
                  </van-tag>
                </div>
                <div class="wrong-stem">{{ item.question_snapshot?.stem || '题目已失效' }}</div>
                <div class="wrong-meta">
                  <span class="wrong-count">错误 {{ item.wrong_count }} 次</span>
                  <span class="wrong-time">上次: {{ formatTime(item.last_wrong_time) }}</span>
                </div>
                <div class="review-progress">
                  <span class="review-label">复习进度：</span>
                  <span
                    v-for="(interval, idx) in ebbinghausIntervals"
                    :key="idx"
                    class="review-dot"
                    :class="{ done: isReviewDone(item, interval), due: isReviewDue(item, interval) }"
                    :title="`第${idx + 1}次: ${interval}天后`"
                  />
                </div>
              </div>
            </template>
          </van-cell>
          <template #right>
            <van-button square type="danger" text="移除" @click="removeItem(item)" style="height: 100%;" />
          </template>
        </van-swipe-cell>
      </van-cell-group>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showLoadingToast, closeToast } from 'vant'
import request from '../../api/request'

const router = useRouter()
const loading = ref(true)
const exporting = ref(false)
const exportingCsv = ref(false)
const list = ref([])
const total = ref(0)

const ebbinghausIntervals = [1, 2, 4, 7, 15]

function getNextReviewDate(lastWrongTime) {
  if (!lastWrongTime) return null
  const base = new Date(lastWrongTime)
  const now = new Date()
  for (const days of ebbinghausIntervals) {
    const reviewDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
    if (reviewDate > now) return reviewDate
  }
  return null
}

function isReviewDone(item, intervalDays) {
  if (!item.last_wrong_time) return false
  const base = new Date(item.last_wrong_time)
  const reviewDate = new Date(base.getTime() + intervalDays * 24 * 60 * 60 * 1000)
  return new Date() >= reviewDate
}

function isReviewDue(item, intervalDays) {
  if (!item.last_wrong_time) return false
  const base = new Date(item.last_wrong_time)
  const reviewDate = new Date(base.getTime() + intervalDays * 24 * 60 * 60 * 1000)
  const now = new Date()
  const prevIdx = ebbinghausIntervals.indexOf(intervalDays) - 1
  if (prevIdx >= 0) {
    const prevDate = new Date(base.getTime() + ebbinghausIntervals[prevIdx] * 24 * 60 * 60 * 1000)
    if (now < prevDate) return false
  }
  return now >= reviewDate
}

const sortedList = computed(() => {
  const enriched = list.value.map(item => {
    const nextReview = getNextReviewDate(item.last_wrong_time)
    const isDue = nextReview && new Date() >= nextReview
    return { ...item, _nextReview: nextReview, _isDue: isDue }
  })
  return enriched.sort((a, b) => {
    if (a._isDue && !b._isDue) return -1
    if (!a._isDue && b._isDue) return 1
    if (a._nextReview && b._nextReview) return a._nextReview - b._nextReview
    if (a._nextReview) return -1
    if (b._nextReview) return 1
    return 0
  })
})

const dueCount = computed(() => sortedList.value.filter(i => i._isDue).length)

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatReviewDate(date) {
  if (!date) return ''
  const now = new Date()
  const diffMs = date - now
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays <= 0) return '今天复习'
  if (diffDays === 1) return '明天复习'
  return `${diffDays}天后复习`
}

async function loadList() {
  loading.value = true
  try {
    const res = await request.get('/practice/wrongbook')
    list.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

async function removeItem(item) {
  try {
    await showConfirmDialog({ title: '确认移除？' })
    await request.delete(`/practice/wrongbook/${item.record_id}`)
    list.value = list.value.filter(i => i.record_id !== item.record_id)
    total.value--
    showToast('已移除')
  } catch {}
}

async function redoItem(item) {
  try {
    const res = await request.post(`/practice/wrongbook/${item.record_id}/redo`)
    if (res.data?.session_id) {
      router.push(`/practice/exam/${res.data.session_id}`)
    }
  } catch (err) {
    showToast(err.message || '启动失败')
  }
}

// ===== Export Word =====
async function exportWord() {
  if (sortedList.value.length === 0) {
    showToast('暂无错题可导出')
    return
  }

  exporting.value = true
  showLoadingToast({ message: '正在生成文档...', forbidClick: true })

  try {
    // Call API to get export data
    const res = await request.post('/practice/wrongbook/export', {})
    const exportData = res.data

    if (!exportData || !exportData.items || exportData.items.length === 0) {
      showToast('暂无错题可导出')
      return
    }

    // Generate HTML content for Word
    const html = generateWordHtml(exportData)

    // Create blob and download
    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '我的错题本.doc'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    closeToast()
    showToast({ message: '导出成功', type: 'success' })
  } catch (err) {
    closeToast()
    showToast(err.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

function generateWordHtml(data) {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const typeMap = { single: '单选题', multi: '多选题', judge: '判断题' }

  let itemsHtml = ''
  data.items.forEach((item, idx) => {
    const q = item.question_snapshot || {}
    const options = q.options || []
    const correctAnswer = q.answer || ''
    const userAnswer = item.user_answer || '未作答'
    const isCorrect = item.is_correct

    let optionsText = options.map(opt => `${opt.label}. ${opt.content}`).join('<br/>')

    itemsHtml += `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <p style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">
          【第${idx + 1}题】${typeMap[q.question_type] || '题目'}&nbsp;&nbsp;
          <span style="color: #999; font-weight: normal; font-size: 12px;">${q.knowledge_path || ''}</span>
        </p>
        <p style="margin-bottom: 8px; line-height: 1.8;">${q.stem || '题目内容已失效'}</p>
        <p style="margin-bottom: 8px; line-height: 1.8; color: #333;">${optionsText}</p>
        <p style="margin-bottom: 4px;">
          <span style="color: #07c160; font-weight: bold;">正确答案：${correctAnswer}</span>
        </p>
        <p style="margin-bottom: 4px;">
          <span style="color: ${isCorrect ? '#07c160' : '#ee0a24'}; font-weight: bold;">
            你的答案：${Array.isArray(userAnswer) ? userAnswer.join('') : userAnswer} ${isCorrect ? '✔' : '✗'}
          </span>
        </p>
        ${q.explanation ? `<p style="margin-bottom: 4px; color: #666; font-size: 11px;">解析：${q.explanation}</p>` : ''}
        ${item.wrong_count > 1 ? `<p style="margin-bottom: 4px; color: #999; font-size: 11px;">错误次数：${item.wrong_count} 次</p>` : ''}
        <hr style="border: none; border-top: 1px solid #e8e8e8; margin-top: 12px;" />
      </div>
    `
  })

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: 宋体, SimSun, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #333;
    }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="font-size: 18pt; font-weight: bold; margin-bottom: 8px;">我的错题本 - Z考研</h1>
    <p style="text-align: right; font-size: 10pt; color: #999;">导出时间：${dateStr}</p>
    <p style="text-align: left; font-size: 11pt; color: #666;">共 ${data.items.length} 道错题</p>
  </div>
  ${itemsHtml}
  <div style="text-align: center; margin-top: 32px; color: #c8c9cc; font-size: 10pt;">
    — 由 Z考研 生成 —
  </div>
</body>
</html>`
}

// ===== Export CSV =====
async function exportCsv() {
  if (sortedList.value.length === 0) {
    showToast('暂无错题可导出')
    return
  }

  exportingCsv.value = true
  showLoadingToast({ message: '正在生成 CSV...', forbidClick: true })

  try {
    const token = localStorage.getItem('zky_token') || ''
    const response = await fetch('/api/v1/practice/wrongbook/export', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      throw new Error('导出失败')
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '错题导出.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    closeToast()
    showToast({ message: '导出成功', type: 'success' })
  } catch (err) {
    closeToast()
    showToast(err.message || '导出失败')
  } finally {
    exportingCsv.value = false
  }
}

onMounted(() => { loadList() })
</script>

<style scoped>
.wrong-book { min-height: 100vh; background: #f7f8fa; }
.export-bar { padding: 8px 16px; display: flex; justify-content: flex-end; }
.review-banner {
  display: flex; align-items: center; gap: 8px;
  margin: 12px 16px; padding: 12px 16px;
  background: #FFF3E0; border-left: 4px solid #ff6034; border-radius: 8px;
  font-size: 14px; color: #E65100;
}
.wrong-item { padding: 4px 0; }
.wrong-tags { display: flex; gap: 6px; margin-bottom: 4px; }
.wrong-stem { font-size: 14px; color: #333; margin: 8px 0; line-height: 1.5; }
.wrong-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
.wrong-count { color: #ee0a24; }
.review-progress { display: flex; align-items: center; gap: 4px; margin-top: 8px; }
.review-label { font-size: 11px; color: #999; margin-right: 2px; }
.review-dot { width: 8px; height: 8px; border-radius: 50%; background: #ebedf0; }
.review-dot.done { background: #c8c9cc; }
.review-dot.due { background: #ff6034; }
</style>
