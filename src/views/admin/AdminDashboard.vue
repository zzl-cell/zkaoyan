<template>
  <div class="admin-dashboard">
    <van-nav-bar title="数据概览" left-arrow @click-left="router.back()" />

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-value">{{ stats.total_users }}</div>
        <div class="stat-label">总用户数</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💬</div>
        <div class="stat-value">{{ stats.pending_feedbacks }}</div>
        <div class="stat-label">待处理工单</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-value">{{ stats.today_active_users }}</div>
        <div class="stat-label">今日活跃</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🛒</div>
        <div class="stat-value">{{ stats.total_orders }}</div>
        <div class="stat-label">总订单数</div>
      </div>
    </div>

    <van-cell-group title="快捷操作" inset style="margin-top: 16px;">
      <van-cell title="用户管理" is-link @click="router.push('/admin/users')" icon="friends-o" />
      <van-cell title="题目管理" is-link @click="router.push('/admin/questions')" icon="description" />
      <van-cell title="直播管理" is-link @click="router.push('/admin/live')" icon="video-o" />
      <van-cell title="订单管理" is-link @click="router.push('/admin/orders')" icon="orders-o" />
      <van-cell title="工单管理" is-link @click="router.push('/admin/feedbacks')" icon="comment-o" />
      <van-cell title="公告管理" is-link @click="router.push('/admin/notices')" icon="volume-o" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../../api/request'

const router = useRouter()
const stats = ref({
  total_users: 0,
  pending_feedbacks: 0,
  today_active_users: 0,
  total_orders: 0,
  total_revenue: 0,
})

onMounted(async () => {
  try {
    const res = await request.get('/admin/dashboard')
    stats.value = res.data
  } catch {}
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
}
.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.stat-icon { font-size: 28px; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: bold; color: #1989fa; }
.stat-label { font-size: 12px; color: #999; margin-top: 4px; }
</style>
