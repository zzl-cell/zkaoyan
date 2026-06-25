<template>
  <div class="change-password">
    <van-nav-bar title="修改密码" left-arrow @click-left="router.back()" />
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="form.old_password"
          type="password"
          label="原密码"
          placeholder="请输入原密码"
          :rules="[{ required: true, message: '请输入原密码' }]"
        />
        <van-field
          v-model="form.new_password"
          type="password"
          label="新密码"
          placeholder="8位以上，含数字+字母"
          :rules="[
            { required: true, message: '请输入新密码' },
            { validator: (v) => v.length >= 8, message: '密码至少8位' },
            { validator: (v) => /[a-zA-Z]/.test(v) && /\d/.test(v), message: '需包含数字和字母' },
          ]"
        />
        <van-field
          v-model="form.confirm_password"
          type="password"
          label="确认密码"
          placeholder="再次输入新密码"
          :rules="[
            { required: true, message: '请确认新密码' },
            { validator: (v) => v === form.new_password, message: '两次密码不一致' },
          ]"
        />
      </van-cell-group>
      <div style="margin: 16px;">
        <van-button round block type="primary" native-type="submit" :loading="loading">确认修改</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '../../api/request'

const router = useRouter()
const loading = ref(false)
const form = reactive({ old_password: '', new_password: '', confirm_password: '' })

async function onSubmit() {
  loading.value = true
  try {
    await request.post('/user/password/change', {
      old_password: form.old_password,
      new_password: form.new_password,
    })
    showToast('密码修改成功')
    router.back()
  } catch (err) {
    showToast(err.message || '修改失败')
  } finally {
    loading.value = false
  }
}
</script>
