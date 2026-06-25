import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginByPassword as loginByPasswordApi, loginBySms as loginBySmsApi, getProfile, updateProfile as updateProfileApi, getPrivacy, updatePrivacy as updatePrivacyApi, togglePrivate as togglePrivateApi } from '../api/user'
import { getToken, setToken, clearAll, getUserInfo, setUserInfo } from '../utils/storage'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const userInfo = ref(getUserInfo())
  const privacySettings = ref({})
  const isPrivate = ref(false)

  const isLoggedIn = computed(() => !!token.value)
  const nickname = computed(() => userInfo.value?.nickname || '')
  const avatar = computed(() => userInfo.value?.avatar || '')
  const coinBalance = computed(() => userInfo.value?.coin_balance || 0)

  // Login by password
  async function loginByPassword(params) {
    const res = await loginByPasswordApi(params)
    token.value = res.data.token
    setToken(res.data.token)
    await fetchProfile()
    return res
  }

  // Login by SMS
  async function loginBySms(params) {
    const res = await loginBySmsApi(params)
    token.value = res.data.token
    setToken(res.data.token)
    await fetchProfile()
    return res
  }

  // Fetch full profile
  async function fetchProfile() {
    const res = await getProfile()
    userInfo.value = res.data
    setUserInfo(res.data)
    privacySettings.value = res.data.privacy_settings || {}
  }

  // Fetch privacy settings
  async function fetchPrivacy() {
    const res = await getPrivacy()
    privacySettings.value = res.data.privacy_settings || {}
    isPrivate.value = res.data.is_private || false
  }

  // Update profile
  async function updateProfile(data) {
    await updateProfileApi(data)
    // Refresh profile
    await fetchProfile()
  }

  // Update privacy
  async function updatePrivacy(settings) {
    await updatePrivacyApi({ settings })
    privacySettings.value = { ...privacySettings.value, ...settings }
  }

  // Toggle private mode
  async function togglePrivate() {
    await togglePrivateApi()
    isPrivate.value = !isPrivate.value
  }

  // Logout
  function logout() {
    token.value = null
    userInfo.value = null
    privacySettings.value = {}
    isPrivate.value = false
    clearAll()
  }

  return {
    token, userInfo, privacySettings, isPrivate,
    isLoggedIn, nickname, avatar, coinBalance,
    loginByPassword, loginBySms, fetchProfile, fetchPrivacy,
    updateProfile, updatePrivacy, togglePrivate, logout,
  }
})
