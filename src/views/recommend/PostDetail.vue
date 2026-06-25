<template>
  <div class="post-detail">
    <van-nav-bar title="动态详情" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 60px 0;" />

    <template v-else-if="post">
      <!-- Post content -->
      <div class="post-card">
        <div class="post-header" @click="router.push(`/recommend/user/${post.user_id}`)">
          <van-image round width="40" height="40" :src="post.user?.avatar || ''" />
          <div class="user-info">
            <span class="nickname">{{ post.user?.nickname || '匿名用户' }}</span>
            <span class="time">{{ formatTime(post.created_at) }}</span>
          </div>
        </div>
        <div class="post-content">{{ post.content }}</div>
        <div v-if="post.topic_tags?.length" class="post-tags">
          <van-tag v-for="tag in post.topic_tags" :key="tag" size="small" plain type="primary">#{{ tag }}</van-tag>
        </div>
      </div>

      <!-- Comments -->
      <van-cell-group title="评论">
        <van-empty v-if="comments.length === 0" description="暂无评论" image-size="60" />
        <van-cell v-for="c in comments" :key="c.comment_id">
          <template #title>
            <div class="comment-item">
              <div class="comment-header">
                <van-image round width="24" height="24" :src="c.user?.avatar || ''" />
                <span class="comment-nickname">{{ c.user?.nickname || '匿名' }}</span>
                <span class="comment-time">{{ formatTime(c.created_at) }}</span>
              </div>
              <div class="comment-content">{{ c.content }}</div>
              <!-- Replies -->
              <div v-if="c.replies?.length" class="replies">
                <div v-for="r in c.replies" :key="r.comment_id" class="reply-item">
                  <span class="reply-nickname">{{ r.user?.nickname || '匿名' }}</span>
                  <span v-if="r.reply_to_user_id"> 回复 {{ getUserName(r.reply_to_user_id) }}</span>
                  <span>: {{ r.content }}</span>
                </div>
              </div>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- Spacer for action bar -->
      <div style="height: 60px;" />
    </template>

    <!-- Bottom action bar -->
    <van-action-bar>
      <van-action-bar-icon icon="chat-o" text="评论" @click="showCommentInput = true" />
      <van-action-bar-icon
        :icon="post?.is_liked ? 'good-job' : 'good-job-o'"
        :text="String(post?.like_count || 0)"
        :class="{ 'active-icon': post?.is_liked }"
        @click="toggleLike"
      />
      <van-action-bar-icon
        :icon="post?.is_favorited ? 'star' : 'star-o'"
        :text="post?.is_favorited ? '已收藏' : '收藏'"
        :class="{ 'active-icon': post?.is_favorited }"
        @click="toggleFavorite"
      />
      <van-action-bar-icon icon="share-o" text="分享" @click="onShare" />
    </van-action-bar>

    <!-- Comment input -->
    <van-popup v-model:show="showCommentInput" position="bottom" round>
      <div style="padding: 16px;">
        <van-field
          v-model="commentText"
          type="textarea"
          placeholder="写评论..."
          rows="3"
          maxlength="500"
          show-word-limit
          autofocus
        />
        <van-button block type="primary" size="small" style="margin-top: 8px;" :loading="commenting" @click="submitComment">
          发表评论
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import request from '../../api/request'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const post = ref(null)
const comments = ref([])
const showCommentInput = ref(false)
const commentText = ref('')
const commenting = ref(false)

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}小时前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getUserName(userId) {
  // Simple lookup from loaded comments
  for (const c of comments.value) {
    if (c.user?.user_id === userId) return c.user.nickname
    for (const r of (c.replies || [])) {
      if (r.user?.user_id === userId) return r.user.nickname
    }
  }
  return '用户'
}

async function loadPost() {
  try {
    const res = await request.get(`/feed/post/${route.params.id}`)
    post.value = res.data
  } catch {
    showToast('加载失败')
  }
}

async function loadComments() {
  try {
    const res = await request.get(`/feed/post/${route.params.id}/comments`)
    comments.value = res.data?.list || []
  } catch {}
}

async function toggleLike() {
  if (!post.value) return
  try {
    if (post.value.is_liked) {
      await request.delete('/feed/like', { data: { target_type: 'post', target_id: post.value.post_id } })
      post.value.is_liked = false
      post.value.like_count = Math.max(0, (post.value.like_count || 1) - 1)
    } else {
      await request.post('/feed/like', { target_type: 'post', target_id: post.value.post_id })
      post.value.is_liked = true
      post.value.like_count = (post.value.like_count || 0) + 1
    }
  } catch {}
}

async function toggleFavorite() {
  if (!post.value) return
  try {
    if (post.value.is_favorited) {
      await request.delete('/feed/favorite', { data: { target_id: post.value.post_id } })
      post.value.is_favorited = false
    } else {
      await request.post('/feed/favorite', { target_id: post.value.post_id })
      post.value.is_favorited = true
    }
  } catch {}
}

async function submitComment() {
  if (!commentText.value.trim()) { showToast('请输入评论'); return }
  commenting.value = true
  try {
    await request.post(`/feed/post/${route.params.id}/comment`, { content: commentText.value.trim() })
    commentText.value = ''
    showCommentInput.value = false
    showToast('评论成功')
    await loadComments()
    if (post.value) post.value.comment_count = (post.value.comment_count || 0) + 1
  } catch (err) {
    showToast(err.message || '评论失败')
  } finally {
    commenting.value = false
  }
}

function onShare() {
  showToast('分享功能开发中')
}

onMounted(async () => {
  await Promise.all([loadPost(), loadComments()])
  loading.value = false
})
</script>

<style scoped>
.post-detail { min-height: 100vh; background: #f7f8fa; }
.post-card { padding: 16px; background: #fff; margin-bottom: 8px; }
.post-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; cursor: pointer; }
.user-info { display: flex; flex-direction: column; }
.nickname { font-size: 14px; font-weight: 500; color: #333; }
.time { font-size: 12px; color: #999; }
.post-content { font-size: 15px; color: #333; line-height: 1.7; margin-bottom: 10px; }
.post-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.comment-item { padding: 4px 0; }
.comment-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.comment-nickname { font-size: 13px; font-weight: 500; color: #333; }
.comment-time { font-size: 11px; color: #c8c9cc; margin-left: auto; }
.comment-content { font-size: 14px; color: #333; line-height: 1.5; }
.replies { margin-top: 8px; padding: 8px; background: #f7f8fa; border-radius: 6px; }
.reply-item { font-size: 13px; color: #666; padding: 2px 0; }
.reply-nickname { color: #1989fa; }
.active-icon { color: #1989fa !important; }
</style>
