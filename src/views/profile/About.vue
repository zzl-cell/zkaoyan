<template>
  <div class="about-page">
    <van-nav-bar title="关于我们" left-arrow @click-left="router.back()" />
    <div class="content">
      <div class="logo-section">
        <div class="logo-text">Z考研</div>
        <div class="subtitle">你的专属大学生备考社区</div>
      </div>
      <div class="info-section">
        <p class="placeholder">关于Z考研的内容编辑中，敬请期待...</p>
      </div>
      <div class="version-section">
        <span>当前版本：{{ version }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const version = ref('v1.0.0')

onMounted(async () => {
  try {
    const res = await fetch('/version.json')
    const data = await res.json()
    version.value = 'v' + (data.version || '1.0.0')
  } catch {}
})
</script>

<style scoped>
.about-page { min-height: 100vh; background: #fff; }
.content { padding: 16px; }
.logo-section { text-align: center; padding: 40px 0; }
.logo-text { font-size: 32px; font-weight: bold; color: #1989fa; }
.subtitle { font-size: 14px; color: #999; margin-top: 8px; }
.info-section { padding: 16px 0; }
.placeholder { font-size: 14px; color: #999; text-align: center; padding: 20px 0; }
.version-section { text-align: center; padding: 40px 0; font-size: 13px; color: #999; }
</style>
