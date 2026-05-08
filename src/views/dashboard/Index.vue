<template>
  <div class="dashboard">
    <section class="dashboard-hero">
      <div class="hero-copy">
        <span class="hero-kicker">Overview</span>
        <h3>内容运营控制台</h3>
        <p>快速查看内容规模、访问热度和实时在线状态，方便你判断今天需要优先处理的事情。</p>
      </div>

      <div class="hero-metrics">
        <div class="hero-metric">
          <span>今日浏览</span>
          <strong>{{ formatNumber(stats.today_views) }}</strong>
        </div>
        <button class="hero-metric is-clickable" type="button" @click="showOnlineUsers">
          <span>
            <i class="online-indicator"></i>
            当前在线
          </span>
          <strong>{{ formatNumber(stats.online_count) }}</strong>
        </button>
        <div class="hero-metric">
          <span>平均访问</span>
          <strong>{{ formatDuration(stats.avg_visit_duration) }}</strong>
        </div>
      </div>
    </section>

    <section class="metric-grid" aria-label="站点指标">
      <component
        :is="metric.clickable ? 'button' : 'div'"
        v-for="metric in metricCards"
        :key="metric.key"
        class="metric-card"
        :class="[`is-${metric.tone}`, { 'is-clickable': metric.clickable }]"
        :type="metric.clickable ? 'button' : undefined"
        @click="metric.clickable && showOnlineUsers()"
      >
        <span class="metric-icon">
          <el-icon><component :is="metric.icon" /></el-icon>
        </span>
        <span class="metric-meta">
          <span class="metric-label">{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <span class="metric-helper">{{ metric.helper }}</span>
        </span>
        <el-icon v-if="metric.clickable" class="metric-arrow"><Right /></el-icon>
      </component>
    </section>

    <section class="dashboard-content">
      <el-card class="panel-card taxonomy-panel">
        <template #header>
          <div class="panel-header">
            <div>
              <span>内容结构</span>
              <p>分类、标签和笔记章节概览</p>
            </div>
          </div>
        </template>
        <div class="taxonomy-list">
          <div v-for="item in taxonomyCards" :key="item.label" class="taxonomy-item">
            <span class="taxonomy-icon">
              <el-icon><component :is="item.icon" /></el-icon>
            </span>
            <div>
              <span>{{ item.label }}</span>
              <strong>{{ formatNumber(item.value) }} 个</strong>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="panel-card hot-panel">
        <template #header>
          <div class="panel-header">
            <div>
              <span>热门文章 Top 10</span>
              <p>按浏览量排序的内容表现</p>
            </div>
          </div>
        </template>
        <div class="hot-articles">
          <div
            v-for="(article, index) in hotArticles"
            :key="article.id"
            class="hot-article-item"
          >
            <span class="rank" :class="{ top: index < 3 }">{{ index + 1 }}</span>
            <span class="title">{{ article.title }}</span>
            <span class="views">{{ formatNumber(article.view_count) }} 次</span>
          </div>
          <el-empty v-if="hotArticles.length === 0" description="暂无数据" :image-size="92" />
        </div>
      </el-card>
    </section>

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getStats, getHotArticles, getOnlineUsers } from '@/api/system'
import { ElMessage } from 'element-plus'

const stats = ref({})
const hotArticles = ref([])
let refreshInterval = null

const formatNumber = (value) => {
  const number = Number(value || 0)
  return number.toLocaleString('zh-CN')
}

const metricCards = computed(() => [
  {
    key: 'articles',
    label: '文章总数',
    value: `${formatNumber(stats.value.article_count)} 篇`,
    helper: '已创建内容',
    icon: 'Document',
    tone: 'blue'
  },
  {
    key: 'users',
    label: '用户总数',
    value: `${formatNumber(stats.value.user_count)} 人`,
    helper: '注册用户',
    icon: 'User',
    tone: 'green'
  },
  {
    key: 'comments',
    label: '评论总数',
    value: `${formatNumber(stats.value.comment_count)} 条`,
    helper: '互动反馈',
    icon: 'ChatDotRound',
    tone: 'amber'
  },
  {
    key: 'views',
    label: '总浏览量',
    value: `${formatNumber(stats.value.total_views)} 次`,
    helper: '累计访问',
    icon: 'View',
    tone: 'red'
  },
  {
    key: 'runtime',
    label: '运行天数',
    value: `${formatNumber(stats.value.site_runtime)} 天`,
    helper: '站点在线',
    icon: 'Calendar',
    tone: 'slate'
  },
  {
    key: 'today',
    label: '今日浏览',
    value: `${formatNumber(stats.value.today_views)} 次`,
    helper: '今日访问',
    icon: 'TrendCharts',
    tone: 'cyan'
  },
  {
    key: 'online',
    label: '当前在线',
    value: `${formatNumber(stats.value.online_count)} 人`,
    helper: '点击查看详情',
    icon: 'UserFilled',
    tone: 'emerald',
    clickable: true
  },
  {
    key: 'duration',
    label: '平均访问',
    value: formatDuration(stats.value.avg_visit_duration),
    helper: '单次停留',
    icon: 'Timer',
    tone: 'violet'
  }
])

const taxonomyCards = computed(() => [
  { label: '文章分类', value: stats.value.category_count, icon: 'Folder' },
  { label: '文章标签', value: stats.value.tag_count, icon: 'PriceTag' },
  { label: '章节笔记', value: stats.value.chapter_count, icon: 'Notebook' }
])

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

function formatDuration(seconds) {
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
  display: grid;
  gap: 20px;
}

.dashboard-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.86fr);
  gap: 22px;
  padding: 28px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: var(--admin-radius);
  background:
    linear-gradient(135deg, rgba(17, 24, 39, 0.96), rgba(30, 41, 59, 0.92)),
    var(--admin-sidebar);
  box-shadow: var(--admin-shadow-md);
  overflow: hidden;
}

.hero-copy {
  color: #fff;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  font-weight: 800;
}

.hero-copy h3 {
  margin: 18px 0 0;
  color: #fff;
  font-size: 30px;
  font-weight: 850;
  line-height: 1.25;
}

.hero-copy p {
  max-width: 560px;
  margin: 12px 0 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 14px;
  line-height: 1.8;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-content: end;
}

.hero-metric {
  min-height: 118px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  text-align: left;
}

.hero-metric span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 12px;
  font-weight: 760;
}

.hero-metric strong {
  display: block;
  margin-top: 20px;
  color: #fff;
  font-size: 26px;
  font-weight: 860;
  line-height: 1.15;
}

.hero-metric.is-clickable {
  cursor: pointer;
}

.hero-metric.is-clickable:hover {
  border-color: rgba(34, 197, 94, 0.48);
  background: rgba(34, 197, 94, 0.12);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  position: relative;
  min-height: 128px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow-sm);
  text-align: left;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  border-color: var(--admin-border-strong);
  box-shadow: var(--admin-shadow-md);
}

.metric-card.is-clickable {
  cursor: pointer;
}

.metric-icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 42px;
  border-radius: 8px;
  font-size: 22px;
}

.metric-meta {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.metric-label,
.metric-helper {
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 700;
}

.metric-meta strong {
  color: var(--admin-heading);
  font-size: 24px;
  font-weight: 850;
  line-height: 1.25;
}

.metric-arrow {
  position: absolute;
  right: 14px;
  top: 18px;
  color: var(--admin-subtle);
}

.metric-card.is-blue .metric-icon {
  color: #2563eb;
  background: #eff6ff;
}

.metric-card.is-green .metric-icon,
.metric-card.is-emerald .metric-icon {
  color: #16a34a;
  background: #ecfdf3;
}

.metric-card.is-amber .metric-icon {
  color: #d97706;
  background: #fffbeb;
}

.metric-card.is-red .metric-icon {
  color: #dc2626;
  background: #fef2f2;
}

.metric-card.is-slate .metric-icon {
  color: #475569;
  background: #f1f5f9;
}

.metric-card.is-cyan .metric-icon {
  color: #0891b2;
  background: #ecfeff;
}

.metric-card.is-violet .metric-icon {
  color: #7c3aed;
  background: #f5f3ff;
}

.dashboard-content {
  display: grid;
  grid-template-columns: minmax(320px, 0.7fr) minmax(0, 1fr);
  gap: 20px;
}

.panel-card {
  min-height: 360px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.panel-header span {
  color: var(--admin-heading);
  font-size: 16px;
  font-weight: 820;
}

.panel-header p {
  margin: 6px 0 0;
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 650;
}

.taxonomy-list {
  display: grid;
  gap: 14px;
}

.taxonomy-item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-height: 78px;
  padding: 16px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: var(--admin-surface-soft);
}

.taxonomy-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #fff;
  color: var(--admin-primary);
  box-shadow: var(--admin-shadow-sm);
  font-size: 22px;
}

.taxonomy-item span {
  color: var(--admin-muted);
  font-size: 13px;
  font-weight: 700;
}

.taxonomy-item strong {
  display: block;
  margin-top: 6px;
  color: var(--admin-heading);
  font-size: 22px;
  font-weight: 850;
}

.hot-articles {
  max-height: 346px;
  overflow-y: auto;
  padding-right: 4px;
}

.hot-article-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 10px 0;
  border-bottom: 1px solid var(--admin-border);
}

.hot-article-item:last-child {
  border-bottom: none;
}

.rank {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--admin-surface-soft);
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 800;
}

.rank.top {
  color: #fff;
  background: var(--admin-primary);
}

.title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--admin-text);
  font-size: 14px;
  font-weight: 700;
}

.views {
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 700;
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

@media (max-width: 1180px) {
  .dashboard-hero,
  .dashboard-content {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .dashboard-hero {
    padding: 20px;
  }

  .hero-copy h3 {
    font-size: 24px;
  }

  .hero-metrics,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .metric-card {
    min-height: 112px;
  }
}
</style>
