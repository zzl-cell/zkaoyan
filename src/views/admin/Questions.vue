<template>
  <div class="admin-questions">
    <van-nav-bar title="题目管理" left-arrow @click-left="router.back()">
      <template #right>
        <van-icon name="plus" size="20" @click="showCreate = true" style="margin-right: 12px;" />
        <van-icon name="upgrade" size="20" @click="showImport = true" />
      </template>
    </van-nav-bar>

    <!-- Filters -->
    <div class="filter-bar">
      <van-field v-model="keyword" placeholder="搜索题目内容..." clearable size="small" @clear="onSearch" @keydown.enter="onSearch">
        <template #button><van-button size="small" type="primary" @click="onSearch">搜索</van-button></template>
      </van-field>
      <div class="filter-row">
        <van-dropdown-menu>
          <van-dropdown-item v-model="filterType" :options="typeOptions" @change="onSearch" />
        </van-dropdown-menu>
      </div>
    </div>

    <!-- Question list -->
    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadQuestions">
      <van-swipe-cell v-for="q in questions" :key="q.question_id">
        <van-cell :title="truncatedStem(q.stem)" :label="questionLabel(q)">
          <template #value>
            <van-tag :type="typeTag(q.question_type)" size="small">{{ typeText(q.question_type) }}</van-tag>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="primary" text="详情" @click="onDetail(q)" />
          <van-button square type="warning" text="编辑" @click="onEdit(q)" />
          <van-button square type="danger" text="删除" @click="onDelete(q)" />
        </template>
      </van-swipe-cell>
    </van-list>

    <!-- Detail popup -->
    <van-popup v-model:show="showDetail" position="bottom" round style="max-height: 80vh;">
      <div class="detail-popup" v-if="detailItem">
        <div class="detail-header">
          <van-tag :type="typeTag(detailItem.question_type)">{{ typeText(detailItem.question_type) }}</van-tag>
          <van-tag plain>{{ detailItem.difficulty }}</van-tag>
        </div>
        <div class="detail-stem">{{ detailItem.stem }}</div>
        <div class="detail-options">
          <div v-for="opt in parseOptions(detailItem.options)" :key="opt.label" class="detail-opt">
            <span class="opt-label" :class="{ 'opt-correct': isCorrect(opt.label, detailItem.answer) }">{{ opt.label }}.</span>
            {{ opt.content }}
          </div>
        </div>
        <div class="detail-section"><strong>答案：</strong>{{ formatAnswer(detailItem.answer) }}</div>
        <div v-if="detailItem.explanation" class="detail-section"><strong>解析：</strong>{{ detailItem.explanation }}</div>
        <div class="detail-section"><strong>知识点：</strong>{{ detailItem.knowledge_path || detailItem.knowledge_id || '无' }}</div>
        <van-button block plain style="margin-top: 12px;" @click="showDetail = false">关闭</van-button>
      </div>
    </van-popup>

    <!-- Create/Edit dialog -->
    <van-popup v-model:show="showCreate" position="bottom" round style="max-height: 85vh;">
      <div class="form-popup">
        <div class="form-title">{{ editingId ? '编辑题目' : '新增题目' }}</div>
        <van-field v-model="form.stem" type="textarea" label="题干" placeholder="题目内容" rows="3" />
        <van-field v-model="form.question_type" label="题型" is-link readonly @click="showTypePicker = true" />
        <van-field v-model="form.difficulty" label="难度" is-link readonly @click="showDiffPicker = true" />
        <div class="options-editor">
          <div class="options-header">
            <span>选项</span>
            <van-button size="mini" plain type="primary" @click="addOption">+ 添加</van-button>
          </div>
          <div v-for="(opt, idx) in form.options" :key="idx" class="option-row">
            <van-field v-model="opt.content" :placeholder="'选项 ' + opt.label" size="small" />
            <van-button size="mini" plain type="danger" @click="removeOption(idx)" v-if="form.options.length > 2">删</van-button>
          </div>
        </div>
        <van-field v-model="form.answer" label="答案" :placeholder="answerPlaceholder" />
        <van-field v-model="form.explanation" type="textarea" label="解析" placeholder="答案解析（可选）" rows="2" />
        <van-field v-model="form.knowledge_id" label="知识点ID" placeholder="knowledge_id（可选）" />
        <van-button block type="primary" style="margin-top: 12px;" :loading="submitting" @click="onSubmit">
          {{ editingId ? '保存' : '创建' }}
        </van-button>
      </div>
    </van-popup>

    <!-- Import dialog -->
    <van-popup v-model:show="showImport" position="bottom" round style="max-height: 80vh;">
      <div class="form-popup">
        <div class="form-title">批量导入</div>
        <van-field v-model="importJson" type="textarea" label="JSON数据" placeholder='[{"stem":"题目","options":[{"label":"A","content":"选项A"}],"answer":"A","question_type":"single"}]' rows="10" />
        <div style="font-size: 12px; color: #999; padding: 0 16px;">支持字段：stem, options, answer, explanation, question_type, difficulty, knowledge_id</div>
        <van-button block type="primary" style="margin-top: 12px;" :loading="importing" @click="onImport">导入</van-button>
      </div>
    </van-popup>

    <!-- Type picker -->
    <van-popup v-model:show="showTypePicker" position="bottom" round>
      <van-picker :columns="['single','multi','judge']" @confirm="onTypeConfirm" @cancel="showTypePicker = false" />
    </van-popup>

    <!-- Difficulty picker -->
    <van-popup v-model:show="showDiffPicker" position="bottom" round>
      <van-picker :columns="['easy','medium','hard']" @confirm="onDiffConfirm" @cancel="showDiffPicker = false" />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '../../api/request'

const router = useRouter()

const questions = ref([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const keyword = ref('')
const filterType = ref('')

const typeOptions = [
  { text: '全部题型', value: '' },
  { text: '单选题', value: 'single' },
  { text: '多选题', value: 'multi' },
  { text: '判断题', value: 'judge' },
]

const showDetail = ref(false)
const detailItem = ref(null)
const showCreate = ref(false)
const editingId = ref('')
const submitting = ref(false)
const showImport = ref(false)
const importJson = ref('')
const importing = ref(false)
const showTypePicker = ref(false)
const showDiffPicker = ref(false)

const form = ref({
  stem: '',
  question_type: 'single',
  difficulty: 'medium',
  options: [
    { label: 'A', content: '' },
    { label: 'B', content: '' },
    { label: 'C', content: '' },
    { label: 'D', content: '' },
  ],
  answer: '',
  explanation: '',
  knowledge_id: '',
})

const answerPlaceholder = computed(() => {
  if (form.value.question_type === 'multi') return '多选用逗号分隔，如 A,B,C'
  if (form.value.question_type === 'judge') return '填 A（对）或 B（错）'
  return '如 A'
})

function resetForm() {
  editingId.value = ''
  form.value = {
    stem: '',
    question_type: 'single',
    difficulty: 'medium',
    options: [
      { label: 'A', content: '' },
      { label: 'B', content: '' },
      { label: 'C', content: '' },
      { label: 'D', content: '' },
    ],
    answer: '',
    explanation: '',
    knowledge_id: '',
  }
}

function addOption() {
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const nextLabel = labels[form.value.options.length]
  if (nextLabel) form.value.options.push({ label: nextLabel, content: '' })
}

function removeOption(idx) {
  form.value.options.splice(idx, 1)
  // Re-label
  const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  form.value.options.forEach((o, i) => { o.label = labels[i] })
}

function onTypeConfirm({ selectedValues }) {
  form.value.question_type = selectedValues[0]
  showTypePicker.value = false
}

function onDiffConfirm({ selectedValues }) {
  form.value.difficulty = selectedValues[0]
  showDiffPicker.value = false
}

function truncatedStem(stem) {
  if (!stem) return ''
  return stem.length > 40 ? stem.slice(0, 40) + '...' : stem
}

function questionLabel(q) {
  const parts = []
  if (q.knowledge_id) parts.push(q.knowledge_id)
  parts.push(q.created_at?.slice(0, 10) || '')
  return parts.join(' · ')
}

function typeText(t) {
  return { single: '单选', multi: '多选', judge: '判断' }[t] || t
}

function typeTag(t) {
  return { single: 'primary', multi: 'warning', judge: 'success' }[t] || 'default'
}

function parseOptions(opts) {
  if (Array.isArray(opts)) return opts
  try { return JSON.parse(opts) } catch { return [] }
}

function isCorrect(label, answer) {
  if (Array.isArray(answer)) return answer.includes(label)
  return String(answer).includes(label)
}

function formatAnswer(answer) {
  if (Array.isArray(answer)) return answer.join(', ')
  return String(answer)
}

async function onSearch() {
  page.value = 1
  finished.value = false
  questions.value = []
  await loadQuestions()
}

async function loadQuestions() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: 20 }
    if (keyword.value) params.keyword = keyword.value
    if (filterType.value) params.question_type = filterType.value
    const res = await request.get('/admin/questions', { params })
    const list = res.data.list || []
    if (page.value === 1) questions.value = list
    else questions.value.push(...list)
    if (list.length < 20) finished.value = true
    page.value++
  } catch {} finally { loading.value = false }
}

async function onDetail(q) {
  try {
    const res = await request.get('/admin/questions_detail', { params: { id: q.question_id } })
    detailItem.value = res.data
    showDetail.value = true
  } catch {}
}

function onEdit(q) {
  editingId.value = q.question_id
  const opts = parseOptions(q.options)
  form.value = {
    stem: q.stem || '',
    question_type: q.question_type || 'single',
    difficulty: q.difficulty || 'medium',
    options: opts.length >= 2 ? opts : [{ label: 'A', content: '' }, { label: 'B', content: '' }],
    answer: Array.isArray(q.answer) ? q.answer.join(',') : String(q.answer || ''),
    explanation: q.explanation || '',
    knowledge_id: q.knowledge_id || '',
  }
  showCreate.value = true
}

async function onDelete(q) {
  try {
    await showConfirmDialog({ title: '确认删除', message: `删除题目：${truncatedStem(q.stem)}` })
    await request.post('/admin/questions_delete', { question_id: q.question_id })
    showToast('已删除')
    questions.value = questions.value.filter(item => item.question_id !== q.question_id)
  } catch {}
}

async function onSubmit() {
  if (!form.value.stem.trim()) return showToast('请填写题干')
  const validOpts = form.value.options.filter(o => o.content.trim())
  if (validOpts.length < 2) return showToast('至少填写2个选项')
  if (!form.value.answer.trim()) return showToast('请填写答案')

  submitting.value = true
  try {
    const payload = {
      ...form.value,
      options: form.value.options.filter(o => o.content.trim()),
    }
    if (editingId.value) {
      payload.question_id = editingId.value
      await request.post('/admin/questions_update', payload)
      showToast('更新成功')
    } else {
      await request.post('/admin/questions_create', payload)
      showToast('创建成功')
    }
    showCreate.value = false
    resetForm()
    page.value = 1; finished.value = false; questions.value = []
    loadQuestions()
  } catch (err) {
    showToast(err.message || '操作失败')
  } finally { submitting.value = false }
}

async function onImport() {
  if (!importJson.value.trim()) return showToast('请粘贴JSON数据')
  let parsed
  try {
    parsed = JSON.parse(importJson.value)
  } catch {
    return showToast('JSON格式错误')
  }
  if (!Array.isArray(parsed)) return showToast('请提供JSON数组')

  importing.value = true
  try {
    const res = await request.post('/admin/questions_batch_import', { questions: parsed })
    showToast(`导入成功：${res.data.imported}/${res.data.total}条`)
    if (res.data.errors?.length) {
      console.warn('Import errors:', res.data.errors)
    }
    showImport.value = false
    importJson.value = ''
    page.value = 1; finished.value = false; questions.value = []
    loadQuestions()
  } catch (err) {
    showToast(err.message || '导入失败')
  } finally { importing.value = false }
}
</script>

<style scoped>
.admin-questions { min-height: 100vh; background: #f7f8fa; }
.filter-bar { padding: 8px 16px; background: #fff; }
.filter-row { display: flex; gap: 8px; margin-top: 8px; }
.detail-popup { padding: 16px; }
.detail-header { display: flex; gap: 8px; margin-bottom: 12px; }
.detail-stem { font-size: 15px; color: #333; line-height: 1.6; margin-bottom: 12px; }
.detail-options { margin-bottom: 12px; }
.detail-opt { padding: 6px 0; font-size: 14px; color: #555; }
.opt-label { font-weight: 500; margin-right: 4px; }
.opt-correct { color: #07c160; }
.detail-section { font-size: 13px; color: #666; margin-bottom: 8px; line-height: 1.5; }
.form-popup { padding: 16px; }
.form-title { font-size: 16px; font-weight: 500; margin-bottom: 12px; }
.options-editor { padding: 0 16px; }
.options-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 14px; color: #646566; }
.option-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
</style>
