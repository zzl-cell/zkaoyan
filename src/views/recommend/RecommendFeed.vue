<template>
  <div class="recommend-feed">
    <van-nav-bar title="推荐">
      <template #right>
        <van-icon name="search" size="20" @click="router.push('/recommend/search')" />
      </template>
    </van-nav-bar>

    <van-tabs v-model:active="activeTab">
      <van-tab title="推荐">
        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <div class="feed-list">
            <div class="announcement-card" @click="router.push('/recommend/notice')">
              <van-icon name="volume-o" size="20" color="#4A90D9" />
              <span class="announcement-text">欢迎来到Z考研，更多精彩内容即将上线...</span>
              <van-icon name="arrow" size="16" color="#4A90D9" />
            </div>

            <div class="create-post-entry" @click="router.push('/recommend/post/create')">
              <van-image round width="36" height="36" :src="userStore.avatar || ''" />
              <span class="placeholder-text">分享你的备考心得...</span>
              <span class="publish-btn">发布</span>
            </div>

            <div
              v-for="post in feedStore.recommendList"
              :key="post.post_id"
              class="feed-card"
              @click="router.push(`/recommend/post/${post.post_id}`)"
            >
              <div class="feed-header">
                <van-image round width="36" height="36" :src="post.user?.avatar || ''" />
                <div class="user-info">
                  <span class="nickname">{{ post.user?.nickname || '匿名用户' }}</span>
                  <span class="time">{{ formatTime(post.created_at) }}</span>
                </div>
                <van-tag v-if="post.topic_tags?.length" size="small" plain type="primary" style="margin-left: auto;">
                  {{ post.topic_tags[0] }}
                </van-tag>
              </div>
              <div class="feed-content">{{ post.content }}</div>
              <div class="feed-actions">
                <span class="action-item" :class="{ active: post.is_liked }" @click.stop="toggleLike(post)">
                  <van-icon :name="post.is_liked ? 'good-job' : 'good-job-o'" /> {{ post.like_count || 0 }}
                </span>
                <span class="action-item" @click.stop="toggleComment(post)">
                  <van-icon name="chat-o" /> {{ post.comment_count || 0 }}
                </span>
                <span class="action-item" :class="{ active: post.is_favorited }" @click.stop="toggleFavorite(post)">
                  <van-icon :name="post.is_favorited ? 'star' : 'star-o'" />
                </span>
              </div>
              <!-- Inline comment input -->
              <div v-if="commentTarget === post.post_id" class="inline-comment" @click.stop>
                <van-field v-model="commentText" placeholder="写评论..." size="small" @keydown.enter="submitInlineComment(post)">
                  <template #button>
                    <van-button size="small" type="primary" @click.stop="submitInlineComment(post)">发送</van-button>
                  </template>
                </van-field>
              </div>
            </div>

            <van-empty v-if="!loading && feedStore.recommendList.length === 0" description="暂无动态" />
            <van-loading v-if="loading" style="text-align: center; padding: 16px;" />
            <div v-else-if="feedStore.hasMoreRecommend && feedStore.recommendList.length > 0" class="load-more" @click="loadMore">加载更多</div>
            <div v-else-if="feedStore.recommendList.length > 0" class="load-more">没有更多了</div>
          </div>
        </van-pull-refresh>
      </van-tab>

      <van-tab title="关注">
        <van-pull-refresh v-model="refreshingFollowing" @refresh="onRefreshFollowing">
          <div class="feed-list">
            <div
              v-for="post in feedStore.followingList"
              :key="post.post_id"
              class="feed-card"
              @click="router.push(`/recommend/post/${post.post_id}`)"
            >
              <div class="feed-header">
                <van-image round width="36" height="36" :src="post.user?.avatar || ''" />
                <div class="user-info">
                  <span class="nickname">{{ post.user?.nickname || '匿名用户' }}</span>
                  <span class="time">{{ formatTime(post.created_at) }}</span>
                </div>
              </div>
              <div class="feed-content">{{ post.content }}</div>
              <div class="feed-actions">
                <span class="action-item" :class="{ active: post.is_liked }" @click.stop="toggleLike(post)">
                  <van-icon :name="post.is_liked ? 'good-job' : 'good-job-o'" /> {{ post.like_count || 0 }}
                </span>
                <span class="action-item" @click.stop="toggleComment(post)">
                  <van-icon name="chat-o" /> {{ post.comment_count || 0 }}
                </span>
                <span class="action-item" :class="{ active: post.is_favorited }" @click.stop="toggleFavorite(post)">
                  <van-icon :name="post.is_favorited ? 'star' : 'star-o'" />
                </span>
              </div>
              <div v-if="commentTarget === post.post_id" class="inline-comment" @click.stop>
                <van-field v-model="commentText" placeholder="写评论..." size="small" @keydown.enter="submitInlineComment(post)">
                  <template #button>
                    <van-button size="small" type="primary" @click.stop="submitInlineComment(post)">发送</van-button>
                  </template>
                </van-field>
              </div>
            </div>
            <van-empty v-if="!loadingFollowing && feedStore.followingList.length === 0" description="暂无关注动态" />
          </div>
        </van-pull-refresh>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../../stores/user'
import { useFeedStore } from '../../stores/feed'
import request from '../../api/request'

const router = useRouter()
const userStore = useUserStore()
const feedStore = useFeedStore()
const activeTab = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const loadingFollowing = ref(false)
const refreshingFollowing = ref(false)
const commentTarget = ref(null)
const commentText = ref('')

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
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function loadRecommend(reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    const page = reset ? 1 : feedStore.recommendPage
    const res = await request.get('/feed/recommend', { params: { page, page_size: 10 } })
    const list = res.data?.list || []
    if (reset) {
      feedStore.recommendList = list
      feedStore.recommendPage = 2
    } else {
      feedStore.recommendList.push(...list)
      feedStore.recommendPage++
    }
    feedStore.hasMoreRecommend = list.length >= 10
  } catch {} finally {
    loading.value = false
    refreshing.value = false
  }
}

async function loadFollowing() {
  if (loadingFollowing.value) return
  loadingFollowing.value = true
  try {
    const res = await request.get('/feed/following', { params: { page: 1, page_size: 20 } })
    feedStore.followingList = res.data?.list || []
  } catch {} finally {
    loadingFollowing.value = false
    refreshingFollowing.value = false
  }
}

function onRefresh() { loadRecommend(true) }
function onRefreshFollowing() { loadFollowing() }
function loadMore() { loadRecommend(false) }

onMounted(() => {
  if (feedStore.recommendList.length === 0) loadRecommend(true)
})

async function toggleLike(post) {
  try {
    if (post.is_liked) {
      await request.delete('/feed/like', { data: { target_type: 'post', target_id: post.post_id } })
      post.is_liked = false
      post.like_count = Math.max(0, (post.like_count || 1) - 1)
    } else {
      await request.post('/feed/like', { target_type: 'post', target_id: post.post_id })
      post.is_liked = true
      post.like_count = (post.like_count || 0) + 1
    }
  } catch {}
}

async function toggleFavorite(post) {
  try {
    if (post.is_favorited) {
      await request.delete('/feed/favorite', { data: { target_id: post.post_id } })
      post.is_favorited = false
      showToast('已取消收藏')
    } else {
      await request.post('/feed/favorite', { target_id: post.post_id })
      post.is_favorited = true
      showToast('收藏成功')
    }
  } catch {}
}

function toggleComment(post) {
  if (commentTarget.value === post.post_id) {
    commentTarget.value = null
  } else {
    commentTarget.value = post.post_id
    commentText.value = ''
  }
}

async function submitInlineComment(post) {
  if (!commentText.value.trim()) return
  try {
    await request.post(`/feed/post/${post.post_id}/comment`, { content: commentText.value.trim() })
    post.comment_count = (post.comment_count || 0) + 1
    commentText.value = ''
    commentTarget.value = null
    showToast('评论成功')
  } catch (err) {
    showToast(err.message || '评论失败')
  }
}
</script>

<style scoped>
.recommend-feed { min-height: 100vh; background: #f7f8fa; }
.feed-list { padding-bottom: 16px; }
.announcement-card {
  display: flex; align-items: center; gap: 10px;
  margin: 12px 16px; padding: 12px 16px;
  background: #E8F4FD; border-left: 4px solid #4A90D9; border-radius: 12px; cursor: pointer;
}
.announcement-text { flex: 1; font-size: 14px; color: #333; }
.create-post-entry {
  display: flex; align-items: center; gap: 10px;
  margin: 0 16px 12px; padding: 12px 16px;
  background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); cursor: pointer;
}
.placeholder-text { flex: 1; font-size: 14px; color: #999; }
.publish-btn { font-size: 14px; color: #4A90D9; font-weight: 500; }
.feed-card {
  margin: 0 16px 12px; padding: 12px 16px;
  background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); cursor: pointer;
}
.feed-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.user-info { display: flex; flex-direction: column; }
.nickname { font-size: 14px; font-weight: 500; color: #333; }
.time { font-size: 12px; color: #999; }
.feed-content { font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 10px; }
.feed-actions { display: flex; justify-content: space-around; padding-top: 10px; border-top: 1px solid #f5f5f5; }
.action-item { font-size: 13px; color: #999; display: flex; align-items: center; gap: 4px; }
.action-item.active { color: #1989fa; }
.load-more { text-align: center; padding: 16px; font-size: 13px; color: #999; cursor: pointer; }
.inline-comment { margin-top: 8px; padding-top: 8px; border-top: 1px solid #f5f5f5; }
</style>
