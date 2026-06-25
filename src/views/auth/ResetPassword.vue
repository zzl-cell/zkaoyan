<template>
  <div class="reset-page">
    <van-nav-bar title="重置密码" left-arrow @click-left="router.back()" />
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field v-model="form.phone" type="tel" label="手机号" placeholder="请输入手机号" maxlength="11" autocomplete="tel" :rules="[{ required: true }]" />
        <van-field v-model="form.code" label="验证码" placeholder="请输入验证码" maxlength="6" autocomplete="one-time-code" inputmode="numeric" :rules="[{ required: true }]">
          <template #button>
            <van-button size="small" type="primary" :disabled="countdown > 0" @click="sendCode">
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </van-button>
          </template>
        </van-field>
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
      </van-cell-group>
      <div style="margin: 16px;">
        <van-button round block type="primary" native-type="submit" :loading="loading">重置密码</van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { resetPassword, sendSms } from '../../api/user'
import { showToast, showDialog } from 'vant'

const router = useRouter()
const loading = ref(false)
const countdown = ref(0)
let countdownTimer = null
const form = reactive({ phone: '', code: '', new_password: '' })

async function sendCode() {
  if (!form.phone || !/^1[3-9]\d{9}$/.test(form.phone)) {
    showToast('请输入正确的手机号')
    return
  }
  try {
    const res = await sendSms(form.phone)
    // Show test mode verification code prominently
    if (res.data?.code) {
      showDialog({
        title: '【测试模式】',
        message: `当前验证码为：${res.data.code}`,
        theme: 'round-button',
        confirmButtonText: '我知道了',
      }).catch(() => {})
    }
    countdown.value = 60
    clearInterval(countdownTimer)
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(countdownTimer)
    }, 1000)
  } catch (err) {
    showToast(err.message || '发送失败')
  }
}

async function onSubmit() {
  loading.value = true
  try {
    await resetPassword(form)
    showToast('密码已重置')
    router.replace('/login')
  } catch (err) {
    showToast(err.message || '重置失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-page { min-height: 100vh; background: #fff; }
</style>
