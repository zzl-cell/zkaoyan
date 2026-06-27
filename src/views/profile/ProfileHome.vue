<template>
  <div class="profile-home">
    <van-nav-bar title="我的">
      <template #right><van-icon name="setting-o" size="20" @click="router.push('/profile/settings')" /></template>
    </van-nav-bar>

    <!-- User card -->
    <div class="user-card" style="padding: 16px; display: flex; align-items: center; gap: 12px;" @click="router.push('/profile/edit')">
      <van-image round width="56" height="56" :src="userStore.avatar || ''" />
      <div style="flex: 1;">
        <div style="font-size: 16px; font-weight: bold;">{{ userStore.nickname || '未设置昵称' }}</div>
        <div style="font-size: 12px; color: #999;">{{ userStore.userInfo?.bio || '这个人很懒，什么都没写' }}</div>
      </div>
      <van-icon name="arrow" color="#999" />
    </div>

    <!-- Stats -->
    <van-grid :column-num="5">
      <van-grid-item :label="'刷题数'" :value="String(userStore.userInfo?.total_questions || 0)" />
      <van-grid-item :label="'正确率'" :value="(userStore.userInfo?.accuracy || 0) + '%'" />
      <van-grid-item :label="'关注'" :value="String(userStore.userInfo?.following_count || 0)" @click="router.push('/profile/following')" />
      <van-grid-item :label="'粉丝'" :value="String(userStore.userInfo?.followers_count || 0)" @click="router.push('/profile/followers')" />
      <van-grid-item :label="'获赞'" :value="String(userStore.userInfo?.like_count || 0)" />
    </van-grid>

    <!-- Sign-in banner -->
    <div class="sign-banner" @click="onSignClick">
      <div class="sign-banner-left">
        <van-icon v-if="coinStore.signedToday" name="passed" color="#07c160" size="20" />
        <van-icon v-else name="clock-o" color="#ff6034" size="20" />
        <span v-if="coinStore.signedToday">今日已签到 · 连续{{ coinStore.streakDays }}天</span>
        <span v-else>签到领币 · 已连续{{ coinStore.streakDays }}天</span>
      </div>
      <van-button
        v-if="!coinStore.signedToday"
        type="primary"
        size="mini"
        round
        :loading="signLoading"
        @click.stop="onSign"
      >
        签到
      </van-button>
      <van-icon v-else name="arrow" color="#999" />
    </div>

    <!-- Menu -->
    <van-cell-group>
      <van-cell title="收藏动态" is-link @click="router.push('/profile/favorites-posts')">
        <template #icon><van-icon name="star-o" color="#ff6b6b" style="margin-right: 8px;" /></template>
      </van-cell>
      <van-cell title="虚拟币" is-link :value="String(userStore.coinBalance)" @click="router.push('/profile/coin')">
        <template #icon><van-icon name="gold-coin-o" color="#ffc107" style="margin-right: 8px;" /></template>
      </van-cell>
      <van-cell title="已购资料" is-link @click="router.push('/shop/library')">
        <template #icon><van-icon name="bag-o" color="#07c160" style="margin-right: 8px;" /></template>
      </van-cell>
      <van-cell title="消息" is-link @click="router.push('/profile/messages')">
        <template #icon><van-icon name="bell" color="#ff9500" style="margin-right: 8px;" /></template>
        <template #right-icon>
          <van-badge v-if="hasUnread" dot>
            <van-icon name="arrow" />
          </van-badge>
          <van-icon v-else name="arrow" />
        </template>
      </van-cell>
      <van-cell title="勋章墙" is-link @click="router.push('/profile/badges')">
        <template #icon><van-icon name="medal-o" color="#9c27b0" style="margin-right: 8px;" /></template>
      </van-cell>
      <van-cell title="纠错排行榜" is-link @click="router.push('/profile/correction-rank')">
        <template #icon><van-icon name="bar-chart-o" color="#e91e63" style="margin-right: 8px;" /></template>
      </van-cell>
      <van-cell title="我的题库" is-link @click="router.push('/profile/questions')">
        <template #icon><van-icon name="description" color="#607d8b" style="margin-right: 8px;" /></template>
      </van-cell>
    </van-cell-group>

    <!-- Admin entry (admin only) -->
    <van-cell-group v-if="isAdmin" style="margin-top: 12px;">
      <van-cell title="后台管理" is-link @click="router.push('/admin')" icon="manager-o" value="管理员" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../../stores/user'
import { useNotificationStore } from '../../stores/notification'
import { useCoinStore } from '../../stores/coin'

const router = useRouter()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const coinStore = useCoinStore()

const signLoading = ref(false)
const hasUnread = computed(() => notificationStore.hasUnread)
const isAdmin = computed(() => userStore.userInfo?.role === 'admin')

async function onSign() {
  signLoading.value = true
  try {
    const result = await coinStore.signIn()
    // Sync coin balance to user store
    if (userStore.userInfo) {
      userStore.userInfo.coin_balance = result.balance
    }
    showToast({ message: `签到成功 +${result.total_reward} 币`, type: 'success' })
  } catch (e) {
    // Error handled by request interceptor
  } finally {
    signLoading.value = false
  }
}

function onSignClick() {
  router.push('/profile/coin')
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    try { await userStore.fetchProfile() } catch {}
    try { await notificationStore.fetchUnread() } catch {}
    try { await coinStore.fetchSignStatus() } catch {}
  }
})
</script>

<style scoped>
.sign-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff8e1, #fff3cd);
  border-radius: 8px;
  cursor: pointer;
}
.sign-banner-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}
</style>
