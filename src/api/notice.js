import request from './request'

export const getNoticeList = (params) => request.get('/notice/list', { params })
export const getNoticeDetail = (noticeId) => request.get(`/notice/${noticeId}`)
