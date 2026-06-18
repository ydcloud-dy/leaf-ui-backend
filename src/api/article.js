import request from '@/utils/request'

export function getArticles(params) {
  return request.get('/articles', { params })
}

export function getArticle(id) {
  return request.get(`/articles/${id}`)
}

export function createArticle(data) {
  return request.post('/articles', data)
}

export function updateArticle(id, data) {
  return request.put(`/articles/${id}`, data)
}

export function updateArticleStatus(id, status) {
  return request.patch(`/articles/${id}/status`, { status })
}

export function updateArticlePin(id, isPinned) {
  return request.patch(`/articles/${id}/pin`, { is_pinned: isPinned })
}

export function getPinnedArticles() {
  return request.get('/articles/pinned')
}

export function reorderPinnedArticles(articleIds) {
  return request.post('/articles/pinned/reorder', { article_ids: articleIds })
}

export function deleteArticle(id) {
  return request.delete(`/articles/${id}`)
}

export function getArticleLikes(id, params) {
  return request.get(`/articles/${id}/likes`, { params })
}

export function getArticleFavorites(id, params) {
  return request.get(`/articles/${id}/favorites`, { params })
}

export function getArticleViews(id) {
  return request.get(`/articles/${id}/views`)
}

export function exportArticles(articleIds) {
  return request.post('/articles/export', { article_ids: articleIds }, { responseType: 'blob' })
}
