<template>
  <div class="feedback-page">
    <van-nav-bar title="意见反馈" left-arrow @click-left="router.back()" />

    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="form.content"
          type="textarea"
          placeholder="请输入你的意见或建议..."
          rows="6"
          maxlength="500"
          show-word-limit
          :rules="[{ required: true, message: '请输入反馈内容' }]"
        />
      </van-cell-group>

      <van-cell-group inset title="截图（可选）">
        <van-uploader v-model="form.images" :max-count="3" />
      </van-cell-group>

      <van-cell-group inset>
        <van-field
          v-model="form.contact"
          label="联系方式"
          placeholder="请留下你的联系方式，便于我们回复"
        />
      </van-cell-group>

      <div style="padding: 16px;">
        <van-button block type="primary" native-type="submit" :loading="loading">提交反馈</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import request from '../../api/request'

const router = useRouter()
const loading = ref(false)
const form = reactive({ content: '', images: [], contact: '' })

async function onSubmit() {
  loading.value = true
  try {
    await request.post('/user/feedback', {
      content: form.content,
      images: form.images.map(f => f.url || f.objectUrl || ''),
      contact: form.contact,
    })
    loading.value = false
    showDialog({
      title: '提交成功',
      message: '感谢你的反馈，我们会尽快处理！',
      confirmButtonText: '好的',
    }).then(() => {
      router.back()
    }).catch(() => {})
  } catch (err) {
    loading.value = false
    showToast(err.message || '提交失败')
  }
}
</script>
