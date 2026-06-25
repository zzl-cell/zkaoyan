<template>
  <div class="questions-list">
    <van-nav-bar title="我的题库" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 60px 0;" />

    <template v-else>
      <!-- Empty state -->
      <van-empty v-if="banks.length === 0" description="暂未购买题库">
        <van-button type="primary" size="small" @click="router.push('/shop')">前往资料商城</van-button>
      </van-empty>

      <!-- Bank topic cards -->
      <div v-else class="bank-cards">
        <div
          v-for="bank in banks"
          :key="bank.product_id"
          class="bank-card"
          @click="router.push(`/profile/questions/${bank.product_id}`)"
        >
          <div class="bank-card-left">
            <van-icon name="edit" size="32" color="#1989fa" />
          </div>
          <div class="bank-card-body">
            <div class="bank-name">{{ bank.product_name }}</div>
            <div class="bank-meta">
              <span class="bank-count">{{ bank.question_count || '—' }} 道题</span>
              <span class="bank-category" v-if="bank.category">{{ bank.category }}</span>
            </div>
            <div class="bank-time">购买于 {{ formatTime(bank.purchased_at) }}</div>
          </div>
          <van-icon name="arrow" color="#c8c9cc" size="16" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUserAssets } from '../../api/shop'
import { showToast } from 'vant'

const router = useRouter()
const loading = ref(true)
const banks = ref([])

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onMounted(async () => {
  try {
    const res = await getUserAssets()
    banks.value = (res.data.list || []).filter(a => a.is_question_bank)
  } catch {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.questions-list {
  min-height: 100vh;
  background: #f7f8fa;
}
.bank-cards {
  padding: 12px 16px;
}
.bank-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin-bottom: 12px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 0.15s;
}
.bank-card:active {
  transform: scale(0.98);
}
.bank-card-left {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #e8f4fd;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bank-card-body {
  flex: 1;
  min-width: 0;
}
.bank-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bank-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}
.bank-count {
  font-size: 13px;
  color: #1989fa;
  font-weight: 500;
}
.bank-category {
  font-size: 11px;
  color: #999;
  padding: 1px 6px;
  background: #f5f5f5;
  border-radius: 4px;
}
.bank-time {
  font-size: 12px;
  color: #c8c9cc;
}
</style>
