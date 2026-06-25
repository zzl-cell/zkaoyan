<template>
  <div class="order-result">
    <van-nav-bar title="支付结果" left-arrow @click-left="router.back()" />
    <div style="text-align: center; padding: 40px;">
      <van-icon :name="success ? 'checked' : 'close'" size="64" :color="success ? '#07c160' : '#ee0a24'" />
      <div style="font-size: 18px; margin-top: 16px;">{{ success ? '支付成功' : '支付失败' }}</div>

      <template v-if="success">
        <div style="color: #999; margin-top: 8px;">实付 {{ coins }} 虚拟币</div>

        <!-- Question bank feedback -->
        <div v-if="isQuestionBank" class="import-feedback">
          <van-icon name="passed" color="#07c160" size="16" />
          <span>题库已自动导入，共 {{ questionCount }} 道题</span>
        </div>

        <!-- File material feedback -->
        <div v-else class="import-feedback">
          <van-icon name="passed" color="#07c160" size="16" />
          <span>文件已解锁，可在资料库中查看</span>
        </div>
      </template>

      <div v-if="message" style="color: #999; margin-top: 8px;">{{ message }}</div>
    </div>

    <div style="padding: 16px;">
      <van-button v-if="success && isQuestionBank" block type="primary" @click="goPractice">
        开始练习
      </van-button>
      <van-button block :plain="isQuestionBank" :style="isQuestionBank ? 'margin-top: 8px;' : ''" @click="router.push('/shop/library')">
        查看资料库
      </van-button>
      <van-button block plain style="margin-top: 8px;" @click="router.push('/shop')">返回商城</van-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const success = computed(() => route.query.status === 'success')
const coins = computed(() => route.query.coins || 0)
const productId = computed(() => route.query.productId || '')
const message = computed(() => route.query.message || '')
const isQuestionBank = computed(() => route.query.isQuestionBank === 'true')
const questionCount = computed(() => route.query.questionCount || 0)

function goPractice() {
  router.push({ path: '/practice', query: { product_id: productId.value } })
}
</script>

<style scoped>
.import-feedback {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 12px; padding: 8px 16px;
  background: #E8F5E9; border-radius: 8px;
  font-size: 14px; color: #43A047;
}
</style>
