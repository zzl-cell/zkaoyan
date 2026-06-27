<template>
  <div class="live-room">
    <!-- 顶部导航 -->
    <van-nav-bar :title="room?.title || '直播间'" left-arrow @click-left="router.back()">
      <template #right>
        <van-icon name="share-o" size="20" @click="onShare" />
      </template>
    </van-nav-bar>

    <!-- 加载中 -->
    <van-loading v-if="loadingRoom" style="text-align: center; padding: 60px 0;" />

    <template v-else>
      <!-- 视频播放区域 -->
      <div class="video-area">
        <!-- 有播放地址时渲染 TCPlayer -->
        <div v-if="hasPlayer" id="tcplayer-container" class="tcplayer-box"></div>
        <!-- 无播放地址时显示占位 -->
        <div v-else class="video-placeholder">
          <div class="placeholder-icon">📡</div>
          <div class="placeholder-text">{{ placeholderText }}</div>
        </div>
      </div>

      <!-- 直播间信息 -->
      <div v-if="room" class="room-info">
        <div class="room-title">{{ room.title || '直播间' }}</div>
        <div class="room-meta">
          <van-image v-if="room.host?.avatar" round width="24" height="24" :src="room.host.avatar" />
          <span class="host-name">{{ room.host?.nickname || room.host_nickname || '主播' }}</span>
          <span class="stat"><van-icon name="eye-o" /> {{ room.view_count || 0 }}</span>
          <span class="stat"><van-icon name="good-job-o" /> {{ room.like_count || 0 }}</span>
        </div>
      </div>

      <!-- 弹幕区域 -->
      <div class="chat-area" ref="chatAreaRef">
        <div v-for="msg in chatMessages" :key="msg.id || msg.chat_id" class="chat-msg" :class="{'chat-gift': msg.msg_type === 'gift'}">
          <template v-if="msg.msg_type === 'gift'">
            <span class="chat-nickname gift">🎁 {{ msg.nickname || '用户' }}</span>
            <span class="chat-content gift">{{ msg.content }}</span>
          </template>
          <template v-else>
            <span class="chat-nickname">{{ msg.nickname || '用户' }}：</span>
            <span class="chat-content">{{ msg.content }}</span>
          </template>
        </div>
        <div v-if="chatMessages.length === 0" class="chat-empty">暂无弹幕，快来发一条吧~</div>
      </div>

      <!-- 底部操作栏 -->
      <div class="action-bar">
        <van-field v-model="chatInput" placeholder="发弹幕..." size="small" class="chat-input" @keydown.enter="sendChat">
          <template #button>
            <van-button size="small" type="primary" @click="sendChat" :loading="sendingChat">发送</van-button>
          </template>
        </van-field>
        <div class="action-icons">
          <van-icon name="good-job-o" size="24" :color="liked ? '#ff6b6b' : '#666'" @click="doLike" />
          <van-icon name="gift-o" size="24" @click="showGiftPanel = true" />
        </div>
      </div>

      <!-- 主播/管理员：结束直播按钮 -->
      <div v-if="canStop && room?.status === 'live'" style="padding: 8px 16px;">
        <van-button block type="danger" @click="stopLive" :loading="stopping">结束直播</van-button>
      </div>

      <!-- 礼物面板 -->
      <van-popup v-model:show="showGiftPanel" position="bottom" round>
        <div class="gift-panel">
          <div class="gift-title">送礼物</div>
          <div class="gift-grid">
            <div v-for="gift in gifts" :key="gift.name" class="gift-item" :class="{'gift-selected': selectedGift?.name === gift.name}" @click="selectedGift = gift">
              <div class="gift-icon">{{ gift.icon }}</div>
              <div class="gift-name">{{ gift.name }}</div>
              <div class="gift-price">{{ gift.price }} 币</div>
            </div>
          </div>
          <van-button block type="primary" :disabled="!selectedGift" :loading="sendingGift" @click="sendGift">
            {{ selectedGift ? `赠送 ${selectedGift.name}（${selectedGift.price} 币）` : '请选择礼物' }}
          </van-button>
        </div>
      </van-popup>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../../stores/user'
import request from '../../api/request'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const room = ref(null)
const loadingRoom = ref(true)
const chatMessages = ref([])
const chatInput = ref('')
const sendingChat = ref(false)
const liked = ref(false)
const stopping = ref(false)
const showGiftPanel = ref(false)
const selectedGift = ref(null)
const sendingGift = ref(false)
const chatAreaRef = ref(null)
let chatPoller = null
let lastChatId = ''
let tcPlayerInstance = null

const gifts = [
  { name: '鲜花', icon: '🌹', price: 5 },
  { name: '掌声', icon: '👏', price: 10 },
  { name: '加油', icon: '💪', price: 15 },
  { name: '火箭', icon: '🚀', price: 50 },
  { name: '皇冠', icon: '👑', price: 100 },
  { name: '学霸之魂', icon: '📚', price: 200 },
]

// 是否有播放地址
const hasPlayer = computed(() => {
  return room.value?.play_url || room.value?.record_file_url
})

// 占位文字
const placeholderText = computed(() => {
  if (!room.value) return '加载中...'
  if (room.value.status === 'live') return '直播进行中'
  if (room.value.status === 'waiting') return '直播尚未开始'
  if (room.value.status === 'ended') return '直播已结束，暂无回放'
  return '暂无直播'
})

// 是否可以结束直播
const canStop = computed(() => {
  if (!room.value) return false
  const uid = userStore.userInfo?.user_id
  return room.value.host_id === uid || userStore.userInfo?.role === 'admin'
})

onMounted(async () => {
  await loadRoom()
})

onUnmounted(() => {
  stopChatPolling()
  destroyPlayer()
})

// 加载直播间详情
async function loadRoom() {
  loadingRoom.value = true
  try {
    const roomId = route.params.roomId
    const res = await request.get('/live/detail', { params: { room_id: roomId } })
    room.value = res.data

    // 进入直播间（增加观看人数）
    try { await request.post('/live/enter', { room_id: roomId }) } catch {}

    // 加载弹幕
    await loadChat()

    // 启动弹幕轮询
    startChatPolling()

    // 等待 DOM 更新后初始化播放器
    await nextTick()
    initPlayerIfReady()
  } catch {
    // 后端未部署时显示占位
    room.value = { title: '直播间', status: 'waiting', view_count: 0, like_count: 0 }
  } finally {
    loadingRoom.value = false
  }
}

// TCPlayer 初始化
function initPlayerIfReady() {
  const playUrl = room.value?.play_url || room.value?.record_file_url
  if (!playUrl) return

  // 检查 TCPlayer SDK 是否已加载
  if (typeof window.TCPlayer === 'undefined') {
    console.warn('[TCPlayer] SDK not loaded, skip player init')
    return
  }

  try {
    destroyPlayer()
    tcPlayerInstance = window.TCPlayer('tcplayer-container', {
      fileID: '',
      appID: '',
      autoplay: true,
      live: room.value?.status === 'live',
      controls: true,
      sources: [{
        src: playUrl,
        type: playUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
      }],
    })
    console.log('[TCPlayer] initialized with:', playUrl)
  } catch (err) {
    console.error('[TCPlayer] init failed:', err)
  }
}

function destroyPlayer() {
  if (tcPlayerInstance) {
    try { tcPlayerInstance.dispose() } catch {}
    tcPlayerInstance = null
  }
}

// 弹幕相关
async function loadChat() {
  try {
    const params = { room_id: route.params.roomId, limit: 50 }
    if (lastChatId) params.since_id = lastChatId
    const res = await request.get('/live/chat/list', { params })
    const list = res.data?.list || []
    if (list.length > 0) {
      chatMessages.value.push(...list)
      lastChatId = list[list.length - 1].id || list[list.length - 1].chat_id
      await nextTick()
      scrollChatToBottom()
    }
  } catch {}
}

function startChatPolling() {
  chatPoller = setInterval(loadChat, 3000)
}

function stopChatPolling() {
  if (chatPoller) { clearInterval(chatPoller); chatPoller = null }
}

function scrollChatToBottom() {
  if (chatAreaRef.value) chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight
}

async function sendChat() {
  if (!chatInput.value.trim() || sendingChat.value) return
  sendingChat.value = true
  try {
    const res = await request.post('/live/chat/send', {
      room_id: route.params.roomId,
      content: chatInput.value.trim(),
    })
    chatMessages.value.push({
      id: res.data?.chat_id,
      content: chatInput.value.trim(),
      msg_type: 'text',
      nickname: userStore.nickname,
    })
    lastChatId = res.data?.chat_id || ''
    chatInput.value = ''
    await nextTick()
    scrollChatToBottom()
  } catch {
    showToast('发送失败')
  } finally { sendingChat.value = false }
}

async function doLike() {
  if (liked.value) return
  try {
    await request.post('/live/like', { room_id: route.params.roomId })
    liked.value = true
    if (room.value) room.value.like_count = (room.value.like_count || 0) + 1
    showToast('点赞成功')
  } catch {}
}

async function stopLive() {
  stopping.value = true
  try {
    await request.post('/live/stop', { room_id: route.params.roomId })
    showToast('直播已结束')
    if (room.value) room.value.status = 'ended'
  } catch { showToast('操作失败') }
  finally { stopping.value = false }
}

async function sendGift() {
  if (!selectedGift.value) return
  sendingGift.value = true
  try {
    const gift = selectedGift.value
    await request.post('/live/gift/send', {
      room_id: route.params.roomId,
      gift_type: gift.name,
      gift_name: gift.name,
      coin_amount: gift.price,
    })
    showToast('赠送成功')
    showGiftPanel.value = false
    selectedGift.value = null
  } catch (err) { showToast(err.message || '赠送失败') }
  finally { sendingGift.value = false }
}

function onShare() { showToast('分享功能开发中') }
</script>

<style scoped>
.live-room { min-height: 100vh; background: #000; display: flex; flex-direction: column; }
.video-area { background: #111; min-height: 200px; }
.tcplayer-box { width: 100%; aspect-ratio: 16/9; }
.video-placeholder {
  width: 100%; min-height: 200px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: #fff;
}
.placeholder-icon { font-size: 48px; margin-bottom: 8px; }
.placeholder-text { font-size: 14px; color: #ccc; }

.room-info { padding: 12px 16px; background: #1a1a1a; }
.room-title { font-size: 16px; font-weight: 500; color: #fff; margin-bottom: 8px; }
.room-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #ccc; }
.host-name { color: #fff; font-weight: 500; }
.stat { display: flex; align-items: center; gap: 2px; }

.chat-area { flex: 1; overflow-y: auto; padding: 12px 16px; background: #111; min-height: 150px; max-height: 280px; }
.chat-msg { margin-bottom: 6px; font-size: 13px; line-height: 1.4; }
.chat-nickname { color: #4A90D9; font-weight: 500; }
.chat-nickname.gift { color: #ff6b6b; }
.chat-content { color: #eee; }
.chat-content.gift { color: #ff6b6b; }
.chat-gift { background: rgba(255,107,107,0.1); border-radius: 4px; padding: 4px 8px; }
.chat-empty { color: #666; text-align: center; font-size: 13px; padding: 40px 0; }

.action-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #1a1a1a; }
.chat-input { flex: 1; }
.action-icons { display: flex; gap: 16px; }

.gift-panel { padding: 16px; }
.gift-title { font-size: 16px; font-weight: 500; margin-bottom: 12px; text-align: center; }
.gift-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.gift-item { text-align: center; padding: 12px 8px; border-radius: 8px; background: #f7f8fa; cursor: pointer; }
.gift-item.gift-selected { background: #e8f4fd; border: 2px solid #1989fa; }
.gift-icon { font-size: 32px; margin-bottom: 4px; }
.gift-name { font-size: 12px; color: #333; }
.gift-price { font-size: 11px; color: #999; }
</style>
