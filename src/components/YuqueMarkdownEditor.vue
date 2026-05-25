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
let activeCodeNormalizeTimer = 0
let tableEnhanceFrame = 0

const vditorCdn = 'https://cdn.jsdelivr.net/npm/vditor@3.11.2'
const tableWidthCommentRegex = /^<!--\s*leaf-table-widths:([0-9.,\s]+)\s*-->$/
const tableMinColumnWidth = 64

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

const parseTableWidths = (value) =>
  String(value || '')
    .split(',')
    .map((item) => Math.round(Number(item.trim())))
    .filter((item) => Number.isFinite(item) && item >= tableMinColumnWidth)

const formatTableWidthComment = (widths) => `<!-- leaf-table-widths:${widths.map((item) => Math.round(item)).join(',')} -->`

const stripTableWidthComments = (markdown = '') =>
  markdown
    .split(/\r?\n/)
    .filter((line) => !tableWidthCommentRegex.test(line.trim()))
    .join('\n')

const isFenceLine = (line) => line.match(/^\s*(`{3,}|~{3,})/)

const isTableSeparatorLine = (line) => {
  const trimmed = line.trim()
  if (!trimmed.includes('|')) return false

  const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|')
  return cells.length > 1 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell))
}

const isTableRowLine = (line) => {
  const trimmed = line.trim()
  return Boolean(trimmed && trimmed.includes('|') && !tableWidthCommentRegex.test(trimmed))
}

const getTableWidthMetaList = (markdown = '') => {
  const lines = markdown.split(/\r?\n/)
  const metaList = []
  let inFence = false
  let fenceMarker = ''

  for (let index = 0; index < lines.length; index += 1) {
    const fenceMatch = isFenceLine(lines[index])
    if (fenceMatch) {
      const marker = fenceMatch[1]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      } else if (marker[0] === fenceMarker[0] && marker.length >= fenceMarker.length) {
        inFence = false
        fenceMarker = ''
      }
      continue
    }

    if (inFence) continue

    if (isTableRowLine(lines[index]) && isTableSeparatorLine(lines[index + 1] || '')) {
      let tableEnd = index + 2
      while (tableEnd < lines.length && isTableRowLine(lines[tableEnd])) {
        tableEnd += 1
      }

      const commentMatch = lines[tableEnd]?.trim().match(tableWidthCommentRegex)
      metaList.push(commentMatch ? parseTableWidths(commentMatch[1]) : null)
      index = tableEnd - 1
    }
  }

  return metaList
}

const appendTableWidthComments = (markdown = '', metaList = []) => {
  const lines = stripTableWidthComments(markdown).split(/\r?\n/)
  const output = []
  let tableIndex = 0
  let inFence = false
  let fenceMarker = ''

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const fenceMatch = isFenceLine(line)
    if (fenceMatch) {
      const marker = fenceMatch[1]
      if (!inFence) {
        inFence = true
        fenceMarker = marker
      } else if (marker[0] === fenceMarker[0] && marker.length >= fenceMarker.length) {
        inFence = false
        fenceMarker = ''
      }
      output.push(line)
      continue
    }

    if (!inFence && isTableRowLine(line) && isTableSeparatorLine(lines[index + 1] || '')) {
      output.push(line, lines[index + 1])
      index += 2

      while (index < lines.length && isTableRowLine(lines[index])) {
        output.push(lines[index])
        index += 1
      }

      const widths = metaList[tableIndex]
      if (Array.isArray(widths) && widths.length > 0) {
        output.push(formatTableWidthComment(widths))
      }
      tableIndex += 1
      index -= 1
      continue
    }

    output.push(line)
  }

  return output.join('\n')
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

const decorateCodeBlock = (block) => {
  const codeElement = getCodeElement(block)
  if (!codeElement) return

  const language = getCodeLanguage(codeElement)
  const nextClassNames = ['hljs']

  if (language) {
    nextClassNames.push(`language-${language}`)
  }

  codeElement.className = nextClassNames.join(' ')
  block.setAttribute('data-code-language', language ? language.toUpperCase() : 'TEXT')
}

const decorateAllCodeBlocks = () => {
  const blocks = editorRef.value?.querySelectorAll('.vditor-wysiwyg__block[data-type="code-block"]') || []

  blocks.forEach((block) => {
    decorateCodeBlock(block)
  })
}

const getEditableTables = (root = editor.value?.vditor?.wysiwyg?.element) => {
  if (!root) return []

  return Array.from(root.querySelectorAll('table')).filter(
    (table) => !table.closest('.vditor-wysiwyg__preview')
  )
}

const getTableColumnCount = (table) => {
  const rows = Array.from(table.rows || [])
  return rows.reduce((max, row) => Math.max(max, row.cells.length), 0)
}

const getMeasuredColumnWidths = (table) => {
  const firstRow = table.rows?.[0]
  if (!firstRow) return []

  return Array.from(firstRow.cells).map((cell) =>
    Math.max(tableMinColumnWidth, Math.round(cell.getBoundingClientRect().width || tableMinColumnWidth))
  )
}

const getTableWidths = (table) => {
  const storedWidths = parseTableWidths(table.dataset.leafColumnWidths)
  if (storedWidths.length) return storedWidths
  return getMeasuredColumnWidths(table)
}

const applyTableColumnWidths = (table, widths, custom = true) => {
  const columnCount = getTableColumnCount(table)
  if (!columnCount) return

  const nextWidths = Array.from({ length: columnCount }, (_, index) =>
    Math.max(tableMinColumnWidth, Math.round(widths[index] || tableMinColumnWidth))
  )

  let colgroup = table.querySelector(':scope > colgroup')
  if (!colgroup) {
    colgroup = document.createElement('colgroup')
    table.insertBefore(colgroup, table.firstChild)
  }

  while (colgroup.children.length < columnCount) {
    colgroup.appendChild(document.createElement('col'))
  }
  while (colgroup.children.length > columnCount) {
    colgroup.lastElementChild.remove()
  }

  nextWidths.forEach((width, index) => {
    colgroup.children[index].style.width = `${width}px`
  })

  table.classList.add('leaf-resizable-table')
  table.dataset.leafColumnWidths = nextWidths.join(',')
  if (custom) {
    table.dataset.leafTableCustom = 'true'
  }
  table.style.tableLayout = 'fixed'
  table.style.width = `${nextWidths.reduce((sum, width) => sum + width, 0)}px`
}

const removeTableResizeHandles = (root) => {
  root?.querySelectorAll?.('.leaf-table-resize-handle').forEach((handle) => handle.remove())
}

const cleanupTableResizeArtifacts = (root) => {
  removeTableResizeHandles(root)
  getEditableTables(root).forEach((table) => {
    table.querySelector(':scope > colgroup')?.remove()
    table.classList.remove('leaf-resizable-table')
    table.removeAttribute('data-leaf-column-widths')
    table.removeAttribute('data-leaf-table-custom')
    table.style.removeProperty('table-layout')
    table.style.removeProperty('width')
  })
}

const cleanupCodeBlockArtifacts = (root) => {
  root?.querySelectorAll?.('.code-popover-theme').forEach((element) => element.remove())
  root?.querySelectorAll?.('.vditor-wysiwyg__block[data-type="code-block"]').forEach((block) => {
    block.removeAttribute('data-code-active')
    block.removeAttribute('data-code-language')
  })
  root?.querySelectorAll?.('pre > code.hljs').forEach((codeElement) => {
    const language = getCodeLanguage(codeElement)
    codeElement.className = language ? `language-${language}` : ''
  })
}

const startTableColumnResize = (event, table, columnIndex) => {
  event.preventDefault()
  event.stopPropagation()

  const startX = event.clientX
  const widths = getTableWidths(table)
  const startWidth = widths[columnIndex] || tableMinColumnWidth

  table.dataset.leafTableCustom = 'true'
  document.body.classList.add('leaf-table-resizing')

  const handleMouseMove = (moveEvent) => {
    const nextWidths = [...widths]
    nextWidths[columnIndex] = Math.max(tableMinColumnWidth, startWidth + moveEvent.clientX - startX)
    applyTableColumnWidths(table, nextWidths, true)
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.classList.remove('leaf-table-resizing')
    scheduleTableEnhance()
    syncValueFromEditor()
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const enhanceTable = (table) => {
  const columnCount = getTableColumnCount(table)
  if (!columnCount) return

  table.classList.add('leaf-resizable-table')
  removeTableResizeHandles(table)

  const firstRow = table.rows?.[0]
  if (!firstRow) return

  Array.from(firstRow.cells).forEach((cell, index) => {
    if (index >= columnCount - 1) return

    const handle = document.createElement('span')
    handle.className = 'leaf-table-resize-handle'
    handle.setAttribute('contenteditable', 'false')
    handle.setAttribute('aria-hidden', 'true')
    handle.addEventListener('mousedown', (event) => startTableColumnResize(event, table, index))
    cell.appendChild(handle)
  })
}

const enhanceAllTables = () => {
  getEditableTables().forEach((table) => {
    enhanceTable(table)
  })
}

const scheduleTableEnhance = () => {
  if (tableEnhanceFrame) return
  tableEnhanceFrame = window.requestAnimationFrame(() => {
    tableEnhanceFrame = 0
    enhanceAllTables()
  })
}

const applyStoredTableWidths = (markdown = props.modelValue) => {
  const metaList = getTableWidthMetaList(markdown || '')
  if (!metaList.length) {
    enhanceAllTables()
    return
  }

  getEditableTables().forEach((table, index) => {
    const widths = metaList[index]
    if (Array.isArray(widths) && widths.length > 0) {
      applyTableColumnWidths(table, widths, true)
    }
    enhanceTable(table)
  })
}

const collectTableWidthMeta = (root) =>
  getEditableTables(root).map((table) => {
    if (table.dataset.leafTableCustom !== 'true') return null

    const widths = parseTableWidths(table.dataset.leafColumnWidths)
    return widths.length ? widths : null
  })

const emitValue = (value) => {
  syncingFromEditor.value = true
  emit('update:modelValue', value)
  emit('change', value)
  nextTick(() => {
    syncingFromEditor.value = false
  })
}

const getSafeEditorValue = () => {
  if (!editor.value) return
  decorateAllCodeBlocks()

  const vditor = editor.value.vditor
  const wysiwygElement = vditor?.wysiwyg?.element
  if (!wysiwygElement || !vditor?.lute?.VditorDOM2Md) {
    return appendTableWidthComments(editor.value.getValue(), collectTableWidthMeta())
  }

  const clonedElement = wysiwygElement.cloneNode(true)
  const tableMetaList = collectTableWidthMeta(clonedElement)
  cleanupTableResizeArtifacts(clonedElement)
  cleanupCodeBlockArtifacts(clonedElement)

  return appendTableWidthComments(vditor.lute.VditorDOM2Md(clonedElement.innerHTML), tableMetaList)
}

const syncValueFromEditor = () => {
  const value = getSafeEditorValue()
  if (typeof value === 'string') {
    emitValue(value)
  }
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
    value: stripTableWidthComments(props.modelValue),
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
    input: syncValueFromEditor,
    after: () => {
      ready.value = true
      editor.value?.setTheme('classic', 'light', codeToolbar.theme)
      bindCodeToolbarEvents()
      decorateAllCodeBlocks()
      applyStoredTableWidths(props.modelValue)
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

  const handleEditorStructureUpdate = () => {
    scheduleCodeToolbarUpdate()
    scheduleTableEnhance()
  }

  targets.forEach(([target, eventName]) => {
    if (!target) return
    target.addEventListener(eventName, handleEditorStructureUpdate)
    codeToolbarCleanups.push(() => target.removeEventListener(eventName, handleEditorStructureUpdate))
  })

  const handleEditorInput = () => {
    scheduleCodeToolbarUpdate()
    scheduleTableEnhance()
    scheduleActiveCodeNormalize()
  }

  wysiwygElement?.addEventListener('input', handleEditorInput)
  codeToolbarCleanups.push(() => wysiwygElement?.removeEventListener('input', handleEditorInput))
}

const scheduleActiveCodeNormalize = () => {
  if (activeCodeNormalizeTimer) {
    window.clearTimeout(activeCodeNormalizeTimer)
  }

  activeCodeNormalizeTimer = window.setTimeout(() => {
    activeCodeNormalizeTimer = 0
    if (activeCodeBlock.value) {
      decorateCodeBlock(activeCodeBlock.value)
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

  decorateCodeBlock(activeCodeBlock.value)
  syncValueFromEditor()
  editor.value?.focus()
  scheduleCodeToolbarUpdate()
}

const applyCodeTheme = () => {
  editor.value?.setTheme('classic', 'light', codeToolbar.theme)
  decorateAllCodeBlocks()
  scheduleCodeToolbarUpdate()
}

const copyActiveCode = async () => {
  const codeElement = getCodeElement()
  const text = codeElement?.innerText || codeElement?.textContent || ''
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
    if (stripTableWidthComments(value || '') !== editor.value.getValue()) {
      editor.value.setValue(stripTableWidthComments(value || ''), true)
      nextTick(() => {
        decorateAllCodeBlocks()
        applyStoredTableWidths(value)
        scheduleCodeToolbarUpdate()
      })
    }
  }
)

defineExpose({
  getValue: () => getSafeEditorValue(),
  sync: () => syncValueFromEditor()
})

onMounted(initEditor)

onBeforeUnmount(() => {
  ready.value = false
  codeToolbarCleanups.splice(0).forEach((cleanup) => cleanup())
  if (codeToolbarFrame) {
    window.cancelAnimationFrame(codeToolbarFrame)
    codeToolbarFrame = 0
  }
  if (tableEnhanceFrame) {
    window.cancelAnimationFrame(tableEnhanceFrame)
    tableEnhanceFrame = 0
  }
  if (activeCodeNormalizeTimer) {
    window.clearTimeout(activeCodeNormalizeTimer)
    activeCodeNormalizeTimer = 0
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

.vditor-editor :deep(.vditor-reset table.leaf-resizable-table) {
  max-width: none;
  border-collapse: collapse;
}

.vditor-editor :deep(.vditor-reset table.leaf-resizable-table th),
.vditor-editor :deep(.vditor-reset table.leaf-resizable-table td) {
  position: relative;
  min-width: 64px;
  vertical-align: top;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.vditor-editor :deep(.leaf-table-resize-handle) {
  position: absolute;
  top: 0;
  right: -5px;
  z-index: 8;
  width: 10px;
  height: 100%;
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.vditor-editor :deep(.leaf-table-resize-handle::after) {
  content: "";
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 4px;
  width: 2px;
  border-radius: 999px;
  background: transparent;
  transition: background 0.16s ease, box-shadow 0.16s ease;
}

.vditor-editor :deep(.leaf-table-resize-handle:hover::after) {
  background: var(--admin-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

:global(body.leaf-table-resizing),
:global(body.leaf-table-resizing *) {
  cursor: col-resize !important;
  user-select: none !important;
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
  content: attr(data-code-language);
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
