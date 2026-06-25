const TOKEN_KEY = 'zky_token'
const USER_INFO_KEY = 'zky_userInfo'

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setUserInfo(info) {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(info))
}

export function getUserInfo() {
  try {
    return JSON.parse(localStorage.getItem(USER_INFO_KEY))
  } catch {
    return null
  }
}

export function clearAll() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}
