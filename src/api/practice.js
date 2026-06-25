import request from './request'

// Paper generation
export const getSprintPapers = () => request.get('/practice/sprint/papers')
export const getSprintPaperDetail = (paperId) => request.get(`/practice/sprint/paper/${paperId}`)
export const startRandomPractice = () => request.post('/practice/random/start')
export const startMockExam = (data) => request.post('/practice/mock/start', data)
export const getKnowledgeTree = () => request.get('/practice/knowledge-tree')

// Session
export const getSession = (sessionId) => request.get(`/practice/session/${sessionId}`)
export const saveProgress = (sessionId, data) => request.put(`/practice/session/${sessionId}/save`, data)
export const pauseSession = (sessionId) => request.post(`/practice/session/${sessionId}/pause`)
export const resumeSession = (sessionId) => request.post(`/practice/session/${sessionId}/resume`)
export const submitExam = (sessionId) => request.post(`/practice/session/${sessionId}/submit`)
export const abandonSession = (sessionId) => request.post(`/practice/session/${sessionId}/abandon`)
export const getOngoingSession = () => request.get('/practice/session/ongoing')

// Result
export const getResult = (sessionId) => request.get(`/practice/result/${sessionId}`)
export const getPersonalRank = (sessionId) => request.get(`/practice/result/${sessionId}/rank`)

// Wrong book
export const getWrongBook = (params) => request.get('/practice/wrongbook', { params })
export const getWrongBookDetail = (recordId) => request.get(`/practice/wrongbook/${recordId}`)
export const redoWrong = (recordId) => request.post(`/practice/wrongbook/${recordId}/redo`)
export const removeWrong = (recordId) => request.delete(`/practice/wrongbook/${recordId}`)
export const getWrongBookStats = () => request.get('/practice/wrongbook/stats')

// Favorites
export const getFavoriteQuestions = (params) => request.get('/practice/favorites', { params })
export const favoriteQuestion = (questionId) => request.post(`/practice/favorites/${questionId}`)
export const unfavoriteQuestion = (questionId) => request.delete(`/practice/favorites/${questionId}`)

// Study records
export const getStudyHistory = (params) => request.get('/practice/history', { params })
export const getStudyStats = () => request.get('/practice/stats')
export const getStudyTrend = () => request.get('/practice/stats/trend')

// Questions list
export const getQuestionsList = (params) => request.get('/practice/questions', { params })
