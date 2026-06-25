<template>
  <div class="coin-account">
    <van-nav-bar title="虚拟币" left-arrow @click-left="router.back()" />

    <!-- Balance card -->
    <div class="balance-card">
      <div class="balance-number">{{ coinStore.balanceDisplay }}</div>
      <div class="balance-label">当前余额</div>
      <div class="balance-stats">
        <span>累计获得 {{ coinStore.totalEarned }}</span>
        <span class="divider">|</span>
        <span>累计消耗 {{ coinStore.totalSpent }}</span>
      </div>
    </div>

    <!-- Sign-in card -->
    <div class="sign-card">
      <div class="sign-info">
        <div class="sign-streak">
          <van-icon name="fire-o" color="#ff6034" size="18" />
          <span>已连续签到 {{ coinStore.streakDays }} 天</span>
        </div>
        <div v-if="coinStore.signedToday" class="sign-done">
          <van-icon name="passed" color="#07c160" size="16" />
          <span>今日已签到 +{{ coinStore.todayReward }} 币</span>
        </div>
      </div>
      <van-button
        v-if="!coinStore.signedToday"
        type="primary"
        size="small"
        round
        :loading="signLoading"
        @click="onSign"
      >
        签到领币
      </van-button>
      <van-button v-else type="default" size="small" round disabled>
        已签到
      </van-button>
    </div>

    <!-- Quick actions -->
    <van-grid :column-num="3" :border="false" style="margin: 12px 0;">
      <van-grid-item icon="cash-on-deliver" text="充值" @click="showRecharge = true" />
      <van-grid-item icon="orders-o" text="流水记录" @click="router.push('#transactions')" />
      <van-grid-item icon="chart-trending-o" text="概率日志" @click="router.push('/profile/coin/prob-log')" />
    </van-grid>

    <!-- Recharge plans -->
    <van-action-sheet v-model:show="showRecharge" title="充值">
      <div class="recharge-list">
        <van-cell
          v-for="plan in rechargePlans"
          :key="plan.coin"
          :title="`${plan.rmb}元 = ${plan.coin}币`"
          :label="plan.tag || ''"
          is-link
          @click="onRecharge(plan)"
        />
      </div>
    </van-action-sheet>

    <!-- Transaction list -->
    <div id="transactions">
      <van-cell-group title="流水记录">
        <van-empty v-if="!coinStore.transactions.length" description="暂无流水记录" />
        <van-cell
          v-for="tx in coinStore.transactions"
          :key="tx.transaction_id"
          :title="tx.description"
          :label="formatTime(tx.created_at)"
          :value="(tx.amount > 0 ? '+' : '') + tx.amount"
          :value-class="tx.amount > 0 ? 'tx-earn' : 'tx-spend'"
        />
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useCoinStore } from '../../stores/coin'

const router = useRouter()
const coinStore = useCoinStore()

const signLoading = ref(false)
const showRecharge = ref(false)
const rechargePlans = [
  { rmb: 6, coin: 600, tag: '' },
  { rmb: 18, coin: 1800, tag: '热门' },
  { rmb: 30, coin: 3000, tag: '超值' },
  { rmb: 68, coin: 6800, tag: '' },
  { rmb: 128, coin: 12800, tag: '' },
  { rmb: 328, coin: 32800, tag: '' },
]

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function onSign() {
  signLoading.value = true
  try {
    const result = await coinStore.signIn()
    showToast({ message: `签到成功 +${result.total_reward} 币`, type: 'success' })
  } catch (e) {
    // Error handled by request interceptor
  } finally {
    signLoading.value = false
  }
}

function onRecharge(plan) {
  showRecharge.value = false
  showToast({ message: '充值功能暂未开放', type: 'fail' })
}

onMounted(async () => {
  try {
    await Promise.all([
      coinStore.fetchBalance(),
      coinStore.fetchSignStatus(),
      coinStore.fetchTransactions(),
    ])
  } catch {}
})
</script>

<style scoped>
.balance-card {
  text-align: center;
  padding: 24px 16px 16px;
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  color: #fff;
}
.balance-number {
  font-size: 36px;
  font-weight: bold;
}
.balance-label {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}
.balance-stats {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 8px;
}
.balance-stats .divider {
  margin: 0 8px;
}
.sign-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.sign-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sign-streak {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
}
.sign-done {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #07c160;
}
.recharge-list {
  padding: 0 0 16px;
}
.tx-earn {
  color: #07c160 !important;
}
.tx-spend {
  color: #ee0a24 !important;
}
</style>
