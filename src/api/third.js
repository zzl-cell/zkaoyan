import request from './request'

// Third-party institution APIs (for institution management portal)
export const thirdLogin = (data) => request.post('/third/login', data)
export const thirdRegister = (data) => request.post('/third/register', data)
export const getThirdProfile = () => request.get('/third/profile')

// Question sync
export const syncQuestions = (data) => request.post('/third/questions/sync', data)
export const getThirdQuestions = (params) => request.get('/third/questions', { params })
export const getThirdQuestionDetail = (id) => request.get(`/third/questions/${id}`)
export const createThirdQuestion = (data) => request.post('/third/questions', data)
export const updateThirdQuestion = (id, data) => request.put(`/third/questions/${id}`, data)
export const deactivateQuestion = (id) => request.post(`/third/questions/${id}/inactive`)
export const getSyncLogs = (params) => request.get('/third/questions/sync-logs', { params })

// Products
export const getThirdProducts = (params) => request.get('/third/products', { params })
export const createThirdProduct = (data) => request.post('/third/products', data)
export const updateThirdProduct = (id, data) => request.put(`/third/products/${id}`, data)
export const toggleThirdProduct = (id) => request.post(`/third/products/${id}/toggle`)

// Orders & Settlement
export const getThirdOrders = (params) => request.get('/third/orders', { params })
export const getThirdSettlements = (params) => request.get('/third/settlements', { params })
export const getThirdSettlementDetail = (id) => request.get(`/third/settlements/${id}`)
export const confirmSettlement = (id) => request.post(`/third/settlements/${id}/confirm`)
export const downloadSettlement = (id) => request.get(`/third/settlements/${id}/download`)

// Deposit
export const getDepositInfo = () => request.get('/third/deposit')
export const payDeposit = (data) => request.post('/third/deposit/pay', data)
export const replenishDeposit = (data) => request.post('/third/deposit/replenish', data)
export const getDepositRecords = (params) => request.get('/third/deposit/records', { params })
