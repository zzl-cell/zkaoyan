<template>
  <div class="asset-view" ref="containerRef">
    <van-nav-bar :title="asset.name || '资料查看'" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 60px 0;" />

    <template v-else-if="asset.name">
      <!-- Watermark info -->
      <van-notice-bar left-icon="info-o" :text="`水印：${watermarkText || '加载中...'}`" />

      <!-- Content area -->
      <div class="content-area">
        <van-cell-group inset style="margin-top: 12px;">
          <van-cell title="资料名称" :value="asset.name" />
          <van-cell title="分类" :value="asset.category || '-'" />
          <van-cell v-if="asset.is_question_bank" title="题目数量" :value="`${asset.question_count || 0} 道`" />
          <van-cell v-if="viewUrlData" title="链接有效期" :value="formatExpire(viewUrlData.expire_at)" />
        </van-cell-group>

        <div style="padding: 16px;">
          <van-button block type="primary" :loading="urlLoading" @click="onOpenView">
            <van-icon name="eye-o" style="margin-right: 4px;" /> 查看资料
          </van-button>
          <van-button v-if="viewUrlData?.file_url" block plain type="primary" style="margin-top: 8px;" @click="onDownload">
            <van-icon name="down" style="margin-right: 4px;" /> 下载文件
          </van-button>
        </div>
      </div>

      <!-- Action bar -->
      <van-action-bar>
        <van-action-bar-button text="纠错" @click="router.push(`/shop/correction/${assetId}`)" />
      </van-action-bar>
    </template>

    <van-empty v-else description="未找到该资料" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useShopStore } from '../../stores/shop'
import { injectWatermark, removeWatermark, generateWatermarkText } from '../../utils/watermark'
import { getViewUrl } from '../../api/shop'
import request from '../../api/request'

const router = useRouter()
const route = useRoute()
const shopStore = useShopStore()

const assetId = ref(route.params.assetId)
const asset = ref({})
const loading = ref(true)
const watermarkText = ref('')
const containerRef = ref(null)
const viewUrlData = ref(null)
const urlLoading = ref(false)

function formatExpire(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const now = new Date()
  const diffMs = d - now
  if (diffMs <= 0) return '已过期'
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin} 分钟后过期`
  return `${Math.floor(diffMin / 60)} 小时后过期`
}

async function loadViewUrl() {
  urlLoading.value = true
  try {
    const res = await getViewUrl(assetId.value)
    viewUrlData.value = res.data
  } catch {} finally {
    urlLoading.value = false
  }
}

function onOpenView() {
  if (viewUrlData.value?.view_url) {
    window.open(viewUrlData.value.view_url, '_blank')
  } else {
    loadViewUrl()
  }
}

function onDownload() {
  if (viewUrlData.value?.file_url) {
    window.open(viewUrlData.value.file_url, '_blank')
  } else {
    showToast('下载功能需接入文件存储服务')
  }
}

onMounted(async () => {
  try {
    asset.value = await shopStore.fetchLibraryItem(assetId.value)
  } catch {}
  loading.value = false

  // Load watermark info
  try {
    const res = await request.get('/shop/watermark')
    watermarkText.value = res.data.text
    if (containerRef.value) {
      injectWatermark(containerRef.value, generateWatermarkText(res.data.text))
    }
  } catch {}

  // Load signed view URL
  await loadViewUrl()
})

onUnmounted(() => { removeWatermark() })
</script>

<style scoped>
.asset-view { min-height: 100vh; background: #f7f8fa; }
.content-area { padding-bottom: 60px; }
</style>
