<template>
  <div class="product-detail">
    <van-nav-bar title="资料详情" left-arrow @click-left="router.back()" />

    <van-loading v-if="!product" style="text-align: center; padding: 60px 0;" />

    <template v-else>
      <!-- Cover image -->
      <van-image v-if="product.cover_url" width="100%" :src="product.cover_url" />
      <div v-else class="cover-placeholder">
        <van-icon :name="product.is_question_bank ? 'edit' : 'description'" size="48" color="#ccc" />
      </div>

      <!-- Price & title -->
      <div class="price-bar">
        <span class="price-coin">{{ product.price }} 虚拟币</span>
        <span class="sales">已售 {{ product.sales_count }} 份</span>
      </div>

      <div class="title-bar">
        <div class="product-title">{{ product.name }}</div>
        <van-tag plain type="primary">{{ product.category }}</van-tag>
        <van-tag v-if="product.is_question_bank" plain type="warning">题库</van-tag>
      </div>

      <!-- Description -->
      <van-cell-group title="资料描述">
        <van-cell>
          <div class="description">{{ product.description }}</div>
        </van-cell>
      </van-cell-group>

      <!-- Question bank info -->
      <van-cell-group v-if="product.is_question_bank" title="题库信息">
        <van-cell title="题目数量" :value="`${product.question_count} 道`" />
        <van-cell title="题型" value="单选 / 多选 / 判断" />
      </van-cell-group>

      <!-- Question preview -->
      <van-cell-group v-if="product.is_question_bank" title="题库预览（前5题）">
        <van-loading v-if="previewLoading" size="24" style="text-align: center; padding: 16px;" />
        <template v-else-if="previewQuestions.length">
          <van-collapse v-model="expandedPreview">
            <van-collapse-item
              v-for="(q, idx) in previewQuestions"
              :key="q.question_id"
              :name="q.question_id"
              :title="`${idx + 1}. ${truncate(q.stem, 40)}`"
            >
              <template #label>
                <van-tag :type="q.question_type === 'single' ? 'primary' : q.question_type === 'multi' ? 'warning' : 'success'" size="small">
                  {{ typeLabel(q.question_type) }}
                </van-tag>
                <van-tag :type="q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'danger'" size="small" style="margin-left: 4px;">
                  {{ diffLabel(q.difficulty) }}
                </van-tag>
              </template>
              <div class="preview-stem">{{ q.stem }}</div>
              <div class="preview-options">
                <div v-for="opt in q.options" :key="opt.label" class="preview-option">
                  {{ opt.label }}. {{ opt.content }}
                </div>
              </div>
              <div class="preview-note">购买后可作答并查看解析</div>
            </van-collapse-item>
          </van-collapse>
        </template>
        <van-empty v-else description="暂无预览题目" image-size="60" />
      </van-cell-group>

      <!-- Payment info -->
      <van-cell-group title="支付信息">
        <van-cell title="支付方式">
          <template #value>
            <van-radio-group v-model="payMethod" direction="horizontal" style="justify-content: flex-end;">
              <van-radio name="coin">虚拟币</van-radio>
              <van-radio name="wechat">微信</van-radio>
            </van-radio-group>
          </template>
        </van-cell>
        <van-cell title="当前余额" :value="`${coinStore.balance} 虚拟币`" />
        <van-cell v-if="!product.is_purchased && payMethod === 'coin' && coinStore.balance < product.price" value-class="insufficient">
          <template #default>
            <span style="color: #ee0a24;">余额不足，还需 {{ product.price - coinStore.balance }} 虚拟币</span>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- Bottom spacer for action bar -->
      <div style="height: 70px;" />
    </template>

    <!-- Fixed bottom action bar -->
    <div class="fixed-action-bar">
      <template v-if="product?.is_purchased">
        <van-button
          v-if="product.is_question_bank"
          type="primary"
          block
          round
          @click="router.push(`/practice?product_id=${productId}`)"
        >
          开始刷题
        </van-button>
        <van-button
          v-else
          type="primary"
          block
          round
          @click="onViewLibrary"
        >
          查看资料
        </van-button>
      </template>
      <template v-else>
        <van-button
          type="primary"
          block
          round
          :loading="purchasing"
          :disabled="buyDisabled"
          @click="onPurchase"
        >
          {{ buyButtonText }}
        </van-button>
      </template>
    </div>

    <!-- Purchase confirm dialog -->
    <van-dialog
      v-model:show="showConfirm"
      title="确认购买"
      show-cancel-button
      :message="confirmMessage"
      confirm-button-text="确认支付"
      @confirm="confirmPurchase"
    />

    <!-- Library view link dialog -->
    <van-dialog
      v-model:show="showViewLink"
      title="资料查看链接"
      :show-confirm-button="false"
      close-on-click-overlay
    >
      <div class="view-link-content">
        <van-loading v-if="viewLinkLoading" size="24" style="text-align: center; padding: 20px;" />
        <template v-else-if="viewLinkData">
          <van-cell title="资料" :value="product?.name" />
          <van-cell title="有效期" :value="formatExpire(viewLinkData.expire_at)" />
          <van-cell v-if="viewLinkData.watermarked" title="水印保护" value="已启用">
            <template #right-icon><van-icon name="shield-o" color="#07c160" /></template>
          </van-cell>
          <div style="padding: 12px 16px;">
            <van-button block type="primary" @click="openViewUrl">
              <van-icon name="eye-o" style="margin-right: 4px;" /> 打开资料
            </van-button>
          </div>
        </template>
        <van-empty v-else description="获取链接失败" image-size="60" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useShopStore } from '../../stores/shop'
import { useCoinStore } from '../../stores/coin'
import { getPreview, createOrder, getViewUrl } from '../../api/shop'

const router = useRouter()
const route = useRoute()
const shopStore = useShopStore()
const coinStore = useCoinStore()

const productId = ref(route.params.id)
const product = ref(null)
const showConfirm = ref(false)
const purchasing = ref(false)

// Preview state
const previewQuestions = ref([])
const previewLoading = ref(false)
const expandedPreview = ref([])

// Payment state
const payMethod = ref('coin')

// Library view state
const showViewLink = ref(false)
const viewLinkLoading = ref(false)
const viewLinkData = ref(null)

const buyButtonText = computed(() => {
  if (payMethod.value === 'wechat') return '确认购买（微信支付）'
  return `确认购买（${product.value?.price || 0} 虚拟币）`
})

const buyDisabled = computed(() => {
  if (purchasing.value) return true
  if (payMethod.value === 'coin' && coinStore.balance < (product.value?.price || 0)) return true
  return false
})

const confirmMessage = computed(() => {
  const name = product.value?.name || ''
  const price = product.value?.price || 0
  const method = payMethod.value === 'wechat' ? '微信支付' : '虚拟币支付'
  return `确定花费 ${price} 虚拟币购买「${name}」？\n支付方式：${method}`
})

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

function typeLabel(type) {
  const map = { single: '单选', multi: '多选', judge: '判断' }
  return map[type] || type
}

function diffLabel(diff) {
  const map = { easy: '简单', medium: '中等', hard: '困难' }
  return map[diff] || diff
}

function formatExpire(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadProduct() {
  try {
    product.value = await shopStore.fetchProductDetail(productId.value)
  } catch {
    showToast('加载失败')
  }
}

async function loadPreview() {
  previewLoading.value = true
  try {
    const res = await getPreview(productId.value)
    previewQuestions.value = res.data.questions || []
  } catch {} finally {
    previewLoading.value = false
  }
}

function onPurchase() {
  if (payMethod.value === 'coin' && coinStore.balance < (product.value?.price || 0)) {
    showToast('余额不足')
    return
  }
  showConfirm.value = true
}

async function confirmPurchase() {
  purchasing.value = true
  try {
    const res = await createOrder({
      product_id: productId.value,
      payment_method: payMethod.value,
    })

    const data = res.data

    // Pending external payment
    if (data.status === 'pending' && payMethod.value !== 'coin') {
      showToast({ message: '外部支付接口待接入', duration: 2000 })
      return
    }

    // Payment successful — update local state
    product.value.is_purchased = true
    product.value.sales_count++
    if (data.balance !== undefined) {
      coinStore.balance = data.balance
    }

    showToast({ message: '购买成功！正在进入练习...', type: 'success', duration: 1000 })

    // Auto-navigate to practice with product_id for auto-start
    setTimeout(() => {
      if (product.value.is_question_bank) {
        router.replace(`/practice?product_id=${productId.value}`)
      } else {
        router.replace(`/shop/view/${productId.value}`)
      }
    }, 800)
  } catch (e) {
    // Error handled by interceptor
  } finally {
    purchasing.value = false
  }
}

// View library link
async function onViewLibrary() {
  showViewLink.value = true
  viewLinkLoading.value = true
  viewLinkData.value = null
  try {
    const res = await getViewUrl(productId.value)
    viewLinkData.value = res.data
  } catch {
    showToast('获取链接失败')
  } finally {
    viewLinkLoading.value = false
  }
}

function openViewUrl() {
  if (viewLinkData.value?.view_url) {
    window.open(viewLinkData.value.view_url, '_blank')
  }
}

onMounted(async () => {
  await Promise.all([
    loadProduct(),
    coinStore.fetchBalance(),
  ])
  if (product.value?.is_question_bank) {
    await loadPreview()
  }
})
</script>

<style scoped>
.cover-placeholder {
  height: 200px; display: flex; align-items: center; justify-content: center;
  background: #f5f5f5;
}
.price-bar {
  padding: 12px 16px; background: #fff;
  display: flex; align-items: baseline; gap: 8px;
}
.price-coin { font-size: 22px; font-weight: bold; color: #ee0a24; }
.sales { font-size: 12px; color: #999; margin-left: auto; }
.title-bar {
  padding: 8px 16px 12px; background: #fff;
  display: flex; align-items: center; gap: 8px;
}
.product-title { font-size: 16px; font-weight: 500; }
.description { font-size: 14px; color: #666; line-height: 1.6; }
.insufficient { color: #ee0a24 !important; }
.preview-stem { font-size: 14px; color: #333; margin-bottom: 8px; line-height: 1.6; }
.preview-options { padding-left: 8px; }
.preview-option { font-size: 13px; color: #555; padding: 2px 0; }
.preview-note { font-size: 12px; color: #999; margin-top: 8px; text-align: center; }
.view-link-content { padding: 8px 0; }

/* Fixed bottom action bar */
.fixed-action-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 10px 16px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
  z-index: 100;
}
</style>
