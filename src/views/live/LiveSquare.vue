<template>
  <div class="live-square">
    <div class="page-header">
      <div class="header-title">直播</div>
    </div>

    <!-- Tab 切换 -->
    <van-tabs v-model:active="activeTab" @change="onTabChange">
      <van-tab title="直播中" name="live" />
      <van-tab title="即将开始" name="waiting" />
      <van-tab title="回放" name="replay" />
    </van-tabs>

    <!-- 直播列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadList">
        <div v-for="room in currentList" :key="room.room_id || room.id" class="live-card" @click="goToRoom(room)">
          <div class="live-card-cover">
            <van-image :src="room.cover_image || ''" fit="cover" width="100%" height="160">
              <template #error>
                <div class="cover-placeholder">
                  <van-icon name="video-o" size="48" color="#ccc" />
                </div>
              </template>
              <template #loading>
                <div class="cover-placeholder">
                  <van-icon name="video-o" size="48" color="#ccc" />
                </div>
              </template>
            </van-image>
            <van-tag v-if="activeTab === 'live'" type="danger" class="status-badge">直播中</van-tag>
            <van-tag v-else-if="activeTab === 'waiting'" type="warning" class="status-badge">即将开始</van-tag>
            <van-tag v-else type="default" class="status-badge">回放</van-tag>
            <van-tag v-if="room.type === 'paid'" type="primary" class="price-badge">{{ room.price }} 币</van-tag>
            <van-tag v-else type="success" class="price-badge">免费</van-tag>
          </div>
          <div class="live-card-info">
            <div class="live-card-title">{{ room.title || '直播间' }}</div>
            <div class="live-card-meta">
              <span class="host-name">{{ room.host_nickname || room.teacher_name || '主播' }}</span>
              <span class="view-count"><van-icon name="eye-o" /> {{ room.view_count || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <van-empty v-if="!loading && currentList.length === 0" :description="emptyText" image="search" />
      </van-list>
    </van-pull-refresh>

    <!-- 开播按钮（仅讲师和管理员可见） -->
    <div v-if="canCreate" class="create-btn" @click="router.push('/live/create')">
      <van-icon name="plus" size="20" />
      <span>开播</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import request from '../../api/request'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('live')
const list = ref([])        // 直播中 + 即将开始
const replayList = ref([])  // 回放
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const page = ref(1)
let pollTimer = null

// 当前显示的列表
const currentList = computed(() => {
  if (activeTab.value === 'replay') return replayList.value
  if (activeTab.value === 'waiting') return list.value.filter(r => r.status === 'waiting')
  return list.value.filter(r => r.status === 'live')
})

// 空状态文字
const emptyText = computed(() => {
  if (activeTab.value === 'live') return '暂无直播'
  if (activeTab.value === 'waiting') return '暂无即将开始的直播'
  return '暂无回放'
})

// 是否可以开播（讲师或管理员）
const canCreate = computed(() => {
  const role = userStore.userInfo?.role
  return role === 'teacher' || role === 'admin'
})

onMounted(() => {
  // 每 10 秒轮询刷新
  pollTimer = setInterval(() => {
    if (activeTab.value !== 'replay') loadList(true)
  }, 10000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

function onTabChange() {
  page.value = 1
  finished.value = false
  list.value = []
  replayList.value = []
  loadList()
}

function onRefresh() {
  page.value = 1
  finished.value = false
  list.value = []
  replayList.value = []
  loadList()
}

async function loadList(silent = false) {
  if (!silent) loading.value = true
  try {
    if (activeTab.value === 'replay') {
      const res = await request.get('/live/replay/list', { params: { page: page.value, page_size: 10 } })
      const data = res.data?.list || []
      if (page.value === 1) replayList.value = data
      else replayList.value.push(...data)
      if (data.length < 10) finished.value = true
    } else {
      const res = await request.get('/live/list', { params: { page: page.value, page_size: 20 } })
      const data = res.data?.list || []
      if (page.value === 1) list.value = data
      else list.value.push(...data)
      if (data.length < 20) finished.value = true
    }
    page.value++
  } catch {
    // 后端未部署时静默失败，显示空列表
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function goToRoom(room) {
  const roomId = room.room_id || room.id
  router.push(`/live/${roomId}`)
}
</script>

<style scoped>
.live-square { min-height: 100vh; background: #f7f8fa; padding-bottom: 60px; }
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px; background: #fff;
}
.header-title { font-size: 16px; font-weight: 600; }
.live-card {
  margin: 12px 16px; border-radius: 12px; overflow: hidden;
  background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.live-card:active { transform: scale(0.98); }
.live-card-cover { position: relative; }
.cover-placeholder {
  width: 100%; height: 160px; background: #ebedf0;
  display: flex; align-items: center; justify-content: center;
}
.status-badge { position: absolute; top: 8px; left: 8px; }
.price-badge { position: absolute; top: 8px; right: 8px; }
.live-card-info { padding: 10px 12px; }
.live-card-title { font-size: 15px; font-weight: 500; color: #333; margin-bottom: 6px; }
.live-card-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
.host-name { max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.create-btn {
  position: fixed; bottom: 80px; right: 20px; z-index: 100;
  display: flex; align-items: center; gap: 4px;
  padding: 10px 16px; background: #1989fa; color: #fff;
  border-radius: 20px; font-size: 14px; font-weight: 500;
  box-shadow: 0 4px 12px rgba(25,137,250,0.4);
}
</style>
