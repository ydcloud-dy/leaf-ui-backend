<template>
  <div ref="shellRef" class="vditor-editor" :data-code-theme="codeToolbar.theme">
    <div
      v-show="codeToolbar.visible"
      ref="codeToolbarRef"
      class="code-block-toolbar"
      :style="{
        top: `${codeToolbar.top}px`,
        left: `${codeToolbar.left}px`,
        width: `${codeToolbar.width}px`
      }"
      @mousedown.stop
      @click.stop
    >
      <div class="code-block-toolbar__group">
        <span class="code-block-toolbar__label">语言</span>
        <select v-model="codeToolbar.language" class="code-block-toolbar__select" @change="applyCodeLanguage">
          <option value="">Plain text</option>
          <option
            v-if="codeToolbar.language && !codeLanguageOptions.includes(codeToolbar.language)"
            :value="codeToolbar.language"
          >
            {{ codeToolbar.language }}
          </option>
          <option v-for="item in codeLanguageOptions" :key="item" :value="item">
            {{ item }}
          </option>
        </select>
      </div>
      <div class="code-block-toolbar__group">
        <span class="code-block-toolbar__label">主题</span>
        <select v-model="codeToolbar.theme" class="code-block-toolbar__select" @change="applyCodeTheme">
          <option v-for="item in codeThemeOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>
      <button class="code-block-toolbar__button" type="button" @click="copyActiveCode">复制</button>
      <button class="code-block-toolbar__button is-danger" type="button" @click="deleteActiveCode">删除</button>
    </div>
    <div ref="editorRef" class="vditor-host"></div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { ElMessage } from 'element-plus'
import { uploadFile } from '@/api/file'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  height: {
    type: String,
    default: '680px'
  },
  placeholder: {
    type: String,
    default: '从这里开始写正文...'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const shellRef = ref(null)
const editorRef = ref(null)
const codeToolbarRef = ref(null)
const editor = ref(null)
const ready = ref(false)
const syncingFromEditor = ref(false)
const activeCodeBlock = ref(null)
const codeToolbarCleanups = []

let codeToolbarFrame = 0
let activeCodeHighlightTimer = 0
let highlightRuntimePromise = null

const vditorCdn = 'https://cdn.jsdelivr.net/npm/vditor@3.11.2'

const codeLanguageOptions = [
  'bash',
  'go',
  'javascript',
  'typescript',
  'java',
  'python',
  'json',
  'yaml',
  'sql',
  'dockerfile',
  'nginx',
  'html',
  'css'
]

const codeThemeOptions = [
  { label: 'Night Owl', value: 'night-owl' },
  { label: 'GitHub Dark', value: 'github-dark' },
  { label: 'Tokyo Night', value: 'tokyo-night-dark' },
  { label: 'One Dark', value: 'atom-one-dark' },
  { label: 'GitHub Light', value: 'github' }
]

const codeToolbar = reactive({
  visible: false,
  top: 0,
  left: 0,
  width: 0,
  language: '',
  theme: 'night-owl'
})

const toolbar = [
  'undo',
  'redo',
  '|',
  'headings',
  'bold',
  'italic',
  'strike',
  'inline-code',
  '|',
  'list',
  'ordered-list',
  'check',
  'outdent',
  'indent',
  '|',
  'quote',
  'line',
  'code',
  'table',
  'link',
  'upload',
  '|',
  'edit-mode',
  'both',
  'preview',
  'outline',
  'code-theme',
  'content-theme',
  'fullscreen'
]

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const loadScript = (src, id) =>
  new Promise((resolve, reject) => {
    const existing = document.getElementById(id)
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      existing.addEventListener('error', reject, { once: true })
      if (existing.dataset.loaded === 'true') resolve()
      return
    }

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })

const ensureHighlightRuntime = () => {
  if (window.hljs) return Promise.resolve()
  if (!highlightRuntimePromise) {
    highlightRuntimePromise = loadScript(`${vditorCdn}/dist/js/highlight.js/highlight.min.js`, 'leafHljsScript')
      .then(() => loadScript(`${vditorCdn}/dist/js/highlight.js/third-languages.js`, 'leafHljsThirdScript'))
      .catch((error) => {
        highlightRuntimePromise = null
        throw error
      })
  }
  return highlightRuntimePromise
}

const getCodeElement = (block = activeCodeBlock.value) => block?.querySelector('pre:first-child > code') || null

const getCodeLanguage = (codeElement) => {
  const match = codeElement?.className.match(/(?:^|\s)language-([^\s]+)/)
  return match?.[1] || ''
}

const findCodeBlock = (node) => {
  if (!node) return null
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  const block = element?.closest?.('.vditor-wysiwyg__block[data-type="code-block"]')
  if (!block || !editorRef.value?.contains(block)) return null
  return block
}

const setActiveCodeBlock = (block) => {
  if (activeCodeBlock.value && activeCodeBlock.value !== block) {
    activeCodeBlock.value.removeAttribute('data-code-active')
  }
  activeCodeBlock.value = block
  if (block) {
    block.setAttribute('data-code-active', 'true')
  }
}

const getCaretTextOffset = (root) => {
  const selection = document.getSelection()
  if (!selection?.rangeCount || !root.contains(selection.anchorNode)) return null

  const range = document.createRange()
  range.setStart(root, 0)
  range.setEnd(selection.anchorNode, selection.anchorOffset)
  return range.toString().length
}

const restoreCaretTextOffset = (root, offset) => {
  if (offset === null) return

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let currentOffset = 0
  let textNode = null
  let textOffset = 0

  while (walker.nextNode()) {
    const node = walker.currentNode
    const nextOffset = currentOffset + node.textContent.length
    if (offset <= nextOffset) {
      textNode = node
      textOffset = Math.max(0, offset - currentOffset)
      break
    }
    currentOffset = nextOffset
  }

  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    textNode = document.createTextNode('')
    root.appendChild(textNode)
    textOffset = 0
  }

  const range = document.createRange()
  range.setStart(textNode, Math.min(textOffset, textNode.textContent.length))
  range.collapse(true)

  const selection = document.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

const highlightCodeBlock = async (block, keepCaret = false) => {
  const codeElement = getCodeElement(block)
  if (!codeElement) return

  const caretOffset = keepCaret ? getCaretTextOffset(codeElement) : null
  const language = getCodeLanguage(codeElement)
  const rawCode = codeElement.textContent || ''
  const nextClassNames = ['hljs']

  if (language) {
    nextClassNames.push(`language-${language}`)
  }

  try {
    await ensureHighlightRuntime()
  } catch (error) {
    codeElement.className = nextClassNames.join(' ')
    codeElement.innerHTML = rawCode ? escapeHtml(rawCode) : '<wbr>'
    restoreCaretTextOffset(codeElement, caretOffset)
    return
  }

  const canHighlight = language && window.hljs?.getLanguage(language)
  const highlighted = canHighlight
    ? window.hljs.highlight(rawCode, { language, ignoreIllegals: true }).value
    : escapeHtml(rawCode)

  codeElement.className = nextClassNames.join(' ')
  codeElement.innerHTML = highlighted || '<wbr>'
  restoreCaretTextOffset(codeElement, caretOffset)
}

const highlightAllCodeBlocks = () => {
  const blocks = editorRef.value?.querySelectorAll('.vditor-wysiwyg__block[data-type="code-block"]') || []
  blocks.forEach((block) => {
    highlightCodeBlock(block)
  })
}

const emitValue = (value) => {
  syncingFromEditor.value = true
  emit('update:modelValue', value)
  emit('change', value)
  nextTick(() => {
    syncingFromEditor.value = false
  })
}

const syncValueFromEditor = () => {
  if (!editor.value) return
  emitValue(editor.value.getValue())
}

const uploadImages = async (files) => {
  if (!files.length) return null

  try {
    const lines = []
    for (const file of files) {
      const res = await uploadFile(file, 'articles')
      lines.push(`![${file.name}](${res.data.url})`)
    }
    editor.value?.insertValue(`${lines.join('\n')}\n`)
    ElMessage.success('图片上传成功')
    return null
  } catch (error) {
    const message = error.message || '未知错误'
    ElMessage.error(`图片上传失败：${message}`)
    return message
  }
}

const initEditor = () => {
  if (!editorRef.value) return

  editor.value = new Vditor(editorRef.value, {
    value: props.modelValue,
    mode: 'wysiwyg',
    lang: 'zh_CN',
    icon: 'ant',
    height: props.height,
    minHeight: 560,
    width: '100%',
    placeholder: props.placeholder,
    cdn: vditorCdn,
    cache: {
      enable: false
    },
    toolbar,
    toolbarConfig: {
      pin: true
    },
    counter: {
      enable: true,
      type: 'text'
    },
    resize: {
      enable: true,
      position: 'bottom'
    },
    outline: {
      enable: true,
      position: 'right'
    },
    preview: {
      maxWidth: 920,
      mode: 'editor',
      markdown: {
        autoSpace: true,
        codeBlockPreview: false,
        footnotes: true,
        gfmAutoLink: true,
        mark: true,
        mathBlockPreview: true,
        toc: true
      },
      hljs: {
        enable: true,
        lineNumber: true,
        style: 'night-owl'
      },
      theme: {
        current: 'light'
      }
    },
    upload: {
      accept: 'image/*',
      multiple: true,
      max: 2 * 1024 * 1024,
      handler: uploadImages
    },
    customWysiwygToolbar: (type, element) => {
      if (type !== 'code-block' || element.querySelector('.code-popover-theme')) return

      const themeWrap = document.createElement('span')
      themeWrap.className = 'code-popover-theme vditor-tooltipped vditor-tooltipped__n'
      themeWrap.setAttribute('aria-label', '代码主题')

      const themeSelect = document.createElement('select')
      themeSelect.className = 'code-popover-theme__select'
      themeSelect.innerHTML = codeThemeOptions
        .map((item) => `<option value="${item.value}">${item.label}</option>`)
        .join('')
      themeSelect.value = codeToolbar.theme
      themeSelect.onchange = () => {
        codeToolbar.theme = themeSelect.value
        applyCodeTheme()
      }

      themeWrap.appendChild(themeSelect)
      element.insertAdjacentElement('beforeend', themeWrap)
    },
    input: emitValue,
    after: () => {
      ready.value = true
      editor.value?.setTheme('classic', 'light', codeToolbar.theme)
      bindCodeToolbarEvents()
      highlightAllCodeBlocks()
      scheduleCodeToolbarUpdate()
    }
  })
}

const updateCodeToolbar = () => {
  if (!shellRef.value || !editorRef.value) return

  const toolbarHasFocus = codeToolbarRef.value?.contains(document.activeElement)
  const selection = document.getSelection()
  const selectionBlock = selection?.rangeCount ? findCodeBlock(selection.anchorNode) : null
  const block = toolbarHasFocus ? activeCodeBlock.value : selectionBlock

  if (!block) {
    setActiveCodeBlock(null)
    codeToolbar.visible = false
    return
  }

  const codeElement = getCodeElement(block)
  const shellRect = shellRef.value.getBoundingClientRect()
  const blockRect = block.getBoundingClientRect()

  setActiveCodeBlock(block)
  codeToolbar.language = getCodeLanguage(codeElement)
  codeToolbar.top = Math.max(0, blockRect.top - shellRect.top)
  codeToolbar.left = Math.max(0, blockRect.left - shellRect.left)
  codeToolbar.width = Math.max(260, blockRect.width)
  codeToolbar.visible = true
}

const scheduleCodeToolbarUpdate = () => {
  if (codeToolbarFrame) return
  codeToolbarFrame = window.requestAnimationFrame(() => {
    codeToolbarFrame = 0
    updateCodeToolbar()
  })
}

const bindCodeToolbarEvents = () => {
  const wysiwygElement = editor.value?.vditor?.wysiwyg?.element
  const scrollElement = wysiwygElement?.parentElement
  const targets = [
    [wysiwygElement, 'keyup'],
    [wysiwygElement, 'mouseup'],
    [wysiwygElement, 'click'],
    [scrollElement, 'scroll'],
    [window, 'resize'],
    [document, 'selectionchange']
  ]

  targets.forEach(([target, eventName]) => {
    if (!target) return
    target.addEventListener(eventName, scheduleCodeToolbarUpdate)
    codeToolbarCleanups.push(() => target.removeEventListener(eventName, scheduleCodeToolbarUpdate))
  })

  const handleEditorInput = () => {
    scheduleCodeToolbarUpdate()
    scheduleActiveCodeHighlight()
  }

  wysiwygElement?.addEventListener('input', handleEditorInput)
  codeToolbarCleanups.push(() => wysiwygElement?.removeEventListener('input', handleEditorInput))
}

const scheduleActiveCodeHighlight = () => {
  if (activeCodeHighlightTimer) {
    window.clearTimeout(activeCodeHighlightTimer)
  }

  activeCodeHighlightTimer = window.setTimeout(() => {
    activeCodeHighlightTimer = 0
    if (activeCodeBlock.value) {
      highlightCodeBlock(activeCodeBlock.value, true)
    }
  }, 260)
}

const applyCodeLanguage = () => {
  const codeElement = getCodeElement()
  if (!codeElement) return

  codeElement.className = codeElement.className
    .split(/\s+/)
    .filter((item) => item && !item.startsWith('language-'))
    .join(' ')

  if (codeToolbar.language) {
    codeElement.classList.add(`language-${codeToolbar.language}`)
  }

  highlightCodeBlock(activeCodeBlock.value, true).then(() => {
    syncValueFromEditor()
    editor.value?.focus()
    scheduleCodeToolbarUpdate()
  })
}

const applyCodeTheme = () => {
  editor.value?.setTheme('classic', 'light', codeToolbar.theme)
  highlightAllCodeBlocks()
  scheduleCodeToolbarUpdate()
}

const copyActiveCode = async () => {
  const codeElement = getCodeElement()
  const text = codeElement?.innerText || ''
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('代码已复制')
  } catch (error) {
    ElMessage.error('复制失败，请手动选择代码复制')
  }
}

const deleteActiveCode = () => {
  if (!activeCodeBlock.value) return
  activeCodeBlock.value.remove()
  setActiveCodeBlock(null)
  codeToolbar.visible = false
  syncValueFromEditor()
  editor.value?.focus()
}

watch(
  () => props.modelValue,
  (value) => {
    if (!ready.value || !editor.value || syncingFromEditor.value) return
    if (value !== editor.value.getValue()) {
      editor.value.setValue(value || '', true)
      nextTick(() => {
        highlightAllCodeBlocks()
        scheduleCodeToolbarUpdate()
      })
    }
  }
)

onMounted(initEditor)

onBeforeUnmount(() => {
  ready.value = false
  codeToolbarCleanups.splice(0).forEach((cleanup) => cleanup())
  if (codeToolbarFrame) {
    window.cancelAnimationFrame(codeToolbarFrame)
    codeToolbarFrame = 0
  }
  if (activeCodeHighlightTimer) {
    window.clearTimeout(activeCodeHighlightTimer)
    activeCodeHighlightTimer = 0
  }
  setActiveCodeBlock(null)
  editor.value?.destroy()
  editor.value = null
})
</script>

<style scoped>
.vditor-editor {
  position: relative;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: #fff;
  box-shadow: var(--admin-shadow-sm);
  --code-bg: #011627;
  --code-panel: #061627;
  --code-border: rgba(125, 211, 252, 0.18);
  --code-border-strong: rgba(125, 211, 252, 0.5);
  --code-text: #d6deeb;
  --code-muted: rgba(214, 222, 235, 0.62);
  --code-accent: #7fdbca;
  --code-control-bg: rgba(15, 35, 59, 0.95);
  --code-control-border: rgba(125, 211, 252, 0.24);
  --code-button-bg: rgba(125, 211, 252, 0.1);
  --code-danger: #fecaca;
  --code-danger-bg: rgba(248, 113, 113, 0.1);
  --code-shadow: rgba(2, 6, 23, 0.22);
}

.vditor-editor[data-code-theme="github-dark"] {
  --code-bg: #0d1117;
  --code-panel: #161b22;
  --code-border: rgba(88, 166, 255, 0.22);
  --code-border-strong: rgba(88, 166, 255, 0.58);
  --code-text: #c9d1d9;
  --code-muted: rgba(201, 209, 217, 0.65);
  --code-accent: #58a6ff;
  --code-control-bg: rgba(33, 38, 45, 0.98);
  --code-control-border: rgba(139, 148, 158, 0.3);
  --code-button-bg: rgba(88, 166, 255, 0.12);
}

.vditor-editor[data-code-theme="tokyo-night-dark"] {
  --code-bg: #1a1b26;
  --code-panel: #16161e;
  --code-border: rgba(122, 162, 247, 0.24);
  --code-border-strong: rgba(122, 162, 247, 0.58);
  --code-text: #c0caf5;
  --code-muted: rgba(192, 202, 245, 0.66);
  --code-accent: #7dcfff;
  --code-control-bg: rgba(36, 40, 59, 0.98);
  --code-control-border: rgba(122, 162, 247, 0.28);
  --code-button-bg: rgba(122, 162, 247, 0.12);
}

.vditor-editor[data-code-theme="atom-one-dark"] {
  --code-bg: #282c34;
  --code-panel: #21252b;
  --code-border: rgba(97, 175, 239, 0.22);
  --code-border-strong: rgba(97, 175, 239, 0.56);
  --code-text: #abb2bf;
  --code-muted: rgba(171, 178, 191, 0.66);
  --code-accent: #61afef;
  --code-control-bg: rgba(40, 44, 52, 0.98);
  --code-control-border: rgba(97, 175, 239, 0.28);
  --code-button-bg: rgba(97, 175, 239, 0.12);
}

.vditor-editor[data-code-theme="github"] {
  --code-bg: #f6f8fa;
  --code-panel: #ffffff;
  --code-border: rgba(31, 35, 40, 0.16);
  --code-border-strong: rgba(9, 105, 218, 0.55);
  --code-text: #24292f;
  --code-muted: rgba(87, 96, 106, 0.76);
  --code-accent: #0969da;
  --code-control-bg: #f6f8fa;
  --code-control-border: rgba(31, 35, 40, 0.18);
  --code-button-bg: rgba(9, 105, 218, 0.08);
  --code-danger: #cf222e;
  --code-danger-bg: rgba(207, 34, 46, 0.08);
  --code-shadow: rgba(31, 35, 40, 0.14);
}

.vditor-host {
  width: 100%;
}

.vditor-editor :deep(.vditor) {
  border: 0;
  --toolbar-height: 48px;
}

.vditor-editor :deep(.vditor-toolbar) {
  min-height: var(--toolbar-height);
  padding: 7px 10px;
  border-bottom: 1px solid var(--admin-border);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
}

.vditor-editor :deep(.vditor-toolbar__item) {
  margin: 0 2px;
}

.vditor-editor :deep(.vditor-toolbar__item button) {
  border-radius: 7px;
  color: var(--admin-text);
}

.vditor-editor :deep(.vditor-toolbar__item button:hover) {
  background: var(--admin-surface-soft);
}

.vditor-editor :deep(.vditor-reset) {
  color: var(--admin-text);
  font-family:
    "Inter",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    Arial,
    sans-serif;
  line-height: 1.85;
}

.vditor-editor :deep(.vditor-reset h1),
.vditor-editor :deep(.vditor-reset h2),
.vditor-editor :deep(.vditor-reset h3),
.vditor-editor :deep(.vditor-reset h4) {
  color: var(--admin-heading);
  font-weight: 840;
  letter-spacing: 0;
}

.vditor-editor :deep(.vditor-reset table) {
  overflow: visible;
  border-radius: var(--admin-radius);
}

.vditor-editor :deep(.vditor-outline) {
  border-left: 1px solid var(--admin-border);
  background: rgba(248, 250, 252, 0.78);
}

.vditor-editor :deep(.vditor-outline__title) {
  color: var(--admin-heading);
  font-weight: 840;
}

.vditor-editor :deep(.vditor-counter) {
  color: var(--admin-muted);
}

.code-block-toolbar {
  position: absolute;
  z-index: 12;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 7px 12px;
  border: 1px solid var(--code-border);
  border-radius: 12px 12px 0 0;
  background: var(--code-panel);
  box-shadow: 0 14px 28px var(--code-shadow);
  color: var(--code-text);
}

.code-block-toolbar__group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.code-block-toolbar__label {
  color: var(--code-accent);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.code-block-toolbar__select {
  height: 28px;
  max-width: 132px;
  border: 1px solid var(--code-control-border);
  border-radius: 7px;
  outline: 0;
  background: var(--code-control-bg);
  color: var(--code-text);
  font-size: 12px;
}

.code-block-toolbar__button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--code-control-border);
  border-radius: 7px;
  background: var(--code-button-bg);
  color: var(--code-text);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.code-block-toolbar__button:hover {
  border-color: var(--code-border-strong);
  background: var(--code-button-bg);
}

.code-block-toolbar__button.is-danger {
  border-color: var(--code-danger);
  background: var(--code-danger-bg);
  color: var(--code-danger);
}

.vditor-editor :deep(.vditor-wysiwyg__block[data-type="code-block"]) {
  position: relative;
  overflow: hidden;
  margin: 22px 0 24px;
  border: 1px solid var(--code-border);
  border-radius: 12px;
  background: var(--code-bg);
  box-shadow: 0 18px 40px var(--code-shadow);
}

.vditor-editor :deep(.vditor-wysiwyg__block[data-type="code-block"][data-code-active="true"]) {
  border-color: var(--code-border-strong);
  box-shadow:
    0 0 0 3px rgba(14, 165, 233, 0.12),
    0 18px 40px var(--code-shadow);
}

.vditor-editor :deep(.vditor-wysiwyg__block[data-type="code-block"]::before) {
  content: none;
}

.vditor-editor :deep(.vditor-wysiwyg__block[data-type="code-block"]::after) {
  position: absolute;
  inset: 0 0 auto;
  z-index: 1;
  height: 42px;
  padding-left: 16px;
  border-bottom: 1px solid var(--code-border);
  background: var(--code-panel);
  color: var(--code-muted);
  content: "CODE";
  font-family:
    "Inter",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    Arial,
    sans-serif;
  font-size: 12px;
  font-weight: 800;
  line-height: 42px;
  letter-spacing: 0;
  pointer-events: none;
}

.vditor-editor :deep(.vditor-wysiwyg__block[data-type="code-block"] > pre:first-child) {
  display: block !important;
  min-height: 136px;
  margin: 0 !important;
  padding: 58px 22px 22px !important;
  overflow-x: auto;
  background: var(--code-bg) !important;
  color: var(--code-text) !important;
  white-space: pre-wrap;
}

.vditor-editor :deep(.vditor-wysiwyg__block[data-type="code-block"] > pre:first-child code) {
  display: block;
  min-height: 64px;
  color: var(--code-text) !important;
  caret-color: var(--code-accent);
  font-family:
    "JetBrains Mono",
    "SFMono-Regular",
    Consolas,
    "Liberation Mono",
    Menlo,
    monospace;
  font-size: 14px;
  line-height: 1.72;
  tab-size: 2;
}

.vditor-editor :deep(.vditor-wysiwyg__block[data-type="code-block"] > pre:first-child code.hljs) {
  background: transparent !important;
}

.vditor-editor :deep(.vditor-wysiwyg__block[data-type="code-block"] > .vditor-wysiwyg__preview) {
  display: none !important;
}

.vditor-editor :deep(.code-popover-theme) {
  display: inline-flex;
  float: left;
  height: 21px;
  padding: 0 5px;
  align-items: center;
}

.vditor-editor :deep(.code-popover-theme__select) {
  width: 112px;
  height: 21px;
  border: 0;
  border-radius: 4px;
  background: var(--toolbar-background-color);
  color: var(--textarea-text-color);
  font-size: 12px;
  outline: 0;
}

@media (max-width: 860px) {
  .code-block-toolbar {
    gap: 6px;
    overflow-x: auto;
    padding: 7px 8px;
  }

  .code-block-toolbar__label {
    display: none;
  }

  .code-block-toolbar__select {
    max-width: 112px;
  }
}
</style>
