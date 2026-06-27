<template>
  <div class="admin-feedbacks">
    <van-nav-bar title="工单管理" left-arrow @click-left="router.back()" />

    <van-tabs v-model:active="statusFilter" @change="reload">
      <van-tab title="待处理" name="pending" />
      <van-tab title="已回复" name="replied" />
      <van-tab title="已关闭" name="closed" />
      <van-tab title="全部" name="" />
    </van-tabs>

    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadFeedbacks">
      <van-cell v-for="f in feedbacks" :key="f.feedback_id" @click="showDetail(f)">
        <template #title>
          <div style="display:flex;align-items:center;gap:8px;">
            <span>{{ f.title || '工单' }}</span>
            <van-tag :type="statusTagType(f.status)">{{ statusLabel(f.status) }}</van-tag>
          </div>
        </template>
        <template #label>
          <div>
            <div>用户: {{ f.user_nickname || f.user_phone || f.user_id?.slice(0, 8) }}</div>
            <div style="color:#666;margin-top:4px;">{{ (f.content || '').substring(0, 60) }}{{ f.content?.length > 60 ? '...' : '' }}</div>
            <div style="color:#999;font-size:11px;margin-top:4px;">{{ (f.created_at || '').slice(0, 19) }}</div>
          </div>
        </template>
      </van-cell>
    </van-list>

    <!-- Detail & Reply dialog -->
    <van-popup v-model:show="detailVisible" position="bottom" round :style="{ maxHeight: '80vh' }">
      <div class="feedback-detail" v-if="currentFeedback">
        <div class="detail-header">
          <h3>{{ currentFeedback.title || '工单' }}</h3>
          <van-tag :type="statusTagType(currentFeedback.status)">{{ statusLabel(currentFeedback.status) }}</van-tag>
        </div>

        <van-cell-group>
          <van-cell title="提交用户" :value="currentFeedback.user_nickname || currentFeedback.user_phone || currentFeedback.user_id" />
          <van-cell title="提交时间" :value="(currentFeedback.created_at || '').slice(0, 19)" />
          <van-cell title="工单类型" :value="currentFeedback.type || 'bug'" />
          <van-cell title="联系方式" :value="currentFeedback.contact || '未提供'" />
          <van-cell title="已奖励虚拟币" :value="currentFeedback.reward_coins || 0" />
        </van-cell-group>

        <div class="detail-content">
          <div class="content-label">反馈内容：</div>
          <div class="content-text">{{ currentFeedback.content }}</div>
        </div>

        <!-- Replies -->
        <div v-if="parsedReplies.length > 0" class="replies-section">
          <div class="content-label">回复记录：</div>
          <div v-for="(r, i) in parsedReplies" :key="i" class="reply-item">
            <div class="reply-content">{{ r.content }}</div>
            <div class="reply-time">{{ (r.created_at || '').slice(0, 19) }}</div>
          </div>
        </div>

        <!-- Actions -->
        <div class="detail-actions" v-if="currentFeedback.status !== 'closed'">
          <van-field v-model="replyText" type="textarea" placeholder="输入回复内容" rows="3" />
          <div style="display:flex;gap:8px;margin-top:12px;">
            <van-button type="primary" block @click="onReply">回复</van-button>
            <van-button block @click="onClose">关闭工单</van-button>
          </div>
        </div>

        <!-- Reward (for closed feedback) -->
        <div v-if="currentFeedback.status === 'closed'" class="detail-actions">
          <div style="display:flex;gap:8px;align-items:center;">
            <van-field v-model="rewardAmount" type="number" placeholder="奖励虚拟币数量" style="flex:1;" />
            <van-button type="success" @click="onReward">发放奖励</van-button>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '../../api/request'

const router = useRouter()
const statusFilter = ref('pending')
const feedbacks = ref([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const detailVisible = ref(false)
const currentFeedback = ref(null)
const replyText = ref('')
const rewardAmount = ref('')

const parsedReplies = computed(() => {
  if (!currentFeedback.value?.replies) return []
  try {
    const r = currentFeedback.value.replies
    return typeof r === 'string' ? JSON.parse(r) : r
  } catch { return [] }
})

function statusTagType(status) {
  if (status === 'pending') return 'warning'
  if (status === 'replied') return 'primary'
  return 'default'
}

function statusLabel(status) {
  if (status === 'pending') return '待处理'
  if (status === 'replied') return '已回复'
  if (status === 'closed') return '已关闭'
  return status
}

function reload() {
  page.value = 1
  finished.value = false
  feedbacks.value = []
  loadFeedbacks()
}

async function loadFeedbacks() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: 20 }
    if (statusFilter.value) params.status = statusFilter.value
    const res = await request.get('/admin/feedbacks', { params })
    const list = res.data.list || []
    if (page.value === 1) feedbacks.value = list
    else feedbacks.value.push(...list)
    if (list.length < 20) finished.value = true
    page.value++
  } catch {} finally { loading.value = false }
}

async function showDetail(f) {
  try {
    const res = await request.get('/admin/feedback_detail', { params: { id: f.feedback_id } })
    currentFeedback.value = res.data
    replyText.value = ''
    rewardAmount.value = ''
    detailVisible.value = true
  } catch {}
}

async function onReply() {
  if (!replyText.value) return showToast('请输入回复内容')
  try {
    await request.post('/admin/feedback_reply', {
      feedback_id: currentFeedback.value.feedback_id,
      content: replyText.value,
    })
    showToast('回复成功')
    detailVisible.value = false
    reload()
  } catch {}
}

async function onClose() {
  try {
    await request.post('/admin/feedback_close', {
      feedback_id: currentFeedback.value.feedback_id,
    })
    showToast('已关闭')
    detailVisible.value = false
    reload()
  } catch {}
}

async function onReward() {
  if (!rewardAmount.value || Number(rewardAmount.value) <= 0) return showToast('请输入有效数量')
  try {
    await request.post('/admin/feedback_reward', {
      feedback_id: currentFeedback.value.feedback_id,
      amount: Number(rewardAmount.value),
    })
    showToast('发放成功')
    detailVisible.value = false
    reload()
  } catch {}
}
</script>

<style scoped>
.feedback-detail { padding: 16px; }
.detail-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.detail-header h3 { margin: 0; font-size: 16px; flex: 1; }
.detail-content { padding: 12px 0; }
.content-label { font-size: 13px; color: #999; margin-bottom: 8px; }
.content-text { font-size: 14px; line-height: 1.6; color: #333; white-space: pre-wrap; }
.replies-section { margin-top: 12px; }
.reply-item { background: #f7f8fa; border-radius: 8px; padding: 10px; margin-bottom: 8px; }
.reply-content { font-size: 13px; line-height: 1.5; }
.reply-time { font-size: 11px; color: #999; margin-top: 4px; }
.detail-actions { margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px; }
</style>
