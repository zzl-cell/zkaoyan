<template>
  <div class="tabbar-layout">
    <div class="tabbar-content">
      <router-view />
    </div>
    <van-tabbar v-model="activeTab" route @change="onTabChange">
      <van-tabbar-item to="/recommend" icon="home-o">推荐</van-tabbar-item>
      <van-tabbar-item to="/practice" icon="edit">练习</van-tabbar-item>
      <van-tabbar-item to="/shop" icon="shop-o">资料</van-tabbar-item>
      <van-tabbar-item to="/profile" icon="user-o" :badge="unreadBadge">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNotificationStore } from '../../stores/notification'

const route = useRoute()
const notificationStore = useNotificationStore()

const tabMap = {
  '/recommend': 0,
  '/practice': 1,
  '/shop': 2,
  '/profile': 3,
}

const activeTab = ref(0)

const unreadBadge = computed(() => {
  return notificationStore.hasUnread ? '' : undefined
})

function onTabChange() {}

function updateTab() {
  const path = route.path
  for (const [prefix, index] of Object.entries(tabMap)) {
    if (path.startsWith(prefix)) {
      activeTab.value = index
      break
    }
  }
}

watch(() => route.path, updateTab)
onMounted(() => {
  updateTab()
  notificationStore.fetchUnread()
})
</script>

<style scoped>
.tabbar-layout { min-height: 100vh; display: flex; flex-direction: column; }
.tabbar-content { flex: 1; overflow-y: auto; padding-bottom: 50px; }
</style>
