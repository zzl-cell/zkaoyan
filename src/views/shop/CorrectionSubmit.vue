<template>
  <div class="correction-submit">
    <van-nav-bar title="提交纠错" left-arrow @click-left="router.back()" />
    <van-cell-group>
      <van-cell title="资料ID" :value="productId" />
    </van-cell-group>
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field v-model="form.page_no" label="页码/位置" placeholder="如：第15页、第3题" />
        <van-field v-model="form.error_description" type="textarea" label="错误描述" placeholder="请描述错误内容" rows="3" required />
        <van-field v-model="form.correct_content" type="textarea" label="正确内容" placeholder="请填写正确内容（可选）" rows="3" />
      </van-cell-group>
      <div style="padding: 16px;">
        <van-button block type="primary" native-type="submit" :loading="submitting">提交纠错</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import request from '../../api/request'

const router = useRouter()
const route = useRoute()
const productId = ref(route.params.productId)
const submitting = ref(false)
const form = reactive({ page_no: '', error_description: '', correct_content: '' })

async function onSubmit() {
  if (!form.error_description.trim()) {
    showToast('请描述错误内容')
    return
  }
  submitting.value = true
  try {
    await request.post('/shop/corrections', {
      product_id: productId.value,
      page_no: form.page_no,
      error_description: form.error_description,
      correct_content: form.correct_content,
    })
    showToast({ message: '提交成功', type: 'success' })
    router.back()
  } catch {
    // Error handled by interceptor
  } finally {
    submitting.value = false
  }
}
</script>
