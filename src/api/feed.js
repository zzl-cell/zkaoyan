import request from './request'

// Feed
export const getRecommendFeed = (params) => request.get('/feed/recommend', { params })
export const getFollowingFeed = (params) => request.get('/feed/following', { params })
export const getPostDetail = (postId) => request.get(`/feed/post/${postId}`)
export const createPost = (data) => request.post('/feed/post', data)
export const deletePost = (postId) => request.delete(`/feed/post/${postId}`)
export const updateVisibility = (postId, data) => request.put(`/feed/post/${postId}/visibility`, data)

// Comments
export const getComments = (postId, params) => request.get(`/feed/post/${postId}/comments`, { params })
export const createComment = (postId, data) => request.post(`/feed/post/${postId}/comment`, data)
export const deleteComment = (commentId) => request.delete(`/feed/comment/${commentId}`)

// Interactions
export const like = (data) => request.post('/feed/like', data)       // { target_type, target_id }
export const unlike = (data) => request.delete('/feed/like', { data })
export const favoritePost = (targetId) => request.post('/feed/favorite', { target_id: targetId })
export const unfavoritePost = (targetId) => request.delete('/feed/favorite', { data: { target_id: targetId } })
export const getFavoritePosts = (params) => request.get('/feed/favorites', { params })
export const share = (targetId) => request.post('/feed/share', { target_id: targetId })

// Promote
export const buyPromote = (postId, data) => request.post(`/feed/post/${postId}/promote`, data)
export const getPromoteStatus = (postId) => request.get(`/feed/post/${postId}/promote-status`)
export const getDailyPromoteCount = () => request.get('/feed/promote/daily-count')

// Search
export const searchUsers = (params) => request.get('/feed/search/users', { params })
export const searchTopics = (params) => request.get('/feed/search/topics', { params })
export const getSearchHistory = () => request.get('/feed/search/history')
export const clearSearchHistory = () => request.delete('/feed/search/history')
export const deleteSearchHistoryItem = (id) => request.delete(`/feed/search/history/${id}`)
