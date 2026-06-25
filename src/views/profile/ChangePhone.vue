<template>
  <div class="change-phone-page">
    <van-nav-bar title="换绑手机" left-arrow @click-left="router.back()" />

    <!-- Step 1: Verify old phone -->
    <template v-if="step === 1">
      <div class="step-info">
        <van-icon name="shield-o" size="24" color="#1989fa" />
        <span>第一步：验证原手机号</span>
      </div>
      <van-form @submit="verifyOldPhone">
        <van-cell-group inset>
          <van-field
            v-model="oldPhone"
            type="tel"
            label="原手机号"
            disabled
          />
          <van-field
            v-model="oldCode"
            label="验证码"
            placeholder="请输入验证码"
            maxlength="6"
            inputmode="numeric"
          >
            <template #button>
              <van-button size="small" type="primary" :disabled="oldCountdown > 0" @click="sendOldCode">
                {{ oldCountdown > 0 ? `${oldCountdown}s` : '发送验证码' }}
              </van-button>
            </template>
          </van-field>
        </van-cell-group>
        <div style="padding: 16px;">
          <van-button block type="primary" native-type="submit" :loading="loading">下一步</van-button>
        </div>
      </van-form>
    </template>

    <!-- Step 2: Bind new phone -->
    <template v-if="step === 2">
      <div class="step-info">
        <van-icon name="phone-o" size="24" color="#07c160" />
        <span>第二步：绑定新手机号</span>
      </div>
      <van-form @submit="bindNewPhone">
        <van-cell-group inset>
          <van-field
            v-model="newPhone"
            type="tel"
            label="新手机号"
            placeholder="请输入新手机号"
            maxlength="11"
          />
          <van-field
            v-model="newCode"
            label="验证码"
            placeholder="请输入验证码"
            maxlength="6"
            inputmode="numeric"
          >
            <template #button>
              <van-button size="small" type="primary" :disabled="newCountdown > 0" @click="sendNewCode">
                {{ newCountdown > 0 ? `${newCountdown}s` : '发送验证码' }}
              </van-button>
            </template>
          </van-field>
        </van-cell-group>
        <div style="padding: 16px;">
          <van-button block type="primary" native-type="submit" :loading="loading">确认换绑</van-button>
        </div>
      </van-form>
    </template>

    <!-- Step 3: Success -->
    <template v-if="step === 3">
      <div class="success-state">
        <van-icon name="passed" size="48" color="#07c160" />
        <div class="success-text">换绑成功</div>
        <div class="success-desc">新手机号：{{ newPhone }}</div>
        <van-button block type="primary" style="margin-top: 24px;" @click="router.back()">完成</van-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../../stores/user'
import { sendSms } from '../../api/user'
import request from '../../api/request'

const router = useRouter()
const userStore = useUserStore()

const step = ref(1)
const loading = ref(false)
const oldPhone = ref('')
const oldCode = ref('')
const newPhone = ref('')
const newCode = ref('')
const oldCountdown = ref(0)
const newCountdown = ref(0)

let oldTimer = null
let newTimer = null

onMounted(() => {
  oldPhone.value = userStore.userInfo?.phone || ''
})

onUnmounted(() => {
  if (oldTimer) clearInterval(oldTimer)
  if (newTimer) clearInterval(newTimer)
})

async function sendOldCode() {
  if (oldCountdown.value > 0) return
  try {
    await sendSms(oldPhone.value)
    showToast('验证码已发送')
  } catch (err) {
    showToast(err.message || '发送失败')
    return
  }
  oldCountdown.value = 60
  oldTimer = setInterval(() => {
    oldCountdown.value--
    if (oldCountdown.value <= 0) clearInterval(oldTimer)
  }, 1000)
}

async function verifyOldPhone() {
  if (!oldCode.value) { showToast('请输入验证码'); return }
  loading.value = true
  try {
    // In mock mode, accept any 6-digit code
    if (oldCode.value.length !== 6) { showToast('验证码格式错误'); return }
    step.value = 2
  } catch {} finally {
    loading.value = false
  }
}

async function sendNewCode() {
  if (!newPhone.value || !/^1[3-9]\d{9}$/.test(newPhone.value)) {
    showToast('请输入正确的新手机号')
    return
  }
  if (newCountdown.value > 0) return
  try {
    await sendSms(newPhone.value)
    showToast('验证码已发送')
  } catch (err) {
    showToast(err.message || '发送失败')
    return
  }
  newCountdown.value = 60
  newTimer = setInterval(() => {
    newCountdown.value--
    if (newCountdown.value <= 0) clearInterval(newTimer)
  }, 1000)
}

async function bindNewPhone() {
  if (!newPhone.value || !/^1[3-9]\d{9}$/.test(newPhone.value)) {
    showToast('请输入正确的新手机号')
    return
  }
  if (!newCode.value || newCode.value.length !== 6) {
    showToast('请输入验证码')
    return
  }
  loading.value = true
  try {
    // Update profile with new phone
    await request.put('/user/profile', { phone: newPhone.value })
    // Update local store
    if (userStore.userInfo) userStore.userInfo.phone = newPhone.value
    step.value = 3
  } catch (err) {
    showToast(err.message || '换绑失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.change-phone-page { min-height: 100vh; background: #f7f8fa; }
.step-info {
  display: flex; align-items: center; gap: 8px;
  padding: 20px 16px; font-size: 16px; font-weight: 500; color: #333;
}
.success-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 80px 32px 0;
}
.success-text { font-size: 18px; font-weight: 500; color: #333; margin-top: 16px; }
.success-desc { font-size: 14px; color: #999; margin-top: 8px; }
</style>
