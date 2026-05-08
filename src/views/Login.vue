<template>
  <div class="login-page">
    <div class="login-shell">
      <section class="login-visual">
        <div class="brand">
          <span class="brand-mark">
            <el-icon><Reading /></el-icon>
          </span>
          <div>
            <strong>Leaf Admin</strong>
            <span>博客管理台</span>
          </div>
        </div>

        <div class="visual-copy">
          <p class="visual-kicker">Content Operations</p>
          <h1>集中管理文章、用户和站点内容</h1>
          <p>为写作、分类、评论审核和系统配置提供一个稳定高效的后台入口。</p>
        </div>

        <div class="visual-grid">
          <div>
            <el-icon><Document /></el-icon>
            <span>文章发布</span>
          </div>
          <div>
            <el-icon><ChatDotRound /></el-icon>
            <span>评论审核</span>
          </div>
          <div>
            <el-icon><Setting /></el-icon>
            <span>站点配置</span>
          </div>
        </div>
      </section>

      <section class="login-panel">
        <div class="panel-header">
          <p>ADMIN SIGN IN</p>
          <h2>登录管理台</h2>
          <span>请输入管理员账号继续操作。</span>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" class="login-form" @submit.prevent="handleLogin">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="用户名"
              prefix-icon="User"
              size="large"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              prefix-icon="Lock"
              size="large"
              show-password
            />
          </el-form-item>
          <el-form-item>
            <el-button
              class="submit-button"
              type="primary"
              size="large"
              :loading="loading"
              native-type="submit"
            >
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="panel-footer">
          <span>默认管理员：admin / admin123</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } catch (error) {
    // Error handled by interceptor
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background-image:
    linear-gradient(90deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.52)),
    url('/img/wukong.png');
  background-size: cover;
  background-position: center;
  position: relative;
}

.login-page::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 72% 24%, rgba(37, 99, 235, 0.28), transparent 30%);
  pointer-events: none;
}

.login-shell {
  width: min(980px, 100%);
  min-height: 600px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(14px);
  position: relative;
  z-index: 1;
}

.login-visual {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 38px;
  color: #fff;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(15, 23, 42, 0.5));
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 24px;
}

.brand strong,
.brand span {
  display: block;
}

.brand strong {
  font-size: 20px;
  font-weight: 850;
}

.brand span {
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
  font-weight: 650;
}

.visual-copy {
  max-width: 500px;
}

.visual-kicker {
  margin: 0 0 14px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 12px;
  font-weight: 850;
}

.visual-copy h1 {
  margin: 0;
  color: #fff;
  font-size: 40px;
  font-weight: 850;
  line-height: 1.15;
}

.visual-copy p:last-child {
  margin: 18px 0 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 15px;
  line-height: 1.8;
}

.visual-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.visual-grid div {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 54px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  font-weight: 650;
}

.login-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 44px 38px;
  background: rgba(255, 255, 255, 0.96);
}

.panel-header {
  margin-bottom: 28px;
}

.panel-header p {
  margin: 0 0 8px;
  color: var(--admin-primary);
  font-size: 12px;
  font-weight: 850;
}

.panel-header h2 {
  margin: 0;
  color: var(--admin-heading);
  font-size: 30px;
  font-weight: 850;
  line-height: 1.25;
}

.panel-header span {
  display: block;
  margin-top: 10px;
  color: var(--admin-muted);
  font-size: 14px;
}

.login-form {
  margin-top: 4px;
}

.submit-button {
  width: 100%;
  height: 44px;
}

.panel-footer {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--admin-border);
  color: var(--admin-subtle);
  font-size: 12px;
  text-align: center;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-input__wrapper) {
  min-height: 46px;
  background: #f8fafc;
}

@media (max-width: 860px) {
  .login-shell {
    grid-template-columns: 1fr;
    max-width: 460px;
    min-height: auto;
  }

  .login-visual {
    display: none;
  }

  .login-panel {
    padding: 36px 28px;
  }
}

@media (max-width: 520px) {
  .login-page {
    padding: 18px;
  }

  .panel-header h2 {
    font-size: 26px;
  }
}
</style>
