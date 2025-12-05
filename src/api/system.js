import request from '@/utils/request'

export function getStats() {
  return request.get('/stats')
}

export function getHotArticles() {
  return request.get('/stats/hot-articles')
}

export function getSettings() {
  return request.get('/settings')
}

export function updateSettings(data) {
  return request.put('/settings', data)
}

// 获取在线用户详情列表
export function getOnlineUsers() {
  return request.get('/analytics/online/users')
}

// 获取在线统计概览
export function getOnlineStats() {
  return request.get('/analytics/online/stats')
}
