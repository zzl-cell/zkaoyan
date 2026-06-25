import request from './request'

// Auth
export const sendSms = (phone) => request.post('/user/sms/send', { phone })
export const register = (data) => request.post('/user/register', data)
export const loginByPassword = (data) => request.post('/user/login/password', data)
export const loginBySms = (data) => request.post('/user/login/sms', data)
export const resetPassword = (data) => request.post('/user/password/reset', data)
export const logout = () => request.post('/user/logout')

// Profile
export const getProfile = () => request.get('/user/profile')
export const updateProfile = (data) => request.put('/user/profile', data)
export const getUserProfile = (userId) => request.get(`/user/${userId}/profile`)
export const updateInterests = (data) => request.put('/user/interests', data)
export const switchInterestMode = (mode) => request.put('/user/interest-mode', { mode })

// Privacy
export const getPrivacy = () => request.get('/user/privacy')
export const updatePrivacy = (data) => request.put('/user/privacy', data)
export const togglePrivate = () => request.post('/user/privacy/toggle')

// Follow
export const followUser = (userId) => request.post(`/user/follow/${userId}`)
export const unfollowUser = (userId) => request.delete(`/user/follow/${userId}`)
export const getFollowing = (userId, params) => request.get(`/user/${userId}/following`, { params })
export const getFollowers = (userId, params) => request.get(`/user/${userId}/followers`, { params })
