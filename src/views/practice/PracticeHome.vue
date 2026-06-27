<template>
  <div class="practice-home">
    <div class="page-header">
      <div class="header-title">练习</div>
    </div>

    <!-- Data overview -->
    <div class="stats-card">
      <van-grid :column-num="4" :border="false">
        <van-grid-item>
          <div class="stat-value">{{ stats.today_questions }}</div>
          <div class="stat-label">今日刷题</div>
        </van-grid-item>
        <van-grid-item>
          <div class="stat-value">{{ stats.total_questions }}</div>
          <div class="stat-label">累计刷题</div>
        </van-grid-item>
        <van-grid-item>
          <div class="stat-value">{{ stats.accuracy }}%</div>
          <div class="stat-label">正确率</div>
        </van-grid-item>
        <van-grid-item>
          <div class="stat-value">{{ stats.total_duration_hours }}h</div>
          <div class="stat-label">学习时长</div>
        </van-grid-item>
      </van-grid>
    </div>

    <!-- Ongoing session banner -->
    <div v-if="ongoingSession" class="ongoing-banner" @click="resumeSession">
      <van-icon name="clock-o" color="#1989fa" />
      <span class="ongoing-text">
        发现未完成的练习：{{ ongoingSession.paper_snapshot.title }}
        ({{ Object.keys(ongoingSession.user_answers).length }}/{{ ongoingSession.paper_snapshot.total_count }}题)
      </span>
      <van-button size="mini" type="primary">继续</van-button>
    </div>

    <!-- Purchased question banks -->
    <van-cell-group title="我的题库">
      <template v-if="banks.length">
        <van-collapse v-model="expandedBanks">
          <van-collapse-item
            v-for="bank in banks"
            :key="bank.product_id"
            :name="bank.product_id"
            :title="bank.product_name"
            :label="`${bank.question_count}道题`"
          >
            <div class="bank-modes">
              <div class="mode-card" @click="startBankPractice(bank.product_id, 'random')">
                <van-icon name="exchange" color="#1989fa" size="24" />
                <div class="mode-name">乱序练习</div>
                <div class="mode-desc">随机抽20题</div>
              </div>
              <div class="mode-card" @click="openMockSheet(bank.product_id)">
                <van-icon name="clock-o" color="#07c160" size="24" />
                <div class="mode-name">模拟考试</div>
                <div class="mode-desc">倒计时答题</div>
              </div>
              <div class="mode-card" @click="startBankPractice(bank.product_id, 'sprint')">
                <van-icon name="fire-o" color="#ff6034" size="24" />
                <div class="mode-name">模拟练习</div>
                <div class="mode-desc">即时反馈</div>
              </div>
            </div>
          </van-collapse-item>
        </van-collapse>
      </template>
      <template v-else>
        <van-empty v-if="!banksLoading" description="暂未购买题库">
          <van-button type="primary" size="small" @click="router.push('/shop')">前往资料商城</van-button>
        </van-empty>
      </template>
    </van-cell-group>

    <!-- Quick entries -->
    <van-cell-group title="快捷入口">
      <van-cell title="错题本" is-link :value="wrongBookCount ? `${wrongBookCount}题` : ''" @click="router.push('/practice/wrongbook')">
        <template #icon><van-icon name="warn-o" color="#ee0a24" style="margin-right: 8px;" /></template>
      </van-cell>
      <van-cell title="收藏题目" is-link @click="router.push('/practice/favorites')">
        <template #icon><van-icon name="star-o" color="#ff976a" style="margin-right: 8px;" /></template>
      </van-cell>
      <van-cell title="刷题记录" is-link @click="router.push('/practice/history')">
        <template #icon><van-icon name="bar-chart-o" color="#1989fa" style="margin-right: 8px;" /></template>
      </van-cell>
    </van-cell-group>

    <!-- Mock exam duration sheet -->
    <van-action-sheet v-model:show="showMockSheet" title="选择考试时长">
      <div class="duration-grid">
        <div
          v-for="d in durations"
          :key="d"
          class="duration-item"
          :class="{ active: selectedDuration === d }"
          @click="selectedDuration = d"
        >
          {{ d }}分钟
        </div>
      </div>
      <div style="padding: 16px;">
        <van-button block type="primary" @click="startMock">开始考试</van-button>
      </div>
    </van-action-sheet>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '../../api/request'
import { getUserAssets } from '../../api/shop'

const router = useRouter()
const route = useRoute()

const stats = reactive({ today_questions: 0, total_questions: 0, accuracy: 0, total_duration_hours: 0 })
const ongoingSession = ref(null)
const wrongBookCount = ref(0)
const showMockSheet = ref(false)
const selectedDuration = ref(60)
const durations = [15, 30, 45, 60, 75, 120]
const loading = ref(false)

// Question bank state
const banks = ref([])
const banksLoading = ref(true)
const expandedBanks = ref([])
const activeBankId = ref(null)

onMounted(async () => {
  await Promise.all([loadData(), loadBanks()])

  // Auto-start practice if product_id is in query (from purchase flow)
  const queryProductId = route.query.product_id
  if (queryProductId && !ongoingSession.value) {
    // Verify the user owns this bank
    const owned = banks.value.some(b => b.product_id === queryProductId)
    if (owned) {
      await startBankPractice(queryProductId, 'random')
    }
  }
})

async function loadData() {
  try {
    const [statsRes, ongoingRes, wbRes] = await Promise.all([
      request.get('/practice/stats'),
      request.get('/practice/session/ongoing'),
      request.get('/practice/wrongbook/stats'),
    ])
    Object.assign(stats, statsRes.data)
    ongoingSession.value = ongoingRes.data
    wrongBookCount.value = wbRes.data?.total || 0
  } catch {}
}

async function loadBanks() {
  try {
    const res = await getUserAssets()
    banks.value = (res.data.items || res.data.list || []).filter(a => a.is_question_bank)
  } catch {} finally {
    banksLoading.value = false
  }
}

async function resumeSession() {
  if (!ongoingSession.value) return
  router.push(`/practice/exam/${ongoingSession.value.session_id}`)
}

function openMockSheet(bankProductId) {
  activeBankId.value = bankProductId
  showMockSheet.value = true
}

async function startBankPractice(bankProductId, mode) {
  if (loading.value) return

  // Handle ongoing session conflict
  if (ongoingSession.value) {
    try {
      await showConfirmDialog({ title: '有未完成的练习', message: '是否放弃当前练习开始新的？' })
      // User confirmed — abandon old session
      try {
        await request.post(`/practice/session/${ongoingSession.value.session_id}/abandon`)
      } catch {}
      // Clear stale state regardless of API result
      ongoingSession.value = null
    } catch {
      // User cancelled dialog — do nothing, stay on page
      return
    }
  }

  loading.value = true
  try {
    let res
    if (mode === 'random') {
      res = await request.post('/practice/random/start', { product_id: bankProductId })
    } else if (mode === 'sprint') {
      res = await request.post(`/practice/sprint/paper_001/start`, { product_id: bankProductId })
    }
    if (res?.data?.session_id) {
      router.push(`/practice/exam/${res.data.session_id}`)
    }
  } catch (err) {
    showToast(err.message || '启动失败')
  } finally {
    loading.value = false
  }
}

async function startMock() {
  if (loading.value) return
  showMockSheet.value = false

  if (ongoingSession.value) {
    try {
      await showConfirmDialog({ title: '有未完成的练习', message: '是否放弃当前练习开始新的？' })
      try {
        await request.post(`/practice/session/${ongoingSession.value.session_id}/abandon`)
      } catch {}
      ongoingSession.value = null
    } catch {
      return
    }
  }

  loading.value = true
  try {
    const res = await request.post('/practice/mock/start', {
      duration: selectedDuration.value,
      product_id: activeBankId.value,
    })
    router.push(`/practice/exam/${res.data.session_id}`)
  } catch (err) {
    showToast(err.message || '启动失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.practice-home { min-height: 100vh; background: #f7f8fa; }
.page-header {
  display: flex; align-items: center; padding: 8px 16px; background: #fff;
}
.header-title { font-size: 16px; font-weight: 600; }
.stats-card { margin: 12px 16px; background: #fff; border-radius: 12px; padding: 12px 0; }
.stat-value { font-size: 20px; font-weight: bold; color: #1989fa; }
.stat-label { font-size: 12px; color: #999; margin-top: 4px; }
.ongoing-banner {
  display: flex; align-items: center; gap: 8px;
  margin: 0 16px 12px; padding: 12px 16px;
  background: #E8F4FD; border-left: 4px solid #1989fa; border-radius: 8px; cursor: pointer;
}
.ongoing-text { flex: 1; font-size: 13px; color: #333; }
.bank-modes {
  display: flex; gap: 12px; padding: 4px 0;
}
.mode-card {
  flex: 1; text-align: center; padding: 12px 8px;
  background: #f7f8fa; border-radius: 8px; cursor: pointer;
  border: 2px solid transparent; transition: all 0.2s;
}
.mode-card:active { border-color: #1989fa; background: #E8F4FD; }
.mode-name { font-size: 14px; font-weight: 500; margin-top: 6px; color: #333; }
.mode-desc { font-size: 11px; color: #999; margin-top: 2px; }
.duration-grid { display: flex; flex-wrap: wrap; padding: 16px; gap: 12px; }
.duration-item {
  flex: 0 0 calc(33.33% - 8px); text-align: center; padding: 12px;
  background: #f7f8fa; border-radius: 8px; font-size: 14px; cursor: pointer;
  border: 2px solid transparent;
}
.duration-item.active { border-color: #1989fa; background: #E8F4FD; color: #1989fa; }
</style>
