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

          <el-form-item label="站点地址">
            <el-input v-model="form.site_url" placeholder="https://dycloud.fun" prefix-icon="Link" />
          </el-form-item>

          <el-divider content-position="left">发布邮件通知</el-divider>

          <el-form-item label="邮件通知">
            <el-switch
              v-model="form.mail_enabled"
              active-value="true"
              inactive-value="false"
              active-text="开启"
              inactive-text="关闭"
            />
          </el-form-item>

          <el-form-item label="SMTP服务器">
            <el-input v-model="form.mail_smtp_host" placeholder="smtp.163.com" prefix-icon="Connection" />
          </el-form-item>

          <el-form-item label="SMTP端口">
            <el-input v-model="form.mail_smtp_port" placeholder="25" prefix-icon="Switch" />
          </el-form-item>

          <el-form-item label="SMTP账号">
            <el-input v-model="form.mail_smtp_username" placeholder="请输入SMTP账号" prefix-icon="User" />
          </el-form-item>

          <el-form-item label="SMTP密码">
            <el-input
              v-model="form.mail_smtp_password"
              type="password"
              show-password
              placeholder="请输入SMTP授权码或密码"
              prefix-icon="Lock"
            />
            <div class="form-tip">建议使用邮箱服务商生成的 SMTP 授权码，不要使用网页登录密码。</div>
          </el-form-item>

          <el-form-item label="发件邮箱">
            <el-input v-model="form.mail_smtp_from" placeholder="dycloudlove@163.com" prefix-icon="Message" />
          </el-form-item>

          <el-form-item label="发件名称">
            <el-input v-model="form.mail_smtp_from_name" placeholder="运维工程师的技术笔记" prefix-icon="Stamp" />
          </el-form-item>

          <el-form-item label="SSL连接">
            <el-switch
              v-model="form.mail_smtp_use_ssl"
              active-value="true"
              inactive-value="false"
              active-text="使用SSL"
              inactive-text="不使用"
            />
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
          <span>{{ form.site_url || '未填写站点地址' }}</span>
        </div>

        <div class="mail-preview">
          <h4>发布通知</h4>
          <span :class="['mail-status', form.mail_enabled === 'true' ? 'is-on' : 'is-off']">
            {{ form.mail_enabled === 'true' ? '已开启' : '已关闭' }}
          </span>
          <p>{{ form.mail_smtp_host || '未配置 SMTP 服务' }}:{{ form.mail_smtp_port || '25' }}</p>
          <p>{{ form.mail_smtp_from_name || form.mail_smtp_from || '未配置发件人' }}</p>
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
  contact_email: '',
  site_url: 'https://dycloud.fun',
  mail_enabled: 'true',
  mail_smtp_host: 'smtp.163.com',
  mail_smtp_port: '25',
  mail_smtp_username: 'dycloudlove@163.com',
  mail_smtp_password: '',
  mail_smtp_from: 'dycloudlove@163.com',
  mail_smtp_from_name: 'dycloudlove@163.com',
  mail_smtp_use_ssl: 'false'
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

.form-tip {
  margin-top: 6px;
  color: var(--admin-muted);
  font-size: 12px;
  line-height: 1.6;
}

.mail-preview {
  display: grid;
  gap: 8px;
  margin-top: 6px;
  padding: 14px;
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  background: var(--admin-surface);
}

.mail-preview h4 {
  margin: 0;
  color: var(--admin-heading);
  font-size: 14px;
  font-weight: 800;
}

.mail-preview p {
  margin: 0;
  color: var(--admin-muted);
  font-size: 12px;
  line-height: 1.6;
}

.mail-status {
  width: fit-content;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 750;
}

.mail-status.is-on {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.mail-status.is-off {
  background: rgba(100, 116, 139, 0.14);
  color: #64748b;
}
</style>
