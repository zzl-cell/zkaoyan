<template>
  <div class="admin-live">
    <van-nav-bar title="直播管理" left-arrow @click-left="router.back()" />

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total_rooms }}</div>
        <div class="stat-label">总场次</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.total_views }}</div>
        <div class="stat-label">总观看</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.total_purchases }}</div>
        <div class="stat-label">总收入</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.total_gifts }}</div>
        <div class="stat-label">总打赏</div>
      </div>
    </div>

    <!-- Status filter -->
    <van-tabs v-model:active="activeTab" @change="onTabChange">
      <van-tab title="全部" name="" />
      <van-tab title="等待中" name="waiting" />
      <van-tab title="直播中" name="live" />
      <van-tab title="已结束" name="ended" />
    </van-tabs>

    <!-- Room list -->
    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadRooms">
      <van-swipe-cell v-for="room in rooms" :key="room.id">
        <van-cell :title="room.title" :label="roomLabel(room)">
          <template #value>
            <div style="text-align: right;">
              <van-tag :type="statusTag(room.status)" size="small">{{ statusText(room.status) }}</van-tag>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">
                <van-icon name="eye-o" /> {{ room.view_count || 0 }}
              </div>
            </div>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="primary" text="详情" @click="onDetail(room)" />
          <van-button v-if="room.status !== 2" square type="warning" text="禁用" @click="onDisable(room)" />
          <van-button v-if="room.status === 2" square type="success" text="启用" @click="onEnable(room)" />
        </template>
      </van-swipe-cell>
    </van-list>

    <!-- Detail popup -->
    <van-popup v-model:show="showDetail" position="bottom" round style="max-height: 80vh;">
      <div class="detail-popup" v-if="detailItem">
        <div class="detail-section"><strong>房间ID：</strong>{{ detailItem.id }}</div>
        <div class="detail-section"><strong>标题：</strong>{{ detailItem.title }}</div>
        <div class="detail-section"><strong>主播：</strong>{{ detailItem.host_nickname || '未知' }}（{{ detailItem.host_phone || '-' }}）</div>
        <div class="detail-section"><strong>状态：</strong>{{ statusText(detailItem.status) }}</div>
        <div class="detail-section"><strong>类型：</strong>{{ detailItem.type === 'paid' ? `付费（${detailItem.price} 币）` : '免费' }}</div>
        <div class="detail-section"><strong>观看人次：</strong>{{ detailItem.view_count || 0 }}</div>
        <div class="detail-section"><strong>点赞数：</strong>{{ detailItem.like_count || 0 }}</div>
        <div class="detail-section"><strong>回放状态：</strong>{{ detailItem.record_status || 'none' }}</div>
        <div class="detail-section"><strong>公开回放：</strong>{{ detailItem.is_replay_public ? '是' : '否' }}</div>
        <div class="detail-section"><strong>创建时间：</strong>{{ detailItem.created_at }}</div>
        <div v-if="detailItem.started_at" class="detail-section"><strong>开始时间：</strong>{{ detailItem.started_at }}</div>
        <div v-if="detailItem.ended_at" class="detail-section"><strong>结束时间：</strong>{{ detailItem.ended_at }}</div>
        <van-button block plain style="margin-top: 12px;" @click="showDetail = false">关闭</van-button>
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

const stats = ref({ total_rooms: 0, total_views: 0, total_purchases: 0, total_gifts: 0 })
const rooms = ref([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const activeTab = ref('')
const showDetail = ref(false)
const detailItem = ref(null)

onMounted(async () => {
  try {
    const res = await request.get('/admin/live_stats')
    stats.value = res.data
  } catch {}
})

function statusText(s) {
  return { waiting: '等待中', live: '直播中', ended: '已结束' }[s] || s
}

function statusTag(s) {
  return { waiting: 'warning', live: 'danger', ended: 'default' }[s] || 'default'
}

function roomLabel(room) {
  const parts = []
  if (room.host_nickname) parts.push(room.host_nickname)
  if (room.created_at) parts.push(room.created_at.slice(0, 10))
  return parts.join(' · ')
}

function onTabChange() {
  page.value = 1
  finished.value = false
  rooms.value = []
  loadRooms()
}

async function loadRooms() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: 20 }
    if (activeTab.value) params.status = activeTab.value
    const res = await request.get('/admin/live', { params })
    const list = res.data.list || []
    if (page.value === 1) rooms.value = list
    else rooms.value.push(...list)
    if (list.length < 20) finished.value = true
    page.value++
  } catch {} finally { loading.value = false }
}

function onDetail(room) {
  detailItem.value = room
  showDetail.value = true
}

async function onDelete(room) {
  try {
    await showConfirmDialog({ title: '确认删除', message: room.title })
    await request.post('/live/delete', { room_id: room.room_id || room.id })
    showToast('已删除')
    rooms.value = rooms.value.filter(r => (r.room_id || r.id) !== (room.room_id || room.id))
  } catch {}
}

async function onDisable(room) {
  try {
    await showConfirmDialog({ title: '确认禁用', message: `禁用直播间：${room.title}` })
    await request.put(`/admin/live-rooms/${room.room_id || room.id}/disable`)
    room.status = 2
    showToast('已禁用')
  } catch { showToast('操作失败，后端可能未部署') }
}

async function onEnable(room) {
  try {
    await request.put(`/admin/live-rooms/${room.room_id || room.id}/enable`)
    room.status = 0
    showToast('已启用')
  } catch { showToast('操作失败，后端可能未部署') }
}
</script>

<style scoped>
.admin-live { min-height: 100vh; background: #f7f8fa; }
.stats-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 12px; padding: 16px;
}
.stat-card {
  background: #fff; border-radius: 8px; padding: 16px; text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.stat-value { font-size: 24px; font-weight: bold; color: #1989fa; }
.stat-label { font-size: 12px; color: #999; margin-top: 4px; }
.detail-popup { padding: 16px; }
.detail-section { font-size: 14px; color: #333; margin-bottom: 10px; line-height: 1.5; }
</style>
