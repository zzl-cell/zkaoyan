<template>
  <div class="order-confirm">
    <van-nav-bar title="确认订单" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px 0;" />

    <template v-else-if="product">
      <!-- Product info -->
      <van-cell-group inset style="margin-top: 12px;">
        <van-cell>
          <template #title>
            <div class="product-info">
              <van-icon :name="product.is_question_bank ? 'edit' : 'description'" size="32" color="#1989fa" style="margin-right: 12px;" />
              <div>
                <div class="product-name">{{ product.name }}</div>
                <div class="product-meta">{{ product.category }} · {{ product.is_question_bank ? '题库' : '文件资料' }}</div>
              </div>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- Payment method -->
      <van-cell-group title="支付方式" inset style="margin-top: 12px;">
        <van-radio-group v-model="payMethod">
          <van-cell title="虚拟币支付" :label="`余额 ${coinStore.balance} 虚拟币`" clickable @click="payMethod = 'coin'">
            <template #right-icon><van-radio name="coin" /></template>
          </van-cell>
          <van-cell title="微信支付" clickable @click="payMethod = 'wechat'">
            <template #right-icon><van-radio name="wechat" /></template>
          </van-cell>
        </van-radio-group>
      </van-cell-group>

      <!-- Price breakdown -->
      <van-cell-group title="费用明细" inset style="margin-top: 12px;">
        <van-cell title="原价" :value="`${product.price} 虚拟币`" />
        <van-cell v-if="calcResult && calcResult.coin_discount > 0" title="虚拟币抵扣" :value="`-${calcResult.coin_discount} 虚拟币`" value-class="discount-val" />
        <van-cell title="实付金额" :value="`${finalAmount} 虚拟币`" value-class="final-val" />
      </van-cell-group>

      <!-- Insufficient balance warning -->
      <van-notice-bar v-if="payMethod === 'coin' && coinStore.balance < product.price" left-icon="info-o" color="#ee0a24" background="#fff0f0" wrapable style="margin: 12px 16px; border-radius: 8px;">
        余额不足，还需 {{ product.price - coinStore.balance }} 虚拟币
      </van-notice-bar>

      <!-- Submit button -->
      <div style="padding: 16px;">
        <van-button
          block
          type="primary"
          :loading="submitting"
          :disabled="submitDisabled"
          @click="onSubmit"
        >
          确认支付 {{ finalAmount }} 虚拟币
        </van-button>
      </div>
    </template>

    <van-empty v-else description="商品信息加载失败" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useCoinStore } from '../../stores/coin'
import { getProductDetail, calculateDiscount, createOrder } from '../../api/shop'

const router = useRouter()
const route = useRoute()
const coinStore = useCoinStore()

const productId = ref(route.query.product_id)
const product = ref(null)
const loading = ref(true)
const payMethod = ref('coin')
const calcResult = ref(null)
const submitting = ref(false)

const finalAmount = computed(() => {
  if (calcResult.value) return calcResult.value.final_amount
  return product.value?.price || 0
})

const submitDisabled = computed(() => {
  if (submitting.value) return true
  if (payMethod.value === 'coin' && coinStore.balance < (product.value?.price || 0)) return true
  return false
})

async function loadData() {
  if (!productId.value) {
    loading.value = false
    return
  }
  try {
    const [detailRes, calcRes] = await Promise.all([
      getProductDetail(productId.value),
      calculateDiscount({ product_id: productId.value, payment_method: 'coin' }),
    ])
    product.value = detailRes.data
    calcResult.value = calcRes.data
  } catch {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  submitting.value = true
  try {
    const res = await createOrder({
      product_id: productId.value,
      payment_method: payMethod.value,
    })

    const data = res.data

    if (data.status === 'pending' && payMethod.value !== 'coin') {
      showToast({ message: '外部支付接口待接入', duration: 2000 })
      return
    }

    router.replace({
      path: '/shop/order/result',
      query: {
        status: 'success',
        coins: product.value.price,
        productId: productId.value,
        isQuestionBank: String(!!product.value.is_question_bank),
        questionCount: product.value.question_count || 0,
      },
    })
  } catch {} finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await coinStore.fetchBalance()
  await loadData()
})
</script>

<style scoped>
.order-confirm { min-height: 100vh; background: #f7f8fa; }
.product-info { display: flex; align-items: center; }
.product-name { font-size: 15px; font-weight: 500; color: #333; }
.product-meta { font-size: 12px; color: #999; margin-top: 4px; }
:deep(.discount-val) { color: #07c160 !important; }
:deep(.final-val) { color: #ee0a24 !important; font-weight: bold; font-size: 16px; }
</style>
