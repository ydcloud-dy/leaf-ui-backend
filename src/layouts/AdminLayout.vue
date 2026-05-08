<template>
  <el-container class="layout-container">
    <el-aside width="248px" class="aside">
      <div class="logo">
        <span class="logo-mark">
          <el-icon><Reading /></el-icon>
        </span>
        <div>
          <h1>Leaf Admin</h1>
          <p>博客管理台</p>
        </div>
      </div>

      <div class="side-section">内容运营</div>
      <el-menu
        :default-active="$route.path"
        router
        class="side-menu"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>控制台</span>
        </el-menu-item>
        <el-menu-item index="/articles">
          <el-icon><Document /></el-icon>
          <span>文章管理</span>
        </el-menu-item>
        <el-menu-item index="/comments">
          <el-icon><ChatDotRound /></el-icon>
          <span>评论管理</span>
        </el-menu-item>
        <el-menu-item index="/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/tags">
          <el-icon><PriceTag /></el-icon>
          <span>标签管理</span>
        </el-menu-item>
        <el-menu-item index="/categories">
          <el-icon><Folder /></el-icon>
          <span>分类管理</span>
        </el-menu-item>
        <el-menu-item index="/chapters">
          <el-icon><Notebook /></el-icon>
          <span>章节管理</span>
        </el-menu-item>
        <el-menu-item index="/files">
          <el-icon><Picture /></el-icon>
          <span>文件管理</span>
        </el-menu-item>
      </el-menu>

      <div class="side-section">系统</div>
      <el-menu
        :default-active="$route.path"
        router
        class="side-menu"
      >
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>

      <div class="side-footer">
        <div class="status-dot"></div>
        <span>API 已连接</span>
      </div>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <div>
            <span class="eyebrow">Management</span>
            <h2 class="page-title">{{ $route.meta.title }}</h2>
          </div>
        </div>
        <div class="header-right">
          <el-button class="visit-button" @click="openFrontend">
            <el-icon><Position /></el-icon>
            访问前台
          </el-button>

          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar :size="32" :src="userStore.userInfo.avatar">
                {{ userStore.userInfo.username?.charAt(0).toUpperCase() }}
              </el-avatar>
              <span class="username">{{ userStore.userInfo.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const openFrontend = () => {
  window.open('/', '_blank')
}

const handleCommand = async (command) => {
  if (command === 'logout') {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    userStore.logout()
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/profile')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background: var(--admin-bg);
}

.aside {
  display: flex;
  flex-direction: column;
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.12), transparent 28%),
    var(--admin-sidebar);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.logo {
  min-height: 86px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 20px 18px;
}

.logo-mark {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 23px;
}

.logo h1 {
  color: #fff;
  font-size: 18px;
  line-height: 1.2;
  margin: 0;
  font-weight: 800;
}

.logo p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.52);
  font-size: 12px;
  font-weight: 650;
}

.side-section {
  margin: 14px 18px 8px;
  color: rgba(255, 255, 255, 0.38);
  font-size: 12px;
  font-weight: 800;
}

.side-menu {
  padding: 0 12px;
  background: transparent;
  border-right: 0;
}

.side-menu :deep(.el-menu-item) {
  height: 42px;
  margin: 4px 0;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.66);
  font-weight: 650;
}

.side-menu :deep(.el-menu-item:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.side-menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: linear-gradient(90deg, var(--admin-primary), #3b82f6);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.28);
}

.side-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: auto 18px 18px;
  padding: 12px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 650;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
}

.header {
  height: 72px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid var(--admin-border);
  box-shadow: none;
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

.eyebrow {
  display: block;
  color: var(--admin-subtle);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.page-title {
  margin: 6px 0 0;
  color: var(--admin-heading);
  font-size: 20px;
  font-weight: 820;
  line-height: 1.2;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.visit-button {
  background: var(--admin-surface-soft);
  border-color: transparent;
  color: var(--admin-muted);
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 4px 4px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-dropdown:hover {
  background: var(--admin-surface-soft);
}

.username {
  font-size: 14px;
  color: var(--admin-text);
  font-weight: 650;
}

.main {
  min-height: calc(100vh - 72px);
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.07), transparent 26%),
    var(--admin-bg);
  overflow-y: auto;
}
</style>
