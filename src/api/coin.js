import request from './request'

// Sign-in
export const sign = () => request.post('/coin/sign')
export const getSignStatus = () => request.get('/coin/sign/status')
export const getSignLogs = (params) => request.get('/coin/sign/logs', { params })

// Account
export const getBalance = () => request.get('/coin/balance')
export const getTransactions = (params) => request.get('/coin/transactions', { params })
export const getProbLog = (params) => request.get('/coin/prob-log', { params })

// Recharge
export const getRechargePlans = () => request.get('/coin/recharge/plans')
export const createRechargeOrder = (data) => request.post('/coin/recharge/create', data)
export const payRecharge = (orderId, data) => request.post(`/coin/recharge/${orderId}/pay`, data)

// Invite
export const getInviteCode = () => request.get('/coin/invite/code')
export const getInviteRecords = () => request.get('/coin/invite/records')
