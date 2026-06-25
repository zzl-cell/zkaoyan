<template>
  <div class="settings">
    <van-nav-bar title="设置" left-arrow @click-left="router.back()" />

    <!-- Account security -->
    <van-cell-group title="账号安全">
      <van-cell title="修改密码" is-link @click="router.push('/profile/settings/password')" />
      <van-cell title="换绑手机" is-link @click="router.push('/profile/settings/change-phone')" />
      <van-cell title="登录设备管理" is-link @click="showToast('功能开发中')" />
    </van-cell-group>

    <!-- Mock exam -->
    <van-cell-group title="模拟考试">
      <van-cell title="默认时长" is-link :value="defaultDurationLabel" @click="showDuration = true" />
    </van-cell-group>

    <!-- Privacy -->
    <van-cell-group title="隐私">
      <van-cell title="隐私设置" is-link @click="router.push('/profile/settings/privacy')" />
    </van-cell-group>

    <!-- Help & feedback -->
    <van-cell-group title="帮助与反馈">
      <van-cell title="意见反馈" is-link @click="router.push('/profile/settings/feedback')" />
      <van-cell title="用户协议" is-link @click="router.push('/profile/settings/agreement')" />
      <van-cell title="隐私策略" is-link @click="router.push('/profile/settings/privacy-policy')" />
    </van-cell-group>

    <!-- About -->
    <van-cell-group title="关于">
      <van-cell title="关于我们" is-link @click="router.push('/profile/settings/about')" />
      <van-cell title="版本更新" is-link :value="localVersion" @click="checkUpdate" />
    </van-cell-group>

    <!-- Cache & notifications -->
    <van-cell-group title="其他">
      <van-cell title="清除缓存" is-link :value="cacheSize" @click="clearCache" />
      <van-cell title="通知设置" value="即将上线，敬请期待" />
    </van-cell-group>

    <!-- Logout -->
    <div style="padding: 16px;">
      <van-button block type="danger" @click="onLogout">退出登录</van-button>
    </div>

    <!-- Duration picker -->
    <van-action-sheet v-model:show="showDuration" title="选择默认考试时长">
      <van-picker :columns="durationOptions" @confirm="onDurationConfirm" @cancel="showDuration = false" />
    </van-action-sheet>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { showToast, showConfirmDialog } from 'vant'
import { updateProfile } from '../../api/user'

const router = useRouter()
const userStore = useUserStore()

const showDuration = ref(false)
const defaultDuration = ref(60)
const localVersion = ref('v1.0.0')
const cacheSize = ref('0 KB')

const durationOptions = [
  { text: '15分钟', value: 15 },
  { text: '30分钟', value: 30 },
  { text: '45分钟', value: 45 },
  { text: '60分钟', value: 60 },
  { text: '75分钟', value: 75 },
  { text: '120分钟', value: 120 },
]

const defaultDurationLabel = computed(() => {
  const opt = durationOptions.find((o) => o.value === defaultDuration.value)
  return opt ? opt.text : '60分钟'
})

onMounted(async () => {
  if (userStore.userInfo?.default_exam_duration) {
    defaultDuration.value = userStore.userInfo.default_exam_duration
  }
  // Cache size
  try {
    const keys = Object.keys(localStorage)
    const total = keys.reduce((sum, key) => sum + (localStorage.getItem(key)?.length || 0), 0)
    cacheSize.value = (total / 1024).toFixed(1) + ' KB'
  } catch {}
  // Load local version from package.json (injected at build) or fallback
  try {
    const res = await fetch('/version.json')
    const data = await res.json()
    localVersion.value = 'v' + (data.version || '1.0.0')
  } catch {
    localVersion.value = 'v1.0.0'
  }
})

async function onDurationConfirm({ selectedOptions }) {
  const value = selectedOptions[0]?.value || 60
  defaultDuration.value = value
  showDuration.value = false
  try {
    await updateProfile({ default_exam_duration: value })
    showToast('默认时长已更新')
  } catch {
    showToast('更新失败')
  }
}

async function checkUpdate() {
  try {
    const res = await fetch('/version.json?t=' + Date.now())
    const data = await res.json()
    const remoteVersion = data.version || '1.0.0'
    const local = localVersion.value.replace('v', '')

    if (remoteVersion === local) {
      showToast({ message: '已是最新版本', type: 'success' })
    } else {
      await showConfirmDialog({
        title: '发现新版本',
        message: `新版本 v${remoteVersion} 已发布，是否更新？`,
      })
      // PWA: just reload, service worker will fetch new assets
      if (data.download_url) {
        window.open(data.download_url, '_blank')
      } else {
        window.location.reload()
      }
    }
  } catch {
    showToast('版本检测失败，请稍后重试')
  }
}

function clearCache() {
  showConfirmDialog({ title: '确认清除缓存？' }).then(() => {
    const token = localStorage.getItem('zky_token')
    localStorage.clear()
    if (token) localStorage.setItem('zky_token', token)
    cacheSize.value = '0 KB'
    showToast('缓存已清除')
  }).catch(() => {})
}

async function onLogout() {
  try {
    await showConfirmDialog({ title: '确认退出登录？' })
    userStore.logout()
    router.replace('/login')
  } catch {}
}
</script>
