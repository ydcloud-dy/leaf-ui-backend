<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #409EFF">
              <el-icon size="24"><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.article_count || 0 }}</div>
              <div class="stat-label">文章总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #67C23A">
              <el-icon size="24"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.user_count || 0 }}</div>
              <div class="stat-label">用户总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #E6A23C">
              <el-icon size="24"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.comment_count || 0 }}</div>
              <div class="stat-label">评论总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #F56C6C">
              <el-icon size="24"><View /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total_views || 0 }}</div>
              <div class="stat-label">总浏览量</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #909399">
              <el-icon size="24"><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.site_runtime || 0 }}</div>
              <div class="stat-label">运行天数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #13C2C2">
              <el-icon size="24"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.today_views || 0 }}</div>
              <div class="stat-label">今日浏览</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card online-card" @click="showOnlineUsers">
          <div class="stat-content" style="cursor: pointer;">
            <div class="stat-icon" style="background-color: #52C41A">
              <el-icon size="24"><UserFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value online-count">{{ stats.online_count || 0 }}</div>
              <div class="stat-label">
                <span class="online-indicator"></span>
                当前在线
                <el-icon style="margin-left: 4px;"><Right /></el-icon>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #722ED1">
              <el-icon size="24"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ formatDuration(stats.avg_visit_duration) }}</div>
              <div class="stat-label">平均访问</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>分类统计</span>
          </template>
          <div class="stats-list">
            <div class="stats-item">
              <span class="stats-item-label">文章分类</span>
              <span class="stats-item-value">{{ stats.category_count || 0 }} 个</span>
            </div>
            <div class="stats-item">
              <span class="stats-item-label">文章标签</span>
              <span class="stats-item-value">{{ stats.tag_count || 0 }} 个</span>
            </div>
            <div class="stats-item">
              <span class="stats-item-label">章节笔记</span>
              <span class="stats-item-value">{{ stats.chapter_count || 0 }} 个</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <span>热门文章 Top 10</span>
          </template>
          <div class="hot-articles">
            <div
              v-for="(article, index) in hotArticles"
              :key="article.id"
              class="hot-article-item"
            >
              <span class="rank" :class="{ top: index < 3 }">{{ index + 1 }}</span>
              <span class="title">{{ article.title }}</span>
              <span class="views">{{ article.view_count }} 次</span>
            </div>
            <el-empty v-if="hotArticles.length === 0" description="暂无数据" :image-size="80" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 在线用户详情对话框 -->
    <el-dialog
      v-model="onlineUsersDialogVisible"
      title="在线用户详情"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-loading="loadingOnlineUsers">
        <el-alert
          v-if="onlineUsersData.summary"
          :title="`总在线: ${onlineUsersData.total || 0} 人 (注册用户: ${onlineUsersData.summary.registered_users || 0} | 游客: ${onlineUsersData.summary.guest_users || 0})`"
          type="success"
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-tabs v-model="activeOnlineTab">
          <!-- 注册用户 -->
          <el-tab-pane label="注册用户" name="users">
            <el-table
              :data="onlineUsersData.users || []"
              style="width: 100%"
              max-height="400px"
            >
              <el-table-column label="用户" width="200">
                <template #default="{ row }">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <el-avatar :size="32" :src="row.avatar">{{ row.username?.charAt(0) }}</el-avatar>
                    <div>
                      <div style="font-weight: 600;">{{ row.nickname || row.username }}</div>
                      <div style="font-size: 12px; color: #999;">@{{ row.username }}</div>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="ip" label="IP地址" width="140" />
              <el-table-column label="当前页面" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-tag size="small">{{ row.current_page || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="在线时长" width="100">
                <template #default="{ row }">
                  {{ formatOnlineDuration(row.online_duration) }}
                </template>
              </el-table-column>
              <el-table-column label="最后活跃" width="100">
                <template #default="{ row }">
                  {{ formatLastActive(row.last_active_at) }}
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!onlineUsersData.users || onlineUsersData.users.length === 0" description="暂无在线用户" />
          </el-tab-pane>

          <!-- 游客 -->
          <el-tab-pane label="游客" name="guests">
            <el-table
              :data="onlineUsersData.guests || []"
              style="width: 100%"
              max-height="400px"
            >
              <el-table-column label="游客" width="100">
                <template #default="{ row, $index }">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <el-avatar :size="32" style="background-color: #909399;">
                      <el-icon><User /></el-icon>
                    </el-avatar>
                    <span>游客 {{ $index + 1 }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="ip" label="IP地址" width="140" />
              <el-table-column prop="location" label="位置" width="120" />
              <el-table-column label="当前页面" min-width="200" show-overflow-tooltip>
                <template #default="{ row }">
                  <el-tag size="small" type="info">{{ row.current_page || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="最后活跃" width="100">
                <template #default="{ row }">
                  {{ formatLastActive(row.last_active_at) }}
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!onlineUsersData.guests || onlineUsersData.guests.length === 0" description="暂无在线游客" />
          </el-tab-pane>
        </el-tabs>
      </div>

      <template #footer>
        <el-button @click="fetchOnlineUsers" :loading="loadingOnlineUsers">刷新</el-button>
        <el-button type="primary" @click="onlineUsersDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getStats, getHotArticles, getOnlineUsers } from '@/api/system'
import { ElMessage } from 'element-plus'

const stats = ref({})
const hotArticles = ref([])
let refreshInterval = null

// 在线用户相关
const onlineUsersDialogVisible = ref(false)
const loadingOnlineUsers = ref(false)
const activeOnlineTab = ref('users')
const onlineUsersData = ref({
  total: 0,
  users: [],
  guests: [],
  summary: null
})

const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0秒'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (minutes > 0) {
    return `${minutes}分${secs}秒`
  }
  return `${secs}秒`
}

const formatOnlineDuration = (seconds) => {
  if (!seconds || seconds === 0) return '刚刚'
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}小时${mins}分钟`
}

const formatLastActive = (timestamp) => {
  if (!timestamp) return '-'
  const now = new Date()
  const lastActive = new Date(timestamp)
  const diff = Math.floor((now - lastActive) / 1000)

  if (diff < 10) return '刚刚'
  if (diff < 60) return `${diff}秒前`
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  return `${Math.floor(diff / 3600)}小时前`
}

const fetchData = async () => {
  try {
    const [statsRes, hotRes] = await Promise.all([
      getStats(),
      getHotArticles()
    ])
    console.log('统计数据:', statsRes)
    console.log('热门文章:', hotRes)
    stats.value = statsRes.data || {}
    hotArticles.value = hotRes.data || []
  } catch (error) {
    console.error('获取数据失败:', error)
  }
}

const fetchOnlineUsers = async () => {
  loadingOnlineUsers.value = true
  try {
    const res = await getOnlineUsers()
    console.log('在线用户完整数据:', res)
    console.log('在线用户列表:', res.data?.users)
    console.log('在线游客列表:', res.data?.guests)
    onlineUsersData.value = res.data || {
      total: 0,
      users: [],
      guests: [],
      summary: null
    }
  } catch (error) {
    console.error('获取在线用户失败:', error)
    ElMessage.error('获取在线用户失败')
  } finally {
    loadingOnlineUsers.value = false
  }
}

const showOnlineUsers = () => {
  onlineUsersDialogVisible.value = true
  fetchOnlineUsers()
}

onMounted(() => {
  fetchData()
  // 每30秒自动刷新一次数据（主要用于更新在线人数）
  refreshInterval = setInterval(fetchData, 30000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-right: 16px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 在线人数特殊样式 */
.online-card .online-count {
  color: #52C41A;
}

.online-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  background-color: #52C41A;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7);
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 0 4px rgba(82, 196, 26, 0);
  }
}

.chart-card {
  border-radius: 8px;
}

.stats-list {
  padding: 10px 0;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stats-item:last-child {
  border-bottom: none;
}

.stats-item-label {
  font-size: 14px;
  color: #666;
}

.stats-item-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.hot-articles {
  max-height: 300px;
  overflow-y: auto;
}

.hot-article-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.hot-article-item:last-child {
  border-bottom: none;
}

.rank {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: #f0f0f0;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  margin-right: 12px;
  flex-shrink: 0;
}

.rank.top {
  background: #409EFF;
  color: #fff;
}

.title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  margin-right: 12px;
}

.views {
  color: #999;
  font-size: 12px;
  flex-shrink: 0;
}
</style>
