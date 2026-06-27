<template>
  <div class="replay-list">
    <van-nav-bar title="直播回放" left-arrow @click-left="router.back()" />

    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadReplays">
      <div v-for="room in list" :key="room.id" class="replay-card" @click="goToReplay(room)">
        <div class="replay-cover">
          <van-image :src="room.cover_image || ''" fit="cover" width="120" height="80">
            <template #error><div class="cover-placeholder">🎬</div></template>
            <template #loading><div class="cover-placeholder">🎬</div></template>
          </van-image>
        </div>
        <div class="replay-info">
          <div class="replay-title">{{ room.title }}</div>
          <div class="replay-meta">
            <span>{{ room.host_nickname || '主播' }}</span>
            <span><van-icon name="eye-o" /> {{ room.view_count || 0 }}</span>
          </div>
          <div class="replay-time">{{ formatDuration(room.started_at, room.ended_at) }}</div>
        </div>
      </div>
      <van-empty v-if="!loading && list.length === 0" description="暂无回放" image="search" />
    </van-list>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '../../api/request'

const router = useRouter()
const list = ref([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

async function loadReplays() {
  loading.value = true
  try {
    const res = await request.get('/live/replay/list', { params: { page: page.value, page_size: 10 } })
    const data = res.data.list || []
    if (page.value === 1) list.value = data
    else list.value.push(...data)
    if (data.length < 10) finished.value = true
    page.value++
  } catch {} finally { loading.value = false }
}

function goToReplay(room) {
  router.push(`/live/${room.id}`)
}

function formatDuration(start, end) {
  if (!start || !end) return ''
  const dur = Math.floor((new Date(end) - new Date(start)) / 1000)
  const m = Math.floor(dur / 60)
  const s = dur % 60
  return `${m}分${s}秒`
}
</script>

<style scoped>
.replay-list { min-height: 100vh; background: #f7f8fa; }
.replay-card {
  display: flex; gap: 12px; padding: 12px 16px;
  background: #fff; margin-bottom: 1px; cursor: pointer;
}
.replay-card:active { background: #f5f5f5; }
.replay-cover { flex-shrink: 0; border-radius: 8px; overflow: hidden; }
.cover-placeholder {
  width: 120px; height: 80px; background: #ebedf0;
  display: flex; align-items: center; justify-content: center; font-size: 28px;
}
.replay-info { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.replay-title { font-size: 14px; font-weight: 500; color: #333; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.replay-meta { display: flex; gap: 12px; font-size: 12px; color: #999; margin-bottom: 4px; }
.replay-time { font-size: 12px; color: #999; }
</style>
