<template>
  <div class="tag-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="page-title-block">
            <strong>标签列表</strong>
            <span>维护文章主题和标签颜色</span>
          </div>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            新增标签
          </el-button>
        </div>
      </template>

      <el-table :data="tags" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="标签名" />
        <el-table-column label="颜色" width="120">
          <template #default="{ row }">
            <span v-if="row.color" class="color-cell">
              <i :style="{ backgroundColor: row.color }"></i>
              {{ row.color }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="danger" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新增标签" width="400px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="标签名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="颜色" prop="color">
          <el-color-picker v-model="form.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getTags, createTag, deleteTag } from '@/api/taxonomy'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tags = ref([])
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref()

const form = reactive({
  name: '',
  color: ''
})

const rules = {
  name: [{ required: true, message: '请输入标签名', trigger: 'blur' }]
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const fetchTags = async () => {
  loading.value = true
  try {
    const res = await getTags()
    tags.value = res.data
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  form.name = ''
  form.color = ''
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await createTag(form)
    ElMessage.success('创建成功')
    dialogVisible.value = false
    fetchTags()
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定要删除标签 "${row.name}" 吗？`, '提示', {
    type: 'warning'
  })
  await deleteTag(row.id)
  ElMessage.success('删除成功')
  fetchTags()
}

onMounted(() => {
  fetchTags()
})
</script>

<style scoped>
.color-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 700;
}

.color-cell i {
  width: 14px;
  height: 14px;
  border: 1px solid var(--admin-border);
  border-radius: 50%;
  box-shadow: var(--admin-shadow-sm);
}
</style>
