<template>
  <div class="settings">
    <div class="setting-shell">
      <el-card class="setting-card">
        <template #header>
          <div class="card-header">
            <div class="page-title-block">
              <strong>系统设置</strong>
              <span>维护前台展示的站点基础信息</span>
            </div>
          </div>
        </template>

        <el-form
          ref="formRef"
          :model="form"
          label-width="120px"
          v-loading="loading"
          class="setting-form"
        >
          <el-form-item label="站点名称">
            <el-input v-model="form.site_name" placeholder="请输入站点名称" prefix-icon="Collection" />
          </el-form-item>

          <el-form-item label="站点描述">
            <el-input
              v-model="form.site_description"
              type="textarea"
              :rows="4"
              placeholder="请输入站点描述"
            />
          </el-form-item>

          <el-form-item label="站点Logo">
            <el-input v-model="form.site_logo" placeholder="Logo图片URL" prefix-icon="Picture" />
          </el-form-item>

          <el-form-item label="备案号">
            <el-input v-model="form.icp_number" placeholder="请输入ICP备案号" prefix-icon="Tickets" />
          </el-form-item>

          <el-form-item label="版权信息">
            <el-input v-model="form.copyright" placeholder="请输入版权信息" prefix-icon="Finished" />
          </el-form-item>

          <el-form-item label="联系邮箱">
            <el-input v-model="form.contact_email" placeholder="请输入联系邮箱" prefix-icon="Message" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSubmit" :loading="submitting">
              <el-icon><Check /></el-icon>
              保存设置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <aside class="side-note settings-preview">
        <h3>站点预览</h3>
        <div class="preview-logo">
          <el-image v-if="form.site_logo" :src="form.site_logo" fit="cover" />
          <el-icon v-else><Collection /></el-icon>
        </div>
        <strong>{{ form.site_name || 'Leaf Blog' }}</strong>
        <p>{{ form.site_description || '暂无站点描述' }}</p>
        <div class="preview-meta">
          <span>{{ form.icp_number || '未填写备案号' }}</span>
          <span>{{ form.contact_email || '未填写联系邮箱' }}</span>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getSettings, updateSettings } from '@/api/system'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const submitting = ref(false)
const formRef = ref()

const form = reactive({
  site_name: '',
  site_description: '',
  site_logo: '',
  icp_number: '',
  copyright: '',
  contact_email: ''
})

const fetchSettings = async () => {
  loading.value = true
  try {
    const res = await getSettings()
    Object.assign(form, res.data)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    await updateSettings(form)
    ElMessage.success('保存成功')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.setting-form {
  max-width: 640px;
}

.settings-preview {
  display: grid;
  gap: 12px;
}

.preview-logo {
  width: 72px;
  height: 72px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  background: var(--admin-surface-soft);
  color: var(--admin-primary);
  font-size: 28px;
}

.preview-logo .el-image {
  width: 100%;
  height: 100%;
}

.settings-preview strong {
  color: var(--admin-heading);
  font-size: 20px;
  font-weight: 850;
}

.preview-meta {
  display: grid;
  gap: 8px;
  margin-top: 6px;
}

.preview-meta span {
  padding: 8px 10px;
  border-radius: 7px;
  background: var(--admin-surface-soft);
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 650;
}
</style>
