import request from './request'

// Products
export const getProducts = (params) => request.get('/shop/products', { params })
export const getProductDetail = (productId) => request.get(`/shop/product/${productId}`)
export const getPreview = (productId) => request.get(`/shop/product/${productId}/preview`)

// Orders
export const calculateDiscount = (data) => request.post('/shop/order/calculate', data)
export const createOrder = (data) => request.post('/shop/order/create', data)
export const payOrder = (orderId, data) => request.post(`/shop/order/${orderId}/pay`, data)
export const getOrderStatus = (orderId) => request.get(`/shop/order/${orderId}/status`)
export const getMyOrders = (params) => request.get('/shop/orders', { params })

// Library
export const getMyLibrary = () => request.get('/shop/library')
export const getViewUrl = (assetId) => request.get(`/shop/library/${assetId}/view`)
export const getAssetDetail = (assetId) => request.get(`/shop/library/${assetId}`)

// User Assets (purchased question banks)
export const getUserAssets = () => request.get('/user/assets')
export const checkUserAsset = (productId) => request.get(`/user/assets/${productId}`)
