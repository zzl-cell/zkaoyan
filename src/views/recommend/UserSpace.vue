<template>
  <div class="user-space">
    <van-nav-bar :title="user.nickname || '用户'" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 60px 0;" />

    <template v-else>
      <!-- Profile card -->
      <div class="profile-card">
        <van-image round width="64" height="64" :src="user.avatar || ''" />
        <div class="nickname">{{ user.nickname || '匿名用户' }}</div>
        <div class="bio">{{ user.bio || '这个人很懒，什么都没写' }}</div>
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-num">{{ user.total_questions || 0 }}</div>
            <div class="stat-label">刷题</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">{{ user.accuracy || 0 }}%</div>
            <div class="stat-label">正确率</div>
          </div>
          <div class="stat-item" @click="router.push(`/profile/following?user_id=${userId}`)">
            <div class="stat-num">{{ user.following_count || 0 }}</div>
            <div class="stat-label">关注</div>
          </div>
          <div class="stat-item" @click="router.push(`/profile/followers?user_id=${userId}`)">
            <div class="stat-num">{{ user.followers_count || 0 }}</div>
            <div class="stat-label">粉丝</div>
          </div>
        </div>
        <van-button
          v-if="!isSelf"
          :type="isFollowing ? 'default' : 'primary'"
          size="small"
          round
          :loading="followLoading"
          @click="toggleFollow"
        >
          {{ isFollowing ? '已关注' : '关注' }}
        </van-button>
      </div>

      <!-- Tabs -->
      <van-tabs>
        <van-tab title="动态">
          <div v-if="userPosts.length === 0" style="padding: 40px 0;">
            <van-empty description="暂无动态" />
          </div>
          <div v-for="p in userPosts" :key="p.post_id" class="post-item" @click="router.push(`/recommend/post/${p.post_id}`)">
            <div class="post-content">{{ p.content }}</div>
            <div class="post-meta">
              <span>{{ formatTime(p.created_at) }}</span>
              <span>赞 {{ p.like_count || 0 }} · 评 {{ p.comment_count || 0 }}</span>
            </div>
          </div>
        </van-tab>
      </van-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import request from '../../api/request'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const userId = route.params.id
const loading = ref(true)
const user = ref({})
const isFollowing = ref(false)
const followLoading = ref(false)
const userPosts = ref([])

const isSelf = computed(() => userStore.token && user.value.user_id === userStore.userInfo?.user_id)

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function loadUser() {
  try {
    // Try to get user profile from feed post detail or user API
    const res = await request.get(`/user/profile/${userId}`)
    user.value = res.data || {}
  } catch {
    // Fallback: use basic info
    user.value = { user_id: userId, nickname: '用户' }
  }
}

async function checkFollow() {
  if (isSelf.value) return
  try {
    // Check by looking at following list
    const res = await request.get('/user/following/list', { params: { user_id: userStore.userInfo?.user_id } })
    const list = res.data?.list || []
    isFollowing.value = list.some(u => u.user_id === userId || u.following_id === userId)
  } catch {}
}

async function loadPosts() {
  try {
    const res = await request.get(`/feed/user/${userId}/posts`, { params: { page: 1, page_size: 20 } })
    userPosts.value = res.data?.list || []
  } catch {}
}

async function toggleFollow() {
  if (followLoading.value) return
  followLoading.value = true
  try {
    if (isFollowing.value) {
      await request.post('/user/unfollow', { user_id: userId })
      isFollowing.value = false
      user.value.followers_count = Math.max(0, (user.value.followers_count || 1) - 1)
      showToast('已取消关注')
    } else {
      await request.post('/user/follow', { user_id: userId })
      isFollowing.value = true
      user.value.followers_count = (user.value.followers_count || 0) + 1
      showToast('关注成功')
    }
  } catch (err) {
    showToast(err.message || '操作失败')
  } finally {
    followLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadUser(), checkFollow(), loadPosts()])
  loading.value = false
})
</script>

<style scoped>
.user-space { min-height: 100vh; background: #f7f8fa; }
.profile-card {
  display: flex; flex-direction: column; align-items: center;
  padding: 24px 16px 16px; background: #fff; margin-bottom: 8px;
}
.nickname { font-size: 18px; font-weight: 500; color: #333; margin-top: 10px; }
.bio { font-size: 13px; color: #999; margin-top: 4px; }
.stats-row {
  display: flex; gap: 32px; margin: 16px 0;
}
.stat-item { text-align: center; cursor: pointer; }
.stat-num { font-size: 18px; font-weight: bold; color: #333; }
.stat-label { font-size: 12px; color: #999; margin-top: 2px; }
.post-item {
  padding: 12px 16px; background: #fff; margin-bottom: 1px; cursor: pointer;
}
.post-content { font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.post-meta { display: flex; justify-content: space-between; font-size: 12px; color: #999; }
</style>
