<template>
  <div class="file-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="page-title-block">
            <strong>文件列表</strong>
            <span>管理文章封面和图片素材</span>
          </div>
          <el-upload
            :action="''"
            :show-file-list="false"
            :before-upload="handleUpload"
            accept="image/*"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              上传文件
            </el-button>
          </el-upload>
        </div>
      </template>

      <div class="file-grid" v-loading="loading">
        <div v-for="file in files" :key="file.id" class="file-item">
          <div class="file-preview">
            <el-image :src="file.url" fit="cover" :preview-src-list="[file.url]" />
          </div>
          <div class="file-info">
            <div class="file-name" :title="file.name">{{ file.name }}</div>
            <div class="file-size">{{ formatSize(file.size) }}</div>
          </div>
          <div class="file-actions">
            <el-button size="small" @click="copyUrl(file.url)">
              <el-icon><Link /></el-icon>
              复制链接
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(file)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
        <el-empty v-if="!loading && files.length === 0" description="暂无文件" />
      </div>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[12, 24, 48]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchFiles"
        @current-change="fetchFiles"
        style="margin-top: 20px"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getFiles, uploadFile, deleteFile } from '@/api/file'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const files = ref([])

const pagination = reactive({
  page: 1,
  limit: 12,
  total: 0
})

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

const fetchFiles = async () => {
  loading.value = true
  try {
    const res = await getFiles({
      page: pagination.page,
      limit: pagination.limit
    })
    files.value = res.data.list
    pagination.total = res.data.total
  } finally {
    loading.value = false
  }
}

const handleUpload = async (file) => {
  loading.value = true
  try {
    await uploadFile(file)
    ElMessage.success('上传成功')
    fetchFiles()
  } catch (error) {
    // Error handled by interceptor
  } finally {
    loading.value = false
  }
  return false
}

const copyUrl = async (url) => {
  await navigator.clipboard.writeText(url)
  ElMessage.success('链接已复制')
}

const handleDelete = async (file) => {
  await ElMessageBox.confirm(`确定要删除文件 "${file.name}" 吗？`, '提示', {
    type: 'warning'
  })
  await deleteFile(file.id)
  ElMessage.success('删除成功')
  fetchFiles()
}

onMounted(() => {
  fetchFiles()
})
</script>

<style scoped>
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  min-height: 260px;
}

.file-item {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  overflow: hidden;
  background: #fff;
  box-shadow: var(--admin-shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.file-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--admin-shadow-md);
}

.file-preview {
  aspect-ratio: 16 / 10;
  background: var(--admin-surface-soft);
}

.file-preview .el-image {
  width: 100%;
  height: 100%;
}

.file-info {
  padding: 12px;
}

.file-name {
  font-size: 14px;
  font-weight: 720;
  color: var(--admin-heading);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: var(--admin-muted);
  margin-top: 4px;
}

.file-actions {
  padding: 10px 12px 12px;
  border-top: 1px solid var(--admin-border);
  display: flex;
  gap: 8px;
}

.file-actions .el-button {
  flex: 1;
}

.file-grid :deep(.el-empty) {
  grid-column: 1 / -1;
}
</style>
