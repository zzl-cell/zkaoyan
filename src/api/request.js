import axios from 'axios'
import { getToken, clearAll } from '../utils/storage'
import { isTokenExpired } from '../utils/auth'
import { showToast } from 'vant'

const service = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach token (with expiry check)
service.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle errors
service.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      showToast({ message: res.message || '请求失败', type: 'fail' })
      if (res.code === 401) {
        clearAll()
        window.location.href = '/login'
      }
      return Promise.reject(new Error(res.message))
    }
    return res
  },
  (error) => {
    if (error.response?.status === 401) {
      clearAll()
      window.location.href = '/login'
    }
    showToast({ message: error.message || '网络错误', type: 'fail' })
    return Promise.reject(error)
  }
)

export default service
