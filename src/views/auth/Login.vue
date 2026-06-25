<template>
  <div class="login-page">
    <van-nav-bar title="登录" />
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="form.phone"
          type="tel"
          label="手机号"
          placeholder="请输入手机号"
          maxlength="11"
          autocomplete="tel"
          :rules="[{ required: true, message: '请输入手机号' }]"
        />
        <!-- Password login -->
        <van-field
          v-if="loginMode === 'password'"
          v-model="form.password"
          type="password"
          label="密码"
          placeholder="请输入密码"
          :rules="[{ required: true, message: '请输入密码' }]"
        />
        <!-- SMS login -->
        <van-field
          v-if="loginMode === 'sms'"
          v-model="form.code"
          label="验证码"
          placeholder="请输入验证码"
          maxlength="6"
          autocomplete="one-time-code"
          inputmode="numeric"
          :rules="[{ required: true, message: '请输入验证码' }]"
        >
          <template #button>
            <van-button
              size="small"
              type="primary"
              :disabled="countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </van-button>
          </template>
        </van-field>
      </van-cell-group>

      <div style="margin: 16px;">
        <van-button round block type="primary" native-type="submit" :loading="loading">
          登录
        </van-button>
      </div>
    </van-form>

    <div class="links">
      <span @click="loginMode = loginMode === 'password' ? 'sms' : 'password'" class="switch-mode">
        {{ loginMode === 'password' ? '验证码登录' : '密码登录' }}
      </span>
      <router-link to="/register">注册账号</router-link>
      <router-link to="/reset-password">忘记密码</router-link>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { sendSms } from '../../api/user'
import { showToast, showDialog } from 'vant'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loginMode = ref('password') // 'password' | 'sms'
const loading = ref(false)
const countdown = ref(0)
let countdownTimer = null

const form = reactive({ phone: '', password: '', code: '' })

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
    if (loginMode.value === 'password') {
      await userStore.loginByPassword({ phone: form.phone, password: form.password })
    } else {
      await userStore.loginBySms({ phone: form.phone, code: form.code })
    }
    showToast('登录成功')
    router.replace(route.query.redirect || '/recommend')
  } catch (err) {
    showToast(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; background: #fff; }
.links { display: flex; justify-content: space-between; padding: 16px 32px; }
.links a, .links .switch-mode { color: #1989fa; font-size: 14px; cursor: pointer; }
</style>
