<template>
  <div class="article-edit">
    <section class="edit-hero">
      <div class="page-title-block">
        <strong>{{ isEdit ? '编辑文章' : '创建文章' }}</strong>
        <span>集中完成正文、摘要、封面、分类标签和发布状态设置</span>
      </div>
      <div class="hero-actions">
        <el-button @click="$router.back()">
          <el-icon><Close /></el-icon>
          取消
        </el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          <el-icon><Check /></el-icon>
          {{ isEdit ? '更新文章' : '创建文章' }}
        </el-button>
      </div>
    </section>

    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="article-form">
      <div class="edit-layout">
        <main class="editor-column">
          <el-card class="editor-card" shadow="never">
            <template #header>
              <div class="editor-header">
                <div class="section-title">
                  <span class="section-icon">
                    <el-icon><EditPen /></el-icon>
                  </span>
                  <strong>正文编辑</strong>
                  <span>沉浸式块编辑，右侧同步文章大纲</span>
                </div>
                <div class="editor-stats">
                  <span>{{ wordCount }} 字</span>
                  <span>约 {{ readMinutes }} 分钟</span>
                  <span class="autosave-status">{{ autosaveText }}</span>
                </div>
              </div>
            </template>

            <el-form-item prop="title" class="title-form-item">
              <el-input
                v-model="form.title"
                class="title-input"
                placeholder="输入一个清晰的文章标题"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item prop="content_markdown" class="content-form-item">
              <MarkdownEditor
                v-model="form.content_markdown"
                height="680px"
                placeholder="从这里开始写正文..."
              />
            </el-form-item>
          </el-card>
        </main>

        <aside ref="settingsColumnRef" class="settings-column" @wheel.capture="handleSettingsWheel">
          <el-card class="settings-card publish-card" shadow="never">
            <template #header>
              <div class="panel-header">
                <div class="section-title compact">
                  <span class="section-icon">
                    <el-icon><Promotion /></el-icon>
                  </span>
                  <strong>发布设置</strong>
                </div>
                <el-tag :type="form.status === 1 ? 'success' : 'info'" effect="light">
                  {{ form.status === 1 ? '发布' : '草稿' }}
                </el-tag>
              </div>
            </template>

            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status" class="status-radio">
                <el-radio-button :value="0">草稿</el-radio-button>
                <el-radio-button :value="1">发布</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="创建时间" prop="created_at">
              <el-date-picker
                v-model="form.created_at"
                type="datetime"
                placeholder="不选则自动使用当前时间"
                format="YYYY-MM-DD HH:mm:ss"
                class="full-control"
              />
              <div class="form-tip">
                {{ isEdit ? '留空则保持原创建时间不变' : '留空则使用当前时间' }}
              </div>
            </el-form-item>

            <div class="publish-actions">
              <el-button type="primary" @click="handleSubmit" :loading="submitting">
                <el-icon><Check /></el-icon>
                {{ isEdit ? '更新文章' : '创建文章' }}
              </el-button>
              <el-button @click="$router.back()">返回列表</el-button>
            </div>
          </el-card>

          <el-card class="settings-card" shadow="never">
            <template #header>
              <div class="panel-header">
                <div class="section-title compact">
                  <span class="section-icon">
                    <el-icon><CollectionTag /></el-icon>
                  </span>
                  <strong>内容归属</strong>
                </div>
              </div>
            </template>

            <el-form-item label="分类" prop="category_id">
              <el-select v-model="form.category_id" placeholder="请选择分类" class="full-control">
                <el-option
                  v-for="item in categories"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="标签" prop="tag_ids">
              <el-select
                v-model="form.tag_ids"
                multiple
                filterable
                collapse-tags
                collapse-tags-tooltip
                placeholder="请选择标签"
                class="full-control"
              >
                <el-option
                  v-for="item in tags"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="章节">
              <el-select v-model="form.chapter_id" placeholder="请选择章节，可选" clearable filterable class="full-control">
                <el-option
                  v-for="item in flatChapters"
                  :key="item.id"
                  :label="item.displayName"
                  :value="item.id"
                >
                  <span :style="{ paddingLeft: item.level === 2 ? '20px' : '0' }">
                    {{ item.level === 2 ? '└─ ' : '' }}{{ item.name }}
                  </span>
                  <span v-if="item.tag" class="chapter-tag">{{ item.tag.name }}</span>
                </el-option>
              </el-select>
              <div class="form-tip">带 └─ 符号的为二级章节</div>
            </el-form-item>
          </el-card>

          <el-card class="settings-card" shadow="never">
            <template #header>
              <div class="panel-header">
                <div class="section-title compact">
                  <span class="section-icon">
                    <el-icon><Picture /></el-icon>
                  </span>
                  <strong>摘要与封面</strong>
                </div>
              </div>
            </template>

            <el-form-item label="摘要" prop="summary">
              <el-input
                v-model="form.summary"
                type="textarea"
                :rows="5"
                maxlength="500"
                show-word-limit
                placeholder="用一两句话说明文章重点"
              />
            </el-form-item>

            <el-form-item label="封面" prop="cover">
              <div class="cover-uploader-wrapper">
                <div v-if="form.cover" class="cover-preview">
                  <img :src="form.cover" class="cover-image" />
                  <div class="cover-actions">
                    <el-button type="primary" size="small" @click="showCoverSelector">
                      <el-icon><Picture /></el-icon>
                      选择
                    </el-button>
                    <el-button type="danger" size="small" @click="removeCover">
                      <el-icon><Delete /></el-icon>
                      移除
                    </el-button>
                  </div>
                </div>

                <div v-else class="cover-placeholder" @click="showCoverSelector">
                  <el-icon class="cover-icon"><Plus /></el-icon>
                  <div class="cover-text">选择封面</div>
                </div>

                <div class="upload-tip">建议使用 16:9 图片，大小不超过 2MB</div>
              </div>
            </el-form-item>
          </el-card>
        </aside>
      </div>
    </el-form>

    <!-- 封面选择对话框 -->
    <el-dialog
      v-model="coverDialogVisible"
      class="cover-dialog"
      title="选择封面"
      width="900px"
      :close-on-click-modal="false"
      align-center
    >
      <el-tabs v-model="activeTab">
        <!-- 从已上传文件选择 -->
        <el-tab-pane label="从文件库选择" name="library">
          <div class="file-library">
            <div class="library-filters">
              <el-input
                v-model="fileSearch"
                placeholder="搜索文件名"
                clearable
                style="width: 200px"
                @input="fetchFiles"
              />
              <el-button type="primary" @click="fetchFiles">刷新</el-button>
            </div>

            <div v-loading="filesLoading" class="files-grid">
              <div
                v-for="file in imageFiles"
                :key="file.id"
                :class="['file-item', { selected: selectedFile?.id === file.id }]"
                @click="selectFile(file)"
              >
                <img :src="file.url" :alt="file.name" />
                <div class="file-name">{{ file.name }}</div>
              </div>

              <el-empty v-if="!filesLoading && imageFiles.length === 0" description="暂无图片文件" />
            </div>

            <el-pagination
              v-if="fileTotal > 0"
              v-model:current-page="filePage"
              v-model:page-size="filePageSize"
              :total="fileTotal"
              layout="total, prev, pager, next"
              @current-change="fetchFiles"
              style="margin-top: 20px; justify-content: center"
            />
          </div>
        </el-tab-pane>

        <!-- 上传新文件 -->
        <el-tab-pane label="上传新图片" name="upload">
          <div class="upload-area">
            <el-upload
              :action="uploadAction"
              :headers="uploadHeaders"
              :show-file-list="true"
              :on-success="handleUploadSuccess"
              :before-upload="beforeCoverUpload"
              accept="image/*"
              drag
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                将图片拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 jpg/png/gif 格式，建议 16:9 比例，大小不超过 2MB
                </div>
              </template>
            </el-upload>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="coverDialogVisible = false">取消</el-button>
        <el-button
          v-if="activeTab === 'library'"
          type="primary"
          @click="confirmCoverSelection"
          :disabled="!selectedFile"
        >
          使用选中封面
        </el-button>
        <el-button v-else type="primary" @click="coverDialogVisible = false">
          完成
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticle, createArticle, updateArticle } from '@/api/article'
import { getTags, getCategories } from '@/api/taxonomy'
import { getChapters } from '@/api/chapter'
import { getFiles } from '@/api/file'
import { ElMessage } from 'element-plus'
import { Plus, UploadFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import MarkdownEditor from '@/components/YuqueMarkdownEditor.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref()
const settingsColumnRef = ref()
const submitting = ref(false)
const tags = ref([])
const categories = ref([])
const chapters = ref([])
const autosaveReady = ref(false)
const lastSavedAt = ref('')
const draftRestored = ref(false)

let autosaveTimer = null

// 封面选择对话框相关
const coverDialogVisible = ref(false)
const activeTab = ref('library')
const filesLoading = ref(false)
const imageFiles = ref([])
const selectedFile = ref(null)
const fileSearch = ref('')
const filePage = ref(1)
const filePageSize = ref(12)
const fileTotal = ref(0)

const isEdit = computed(() => !!route.params.id)
const draftKey = computed(() => `leaf-admin:article-draft:${isEdit.value ? route.params.id : 'new'}`)

const plainContent = computed(() => {
  return form.content_markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, ' ')
    .replace(/[#>*_`~\-[\]()]/g, ' ')
    .replace(/\s+/g, '')
})

const wordCount = computed(() => plainContent.value.length)
const readMinutes = computed(() => Math.max(1, Math.ceil(wordCount.value / 500)))
const autosaveText = computed(() => {
  if (draftRestored.value) return lastSavedAt.value ? `已恢复草稿 ${lastSavedAt.value}` : '已恢复本地草稿'
  if (lastSavedAt.value) return `已自动保存 ${lastSavedAt.value}`
  return '自动保存已开启'
})

// 将章节列表转换为扁平化的层级列表
const flatChapters = computed(() => {
  const result = []

  // 先获取所有一级章节（没有父章节的）
  const topLevelChapters = chapters.value.filter(c => !c.parent_id)

  // 对每个一级章节，添加它和它的子章节
  topLevelChapters.forEach(chapter => {
    // 添加一级章节
    result.push({
      ...chapter,
      level: 1,
      displayName: chapter.name
    })

    // 查找该一级章节的所有子章节
    const subChapters = chapters.value.filter(c => c.parent_id === chapter.id)
    subChapters.forEach(subChapter => {
      result.push({
        ...subChapter,
        level: 2,
        displayName: `  └─ ${subChapter.name}`
      })
    })
  })

  return result
})

// 上传配置
const uploadAction = computed(() => '/api/files/upload')
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

const form = reactive({
  title: '',
  content_markdown: '',
  summary: '',
  cover: '',
  category_id: null,
  tag_ids: [],
  chapter_id: null,
  status: 0,
  created_at: ''
})

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content_markdown: [{ required: true, message: '请输入内容', trigger: 'blur' }],
  category_id: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

const formatAutosaveTime = (date = new Date()) =>
  date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

const getDraftPayload = () => ({
  title: form.title,
  content_markdown: form.content_markdown,
  summary: form.summary,
  cover: form.cover,
  category_id: form.category_id,
  tag_ids: [...(form.tag_ids || [])],
  chapter_id: form.chapter_id,
  status: form.status,
  created_at: form.created_at,
  saved_at: new Date().toISOString()
})

const hasDraftContent = (payload = getDraftPayload()) =>
  Boolean(
    payload.title?.trim() ||
      payload.content_markdown?.trim() ||
      payload.summary?.trim() ||
      payload.cover ||
      payload.category_id ||
      payload.tag_ids?.length ||
      payload.chapter_id ||
      payload.created_at
  )

const restoreDraft = () => {
  const rawDraft = localStorage.getItem(draftKey.value)
  if (!rawDraft) return

  try {
    const draft = JSON.parse(rawDraft)
    if (!hasDraftContent(draft)) return

    Object.assign(form, {
      title: draft.title || '',
      content_markdown: draft.content_markdown || '',
      summary: draft.summary || '',
      cover: draft.cover || '',
      category_id: draft.category_id || null,
      tag_ids: Array.isArray(draft.tag_ids) ? draft.tag_ids : [],
      chapter_id: draft.chapter_id || null,
      status: typeof draft.status === 'number' ? draft.status : 0,
      created_at: draft.created_at || ''
    })
    draftRestored.value = true
    if (draft.saved_at) {
      lastSavedAt.value = formatAutosaveTime(new Date(draft.saved_at))
    }
    ElMessage.success('已恢复本地自动保存草稿')
  } catch (error) {
    localStorage.removeItem(draftKey.value)
  }
}

const saveDraft = () => {
  if (!autosaveReady.value) return

  const payload = getDraftPayload()
  if (!hasDraftContent(payload)) {
    localStorage.removeItem(draftKey.value)
    lastSavedAt.value = ''
    return
  }

  try {
    localStorage.setItem(draftKey.value, JSON.stringify(payload))
    lastSavedAt.value = formatAutosaveTime()
    draftRestored.value = false
  } catch (error) {
    ElMessage.warning('自动保存失败，请检查浏览器存储空间')
  }
}

const scheduleAutosave = () => {
  if (!autosaveReady.value) return
  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer)
  }
  autosaveTimer = window.setTimeout(() => {
    autosaveTimer = null
    saveDraft()
  }, 900)
}

const flushAutosave = () => {
  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer)
    autosaveTimer = null
    saveDraft()
  }
}

const clearDraft = () => {
  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
  localStorage.removeItem(draftKey.value)
  lastSavedAt.value = ''
  draftRestored.value = false
}

const handleSettingsWheel = (event) => {
  const element = settingsColumnRef.value
  if (!element || element.scrollHeight <= element.clientHeight + 1) return

  const atTop = element.scrollTop <= 0
  const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1
  const shouldScroll = (event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)

  if (!shouldScroll) return

  event.preventDefault()
  element.scrollTop += event.deltaY
}

const fetchData = async () => {
  const [tagsRes, categoriesRes, chaptersRes] = await Promise.all([
    getTags(),
    getCategories(),
    getChapters()
  ])
  tags.value = tagsRes.data
  categories.value = categoriesRes.data
  chapters.value = chaptersRes.data || []

  if (isEdit.value) {
    const res = await getArticle(route.params.id)
    const article = res.data
    Object.assign(form, {
      title: article.title,
      content_markdown: article.content_markdown,
      summary: article.summary,
      cover: article.cover,
      category_id: article.category_id,
      tag_ids: article.tags?.map(t => t.id) || [],
      chapter_id: article.chapter_id,
      status: article.status,
      created_at: article.created_at || ''
    })
  }
}

// 封面上传前校验
const beforeCoverUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 显示封面选择器
const showCoverSelector = () => {
  coverDialogVisible.value = true
  activeTab.value = 'library'
  selectedFile.value = null
  fetchFiles()
}

// 获取文件列表
const fetchFiles = async () => {
  filesLoading.value = true
  try {
    const params = {
      page: filePage.value,
      page_size: filePageSize.value,
      type: 'image'
    }

    if (fileSearch.value) {
      params.keyword = fileSearch.value
    }

    const res = await getFiles(params)
    imageFiles.value = res.data.list || []
    fileTotal.value = res.data.total || 0
  } catch (error) {
    ElMessage.error('获取文件列表失败')
  } finally {
    filesLoading.value = false
  }
}

// 选择文件
const selectFile = (file) => {
  selectedFile.value = file
}

// 确认选择封面
const confirmCoverSelection = () => {
  if (activeTab.value === 'library' && selectedFile.value) {
    form.cover = selectedFile.value.url
    ElMessage.success('封面已选择')
    coverDialogVisible.value = false
  }
}

// 移除封面
const removeCover = () => {
  form.cover = ''
}

// 上传新图片成功后
const handleUploadSuccess = (response) => {
  if (response.code === 0) {
    form.cover = response.data.url
    ElMessage.success('封面上传成功')
    coverDialogVisible.value = false
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

// 封面上传成功(旧的,保留兼容)
const handleCoverSuccess = (response) => {
  handleUploadSuccess(response)
}

const handleSubmit = async () => {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  // 验证分类必填
  if (!form.category_id) {
    ElMessage.warning('请选择分类')
    return
  }

  submitting.value = true
  try {
    // 准备提交数据
    const submitData = {
      title: form.title,
      content_markdown: form.content_markdown,
      summary: form.summary,
      cover: form.cover,
      category_id: form.category_id,
      tag_ids: form.tag_ids || [],
      chapter_id: form.chapter_id || null,
      status: form.status
    }

    // 如果设置了创建时间，则包含在提交数据中
    // 需要转换为 ISO 8601 格式（Go 标准时间格式）
    if (form.created_at) {
      // 如果是 Date 对象，转换为 ISO 字符串
      if (form.created_at instanceof Date) {
        submitData.created_at = form.created_at.toISOString()
      } else if (typeof form.created_at === 'string') {
        // 如果是字符串，先转为 Date 再转为 ISO
        submitData.created_at = new Date(form.created_at).toISOString()
      }
    }

    // 打印提交数据用于调试
    console.log('提交的数据:', submitData)

    if (isEdit.value) {
      await updateArticle(route.params.id, submitData)
      ElMessage.success('更新成功')
    } else {
      await createArticle(submitData)
      ElMessage.success('创建成功')
    }
    clearDraft()
    router.push('/articles')
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error(error.response?.data?.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

watch(form, scheduleAutosave, { deep: true })

onMounted(async () => {
  await fetchData()
  restoreDraft()
  autosaveReady.value = true
  window.addEventListener('beforeunload', flushAutosave)
})

onBeforeUnmount(() => {
  flushAutosave()
  window.removeEventListener('beforeunload', flushAutosave)
})
</script>

<style scoped>
.article-edit {
  max-width: 1600px;
  margin: 0 auto;
}

.edit-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
  padding: 18px 20px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(22, 163, 74, 0.04) 42%, transparent 68%),
    var(--admin-surface);
  box-shadow: var(--admin-shadow-sm);
}

.edit-hero::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, var(--admin-primary), #22c55e);
}

.hero-actions,
.publish-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.article-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.article-edit :deep(.el-form-item__content) {
  line-height: normal;
}

.edit-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: start;
}

.editor-column {
  min-width: 0;
}

.editor-card,
.settings-card {
  border-color: var(--admin-border);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow-sm);
}

.settings-card {
  flex: 0 0 auto;
}

.editor-card {
  overflow: hidden;
}

.editor-card :deep(.el-card__header),
.settings-card :deep(.el-card__header) {
  padding: 16px 18px;
  background: rgba(248, 250, 252, 0.72);
}

.editor-card :deep(.el-card__body) {
  padding: 18px;
}

.settings-card :deep(.el-card__body) {
  padding: 18px;
}

.editor-header,
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.editor-header > div:first-child,
.panel-header {
  min-width: 0;
}

.section-title {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  column-gap: 10px;
  align-items: center;
}

.section-title.compact {
  grid-template-columns: 30px minmax(0, 1fr);
}

.section-icon {
  grid-row: 1 / span 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 8px;
  background: var(--admin-primary-soft);
  color: var(--admin-primary);
  font-size: 16px;
}

.section-title.compact .section-icon {
  width: 30px;
  height: 30px;
  font-size: 15px;
}

.editor-header strong,
.panel-header strong {
  display: block;
  color: var(--admin-heading);
  font-size: 15px;
  font-weight: 820;
  line-height: 1.35;
}

.section-title > span:not(.section-icon) {
  display: block;
  grid-column: 2;
  margin-top: 3px;
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 600;
}

.editor-stats {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.editor-stats span {
  display: inline-flex;
  align-items: center;
  height: 28px;
  margin: 0;
  padding: 0 9px;
  border: 1px solid var(--admin-border);
  border-radius: 999px;
  background: var(--admin-surface-soft);
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 750;
}

.editor-stats .autosave-status {
  border-color: rgba(34, 197, 94, 0.18);
  background: rgba(34, 197, 94, 0.08);
  color: #15803d;
}

.title-form-item {
  margin-bottom: 16px;
}

.title-form-item :deep(.el-form-item__label) {
  display: none;
}

.title-input :deep(.el-input__wrapper) {
  min-height: 56px;
  padding: 0 16px;
  background: linear-gradient(180deg, #fff, var(--admin-surface-soft));
  box-shadow: 0 0 0 1px var(--admin-border) inset;
}

.title-input :deep(.el-input__inner) {
  color: var(--admin-heading);
  font-size: 24px;
  font-weight: 800;
}

.title-input :deep(.el-input__inner::placeholder) {
  color: var(--admin-subtle);
  font-weight: 700;
}

.content-form-item {
  margin-bottom: 0;
}

.content-form-item :deep(.el-form-item__label) {
  display: none;
}

.settings-column {
  position: sticky;
  top: 18px;
  align-self: start;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: calc(100vh - 126px);
  height: calc(100dvh - 126px);
  min-height: 420px;
  max-height: calc(100vh - 126px);
  max-height: calc(100dvh - 126px);
  overflow-y: scroll;
  overscroll-behavior: contain;
  padding-right: 8px;
  padding-bottom: 18px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--admin-border-strong) transparent;
}

.settings-column::-webkit-scrollbar {
  width: 8px;
}

.settings-column::-webkit-scrollbar-track {
  background: transparent;
}

.settings-column::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: var(--admin-border-strong);
  background-clip: content-box;
}

.settings-column::-webkit-scrollbar-thumb:hover {
  background: var(--admin-muted);
  background-clip: content-box;
}

.publish-card {
  border-color: rgba(37, 99, 235, 0.22);
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.05), transparent 72%),
    var(--admin-surface);
}

.status-radio {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
}

.status-radio :deep(.el-radio-button__inner) {
  width: 100%;
  font-weight: 750;
}

.publish-actions .el-button {
  flex: 1;
}

.full-control {
  width: 100%;
}

.chapter-tag {
  float: right;
  color: var(--admin-muted);
  font-size: 12px;
  font-weight: 650;
}

.cover-uploader-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.cover-uploader :deep(.el-upload) {
  border: 1px dashed var(--admin-border-strong);
  border-radius: var(--admin-radius);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background: var(--admin-surface-soft);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  width: 100%;
  aspect-ratio: 16 / 9;
}

.cover-uploader :deep(.el-upload:hover) {
  border-color: var(--admin-primary);
  box-shadow: var(--admin-shadow-sm);
}

.cover-placeholder {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--admin-muted);
  border: 1px dashed var(--admin-border-strong);
  border-radius: var(--admin-radius);
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(22, 163, 74, 0.04)),
    var(--admin-surface-soft);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.cover-placeholder:hover {
  border-color: var(--admin-primary);
  box-shadow: var(--admin-shadow-sm);
}

.cover-preview {
  width: 100%;
  aspect-ratio: 16 / 9;
  position: relative;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  overflow: hidden;
}

.cover-preview::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.cover-preview .cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-preview .cover-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px;
  display: flex;
  gap: 8px;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.cover-preview:hover .cover-actions {
  opacity: 1;
}

.cover-icon {
  color: var(--admin-primary);
  font-size: 30px;
}

.cover-text {
  color: var(--admin-heading);
  font-size: 14px;
  font-weight: 750;
}

.upload-tip {
  color: var(--admin-muted);
  font-size: 12px;
}

/* 封面选择对话框样式 */
.file-library {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cover-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--admin-border);
}

.cover-dialog :deep(.el-dialog__body) {
  padding: 18px 20px;
}

.cover-dialog :deep(.el-dialog__footer) {
  padding: 14px 20px 18px;
  border-top: 1px solid var(--admin-border);
}

.library-filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: var(--admin-surface-soft);
}

.file-item {
  position: relative;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  aspect-ratio: 16 / 9;
  background: var(--admin-surface-soft);
}

.file-item:hover {
  border-color: var(--admin-primary);
  transform: translateY(-2px);
  box-shadow: var(--admin-shadow-md);
}

.file-item.selected {
  border-color: var(--admin-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
}

.file-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.file-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px 8px;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upload-area {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

@media (max-width: 1180px) {
  .edit-layout {
    grid-template-columns: 1fr;
  }

  .settings-column {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    height: auto;
    min-height: 0;
    max-height: none;
    overflow: visible;
    padding-right: 0;
    padding-bottom: 0;
  }

  .publish-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .edit-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .hero-actions,
  .publish-actions {
    width: 100%;
  }

  .hero-actions .el-button,
  .publish-actions .el-button {
    flex: 1;
  }

  .editor-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .editor-stats {
    flex-wrap: wrap;
  }

  .settings-column {
    grid-template-columns: 1fr;
  }

  .title-input :deep(.el-input__inner) {
    font-size: 20px;
  }

  .content-form-item :deep(.yuque-editor) {
    min-height: 560px !important;
  }
}
</style>
