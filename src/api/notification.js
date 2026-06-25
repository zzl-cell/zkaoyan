import request from './request'

export const getNotifications = (params) => request.get('/notification/list', { params })
export const getUnreadStatus = () => request.get('/notification/unread')
export const markRead = (data) => request.post('/notification/read', data)  // { ids: [] } or {} for all
export const deleteNotification = (id) => request.delete(`/notification/${id}`)
