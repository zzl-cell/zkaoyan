<template>
  <div class="exam-page">
    <!-- Sprint mode: question nav bar -->
    <div v-if="isSprint" class="sprint-nav-bar">
      <div class="sprint-nav-scroll">
        <div
          v-for="i in total"
          :key="i"
          class="sprint-nav-cell"
          :class="{
            correct: sprintResults[String(i)] === true,
            wrong: sprintResults[String(i)] === false,
            current: i - 1 === currentIndex,
            answered: userAnswers[String(i)] && sprintResults[String(i)] === undefined,
          }"
          @click="goToQuestion(i - 1)"
        >
          {{ i }}
        </div>
      </div>
    </div>

    <!-- Top bar -->
    <van-nav-bar left-arrow @click-left="onBack">
      <template #title>{{ currentIndex + 1 }} / {{ total }}</template>
      <template #right>
        <van-icon
          :name="isFavorited ? 'star' : 'star-o'"
          :color="isFavorited ? '#ff976a' : '#999'"
          size="20"
          style="margin-right: 12px;"
          @click="toggleFavorite"
        />
        <span v-if="isMock && remainingSeconds > 0" class="timer">
          {{ formatTime(remainingSeconds) }}
        </span>
        <van-button v-if="isMock" size="small" type="danger" style="margin-left: 8px;" @click="onSubmit">
          交卷
        </van-button>
      </template>
    </van-nav-bar>

    <!-- Question area (with swipe + mouse drag) -->
    <div
      class="question-area"
      v-if="currentQuestion"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
      @mousedown="onMouseDown"
      @mouseup="onMouseUp"
    >
      <!-- Question type badge -->
      <van-tag :type="typeTagType" style="margin-bottom: 8px;">
        {{ typeLabel }}
      </van-tag>

      <!-- Prev/Next arrows (PC fallback) -->
      <div class="nav-arrows">
        <van-icon v-if="currentIndex > 0" name="arrow-left" size="24" class="nav-arrow nav-arrow-left" @click="prevQuestion" />
        <van-icon v-if="currentIndex < total - 1" name="arrow" size="24" class="nav-arrow nav-arrow-right" @click="nextQuestion" />
      </div>

      <!-- Stem -->
      <div class="stem">{{ currentQuestion.stem }}</div>

      <!-- ===== Sprint mode: instant feedback ===== -->
      <template v-if="isSprint">
        <!-- Single/Judge -->
        <van-cell-group v-if="!isMulti" inset :key="'sprint-single-' + currentIndex">
          <van-cell
            v-for="opt in currentQuestion.options"
            :key="opt.label"
            clickable
            @click="sprintSelectSingle(opt.label)"
            :class="sprintOptionClass(opt.label)"
          >
            <template #title>
              <span :class="sprintOptionTextClass(opt.label)">
                {{ opt.label }}. {{ opt.content }}
              </span>
            </template>
            <template #right-icon>
              <van-icon v-if="sprintShowFeedback && isSprintCorrectOption(opt.label)" name="passed" color="#43A047" size="20" />
              <van-icon v-else-if="sprintShowFeedback && isSprintWrongSelected(opt.label)" name="close" color="#E53935" size="20" />
              <van-radio v-else :name="opt.label" :model-value="selectedSingle" />
            </template>
          </van-cell>
        </van-cell-group>

        <!-- Multi -->
        <van-cell-group v-else inset :key="'sprint-multi-' + currentIndex">
          <van-cell
            v-for="opt in currentQuestion.options"
            :key="opt.label"
            clickable
            @click="sprintToggleMulti(opt.label)"
            :class="sprintOptionClass(opt.label)"
          >
            <template #title>
              <span :class="sprintOptionTextClass(opt.label)">
                {{ opt.label }}. {{ opt.content }}
              </span>
            </template>
            <template #right-icon>
              <van-icon v-if="sprintShowFeedback && isSprintCorrectOption(opt.label)" name="passed" color="#43A047" size="20" />
              <van-icon v-else-if="sprintShowFeedback && isSprintWrongSelected(opt.label)" name="close" color="#E53935" size="20" />
              <van-checkbox v-else :name="opt.label" :model-value="selectedMulti" />
            </template>
          </van-cell>
        </van-cell-group>

        <!-- Multi: confirm button -->
        <div v-if="isMulti && !sprintShowFeedback" style="padding: 12px 16px; display: flex; gap: 8px;">
          <van-button block type="primary" size="small" @click="sprintConfirmMulti">确认答案</van-button>
          <van-button block plain size="small" @click="sprintSkipMulti">跳过</van-button>
        </div>
      </template>

      <!-- ===== Random/Mock mode: exam style ===== -->
      <template v-else>
        <!-- Single/Judge: radio group (:key forces remount on question change) -->
        <van-radio-group v-if="!submitted && !isMulti" v-model="selectedSingle" @change="onSingleChange" :key="'single-' + currentIndex">
          <van-cell-group inset>
            <van-cell
              v-for="opt in currentQuestion.options"
              :key="opt.label"
              clickable
              @click="selectSingle(opt.label)"
            >
              <template #title>
                <span :class="{ 'selected-option': selectedSingle === opt.label }">
                  {{ opt.label }}. {{ opt.content }}
                </span>
              </template>
              <template #right-icon>
                <van-radio :name="opt.label" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>

        <!-- Multiple: checkbox group (:key forces remount on question change) -->
        <van-checkbox-group v-if="!submitted && isMulti" v-model="selectedMulti" @change="onMultiChange" :key="'multi-' + currentIndex">
          <van-cell-group inset>
            <van-cell
              v-for="opt in currentQuestion.options"
              :key="opt.label"
              clickable
              @click="toggleMulti(opt.label)"
            >
              <template #title>
                <span :class="{ 'selected-option': selectedMulti.includes(opt.label) }">
                  {{ opt.label }}. {{ opt.content }}
                </span>
              </template>
              <template #right-icon>
                <van-checkbox :name="opt.label" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-checkbox-group>

        <!-- Submitted: show colored options -->
        <van-cell-group v-else-if="submitted" inset>
          <van-cell
            v-for="opt in currentQuestion.options"
            :key="opt.label"
            :class="optionResultClass(opt.label)"
          >
            <template #title>
              <span :class="optionTextClass(opt.label)">
                {{ opt.label }}. {{ opt.content }}
              </span>
            </template>
            <template #right-icon>
              <van-icon v-if="isCorrectOption(opt.label)" name="passed" color="#43A047" size="20" />
              <van-icon v-else-if="isWrongSelected(opt.label)" name="close" color="#E53935" size="20" />
            </template>
          </van-cell>
        </van-cell-group>
      </template>
    </div>

    <!-- Swipe hint (first 3 questions only) -->
    <div v-if="showSwipeHint" class="swipe-hint">
      <van-icon name="arrow-left" /> 左右滑动切换题目 <van-icon name="arrow" />
    </div>

    <!-- Prominent submit button on last question -->
    <div v-if="currentIndex >= total - 1 && !submitted" class="submit-area">
      <van-button type="danger" block round size="large" @click="onSubmit">
        交卷（已答 {{ answeredCount }} / {{ total }} 题）
      </van-button>
    </div>

    <!-- Bottom action bar -->
    <van-action-bar>
      <van-action-bar-button text="上一题" :disabled="currentIndex <= 0" @click="prevQuestion" />
      <van-action-bar-button v-if="!isSprint" text="答题卡" @click="showSheet = true" />
      <van-action-bar-button
        type="primary"
        :text="currentIndex >= total - 1 ? '交卷' : '下一题'"
        @click="onBarClick"
      />
    </van-action-bar>

    <!-- Answer sheet (random/mock only) -->
    <van-action-sheet v-if="!isSprint" v-model:show="showSheet" title="答题卡">
      <div class="answer-sheet">
        <div class="sheet-legend">
          <span class="legend-item"><span class="dot answered"></span> 已答</span>
          <span class="legend-item"><span class="dot unanswered"></span> 未答</span>
          <span class="legend-item"><span class="dot current"></span> 当前</span>
        </div>
        <div class="sheet-grid">
          <div
            v-for="i in total"
            :key="i"
            class="sheet-cell"
            :class="{
              answered: userAnswers[String(i)],
              current: i - 1 === currentIndex,
            }"
            @click="goToQuestion(i - 1)"
          >
            {{ i }}
          </div>
        </div>
        <div class="sheet-stats">
          已答 {{ answeredCount }} / {{ total }} 题
        </div>
        <div style="padding: 16px;">
          <van-button block type="primary" @click="showSheet = false">继续答题</van-button>
        </div>
      </div>
    </van-action-sheet>

    <!-- Pause overlay -->
    <div v-if="isPaused" class="pause-overlay">
      <div class="pause-content">
        <van-icon name="pause-circle-o" size="48" color="#1989fa" />
        <div class="pause-text">已暂停</div>
        <van-button type="primary" @click="resume">继续答题</van-button>
      </div>
    </div>

    <!-- Full paper preview (random/mock only) -->
    <van-popup v-model:show="showPreview" position="bottom" round style="max-height: 85vh;">
      <div class="preview-popup">
        <div class="preview-header">
          <span class="preview-title">全卷预览</span>
          <span class="preview-stats">已答 {{ answeredCount }} / {{ total }} 题</span>
        </div>
        <div class="preview-grid">
          <div
            v-for="(q, idx) in allQuestions"
            :key="q.question_id"
            class="preview-cell"
            :class="{
              answered: userAnswers[String(idx + 1)],
              unanswered: !userAnswers[String(idx + 1)],
              current: idx === currentIndex,
            }"
            @click="previewGoTo(idx)"
          >
            {{ idx + 1 }}
          </div>
        </div>

        <!-- Detail view inside preview -->
        <div v-if="previewDetail" class="preview-detail">
          <div class="preview-detail-header">
            <van-tag :type="previewDetail.userAnswer ? 'primary' : 'default'" size="small">
              {{ previewDetail.userAnswer ? '已答' : '未答' }}
            </van-tag>
            <span>第 {{ previewDetail.index }} 题</span>
            <van-icon name="cross" size="16" @click="previewDetail = null" style="margin-left: auto;" />
          </div>
          <div class="preview-detail-stem">{{ previewDetail.stem }}</div>
          <div class="preview-detail-opts">
            <div
              v-for="opt in previewDetail.options"
              :key="opt.label"
              class="preview-detail-opt"
              :class="{ 'opt-selected': previewDetail.userLabels.includes(opt.label) }"
            >
              {{ opt.label }}. {{ opt.content }}
              <van-tag v-if="previewDetail.userLabels.includes(opt.label)" type="primary" size="small">你的答案</van-tag>
            </div>
          </div>
          <van-button size="small" plain block @click="previewGoTo(previewDetail.index - 1)">跳转到此题</van-button>
        </div>

        <div class="preview-actions">
          <van-button block plain @click="showPreview = false">继续答题</van-button>
          <van-button block type="danger" style="margin-top: 8px;" @click="confirmSubmitFromPreview">确认交卷</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import request from '../../api/request'
import { playFeedback } from '../../utils/feedback'

const router = useRouter()
const route = useRoute()

// Session state
const session = ref(null)
const currentIndex = ref(0)
const userAnswers = ref({})
const remainingSeconds = ref(0)
const isPaused = ref(false)
const showSheet = ref(false)
const submitted = ref(false)
const scoreDetail = ref(null)

// Answer state
const selectedSingle = ref('')
const selectedMulti = ref([])

// Sprint mode
const sprintResults = ref({})
const sprintShowFeedback = ref(false)

// Wrong answer tracking (auto-add to wrongbook)
const wrongQuestions = ref(new Set())

// Favorite state
const isFavorited = ref(false)
const currentQuestionId = computed(() => currentQuestion.value?.question_id || '')

// Preview state (random/mock)
const showPreview = ref(false)
const previewDetail = ref(null)
const allQuestions = computed(() => session.value?.paper_snapshot?.questions || [])

// Swipe state
const touchStartX = ref(0)
const touchStartY = ref(0)
const showSwipeHint = ref(false)
let swipeHintShown = false

// Timer
let timer = null
let autoSaveTimer = null
const sessionStartTime = ref(Date.now())

// Computed
const total = computed(() => session.value?.paper_snapshot?.total_count || 0)
const isMock = computed(() => session.value?.paper_type === 'mock')
const isSprint = computed(() => session.value?.paper_type === 'sprint')
const currentQuestion = computed(() => {
  if (!session.value?.paper_snapshot?.questions) return null
  return session.value.paper_snapshot.questions[currentIndex.value] || null
})
const isMulti = computed(() => currentQuestion.value?.question_type === 'multi')
const answeredCount = computed(() => Object.keys(userAnswers.value).length)

const typeLabel = computed(() => {
  const map = { single: '单选题', multi: '多选题', judge: '判断题' }
  return map[currentQuestion.value?.question_type] || '单选题'
})
const typeTagType = computed(() => {
  const map = { single: 'primary', multi: 'warning', judge: 'success' }
  return map[currentQuestion.value?.question_type] || 'primary'
})

// Watch question change to restore answer + check favorite
watch(currentIndex, () => {
  // Force reset before restoring (extra safety for multi-choice)
  selectedMulti.value = []
  selectedSingle.value = ''
  restoreCurrentAnswer()
  if (isSprint.value) checkSprintFeedback()
  checkFavorited()
})

// Load session
onMounted(async () => {
  const sessionId = route.params.sessionId
  try {
    const res = await request.get(`/practice/session/${sessionId}`)
    session.value = res.data
    currentIndex.value = (res.data.current_index || 1) - 1
    userAnswers.value = { ...res.data.user_answers }
    remainingSeconds.value = res.data.remaining_seconds || 0

    restoreCurrentAnswer()
    if (isSprint.value) checkSprintFeedback()
    await loadFavoritesCache()
    checkFavorited()

    if (isMock.value && remainingSeconds.value > 0) {
      startTimer()
    }

    autoSaveTimer = setInterval(saveProgress, 30000)
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Show swipe hint once
    if (!swipeHintShown) {
      swipeHintShown = true
      showSwipeHint.value = true
      setTimeout(() => { showSwipeHint.value = false }, 3000)
    }
  } catch (err) {
    showToast('加载会话失败')
    router.back()
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (autoSaveTimer) clearInterval(autoSaveTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

// ===== Swipe navigation =====
function onTouchStart(e) {
  touchStartX.value = e.touches[0].clientX
  touchStartY.value = e.touches[0].clientY
}

function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX.value
  const dy = e.changedTouches[0].clientY - touchStartY.value
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  if (dx < 0) { nextQuestion() } else { prevQuestion() }
}

// Mouse drag support (PC)
function onMouseDown(e) {
  touchStartX.value = e.clientX
  touchStartY.value = e.clientY
}

function onMouseUp(e) {
  const dx = e.clientX - touchStartX.value
  const dy = e.clientY - touchStartY.value
  if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  if (dx < 0) { nextQuestion() } else { prevQuestion() }
}

// ===== Favorite =====
const favoritedIds = ref(new Set())
let favoritesLoaded = false

async function loadFavoritesCache() {
  if (favoritesLoaded) return
  try {
    const res = await request.get('/practice/favorites')
    const list = res.data?.list || []
    favoritedIds.value = new Set(list.map(f => f.question_id))
    favoritesLoaded = true
  } catch {}
}

function checkFavorited() {
  if (!currentQuestionId.value) { isFavorited.value = false; return }
  isFavorited.value = favoritedIds.value.has(currentQuestionId.value)
}

async function toggleFavorite() {
  if (!currentQuestionId.value) return
  try {
    if (isFavorited.value) {
      await request.delete(`/practice/favorites/${currentQuestionId.value}`)
      isFavorited.value = false
      favoritedIds.value.delete(currentQuestionId.value)
      showToast('已取消收藏')
    } else {
      await request.post(`/practice/favorites/${currentQuestionId.value}`)
      isFavorited.value = true
      favoritedIds.value.add(currentQuestionId.value)
      showToast('收藏成功')
    }
  } catch {}
}

// ===== Restore answer =====
function restoreCurrentAnswer() {
  const saved = userAnswers.value[String(currentIndex.value + 1)]
  // Always reset both first (fresh arrays to avoid stale refs)
  selectedMulti.value = []
  selectedSingle.value = ''
  if (isMulti.value) {
    if (Array.isArray(saved) && saved.length > 0) {
      selectedMulti.value = [...saved]
    } else if (typeof saved === 'string' && saved) {
      selectedMulti.value = saved.split('')
    }
  } else {
    selectedSingle.value = (typeof saved === 'string') ? saved : ''
  }
}

// ===== Sprint mode =====
function checkSprintFeedback() {
  const qIdx = String(currentIndex.value + 1)
  sprintShowFeedback.value = sprintResults.value[qIdx] !== undefined
}

function sprintSelectSingle(label) {
  const qIdx = String(currentIndex.value + 1)
  if (sprintShowFeedback.value) {
    selectedSingle.value = label
    userAnswers.value[qIdx] = label
    const correct = currentQuestion.value.answer
    const isCorrect = label === correct
    sprintResults.value[qIdx] = isCorrect
    playFeedback(isCorrect ? 'correct' : 'wrong')
    if (!isCorrect) recordWrongAnswer(currentQuestion.value.question_id)
    return
  }
  selectedSingle.value = label
  userAnswers.value[qIdx] = label
  const correct = currentQuestion.value.answer
  const isCorrect = label === correct
  sprintResults.value[qIdx] = isCorrect
  sprintShowFeedback.value = true
  playFeedback(isCorrect ? 'correct' : 'wrong')
  if (!isCorrect) recordWrongAnswer(currentQuestion.value.question_id)
}

function sprintToggleMulti(label) {
  if (sprintShowFeedback.value) return
  vibrate(50)
  const idx = selectedMulti.value.indexOf(label)
  if (idx >= 0) {
    selectedMulti.value.splice(idx, 1)
  } else {
    selectedMulti.value.push(label)
  }
  selectedMulti.value = [...selectedMulti.value].sort()
}

function sprintConfirmMulti() {
  const sorted = [...selectedMulti.value].sort()
  userAnswers.value[String(currentIndex.value + 1)] = sorted
  const correct = currentQuestion.value.answer
  const correctArr = Array.isArray(correct) ? correct.sort() : String(correct).split('').sort()
  const isCorrect = sorted.length > 0 && JSON.stringify(sorted) === JSON.stringify(correctArr)
  sprintResults.value[String(currentIndex.value + 1)] = isCorrect
  sprintShowFeedback.value = true
  playFeedback(isCorrect ? 'correct' : 'wrong')
}

// Sprint: skip multi confirm (allow moving without answering)
function sprintSkipMulti() {
  userAnswers.value[String(currentIndex.value + 1)] = []
  selectedMulti.value = []
  nextQuestion()
}

function isSprintCorrectOption(label) {
  if (!currentQuestion.value) return false
  const correct = currentQuestion.value.answer
  if (Array.isArray(correct)) return correct.includes(label)
  return String(correct).includes(label)
}

function isSprintWrongSelected(label) {
  if (!currentQuestion.value) return false
  const qIdx = String(currentIndex.value + 1)
  if (sprintResults.value[qIdx] !== false) return false
  const saved = userAnswers.value[qIdx]
  if (Array.isArray(saved)) return saved.includes(label)
  return String(saved || '').includes(label)
}

function sprintOptionClass(label) {
  if (!sprintShowFeedback.value) return ''
  if (isSprintCorrectOption(label)) return 'option-correct'
  if (isSprintWrongSelected(label)) return 'option-wrong'
  return ''
}

function sprintOptionTextClass(label) {
  if (!sprintShowFeedback.value) return ''
  if (isSprintCorrectOption(label)) return 'text-correct'
  if (isSprintWrongSelected(label)) return 'text-wrong'
  return ''
}

// ===== Random/Mock mode =====
function selectSingle(label) {
  if (submitted.value) return
  vibrate(15)
  selectedSingle.value = label
  userAnswers.value[String(currentIndex.value + 1)] = label
}

function onSingleChange(val) {
  userAnswers.value[String(currentIndex.value + 1)] = val
}

function toggleMulti(label) {
  if (submitted.value) return
  vibrate(15)
  const idx = selectedMulti.value.indexOf(label)
  if (idx >= 0) {
    selectedMulti.value.splice(idx, 1)
  } else {
    selectedMulti.value.push(label)
  }
  const sorted = [...selectedMulti.value].sort()
  selectedMulti.value = sorted
  userAnswers.value[String(currentIndex.value + 1)] = sorted
}

function onMultiChange(val) {
  const sorted = [...val].sort()
  userAnswers.value[String(currentIndex.value + 1)] = sorted
}

function isCorrectOption(label) {
  if (!currentQuestion.value || !scoreDetail.value) return false
  const detail = scoreDetail.value[String(currentIndex.value + 1)]
  if (!detail) return false
  const correct = Array.isArray(detail.correct_answer)
    ? detail.correct_answer
    : String(detail.correct_answer).split('')
  return correct.includes(label)
}

function isWrongSelected(label) {
  if (!currentQuestion.value || !scoreDetail.value) return false
  const detail = scoreDetail.value[String(currentIndex.value + 1)]
  if (!detail || detail.is_correct) return false
  const userAns = Array.isArray(detail.user_answer)
    ? detail.user_answer
    : String(detail.user_answer || '').split('')
  return userAns.includes(label) && !isCorrectOption(label)
}

function optionResultClass(label) {
  if (isCorrectOption(label)) return 'option-correct'
  if (isWrongSelected(label)) return 'option-wrong'
  return ''
}

function optionTextClass(label) {
  if (isCorrectOption(label)) return 'text-correct'
  if (isWrongSelected(label)) return 'text-wrong'
  return ''
}

// ===== Timer =====
function startTimer() {
  timer = setInterval(() => {
    if (isPaused.value) return
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--
    } else {
      clearInterval(timer)
      autoSubmit()
    }
  }, 1000)
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function onVisibilityChange() {
  if (document.hidden) {
    isPaused.value = true
    saveProgress()
  } else {
    isPaused.value = false
    showToast({ message: '计时已恢复', type: 'success' })
  }
}

function resume() { isPaused.value = false }

function vibrate(ms) {
  try { navigator.vibrate(ms || 15) } catch {}
}

function toArray(val) {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val) return val.split('')
  return []
}

// Record wrong answer to wrongbook (first time only)
async function recordWrongAnswer(questionId) {
  if (!questionId || wrongQuestions.value.has(questionId)) return
  wrongQuestions.value.add(questionId)
  try {
    await request.post('/practice/wrongbook/add', { question_id: questionId })
  } catch {}
}

// ===== Navigation =====
function prevQuestion() {
  if (currentIndex.value > 0) {
    saveProgress()
    currentIndex.value--
  }
}

function nextQuestion() {
  if (currentIndex.value < total.value - 1) {
    saveProgress()
    currentIndex.value++
  }
}

function goToQuestion(index) {
  saveProgress()
  currentIndex.value = index
  showSheet.value = false
}

function onBarClick() {
  if (currentIndex.value >= total.value - 1) {
    onSubmit()
  } else {
    nextQuestion()
  }
}

// ===== Save / Submit =====
async function saveProgress() {
  if (!session.value) return
  try {
    await request.put(`/practice/session/${session.value.session_id}/save`, {
      user_answers: userAnswers.value,
      current_index: currentIndex.value + 1,
      remaining_seconds: remainingSeconds.value,
    })
  } catch {}
}

async function onSubmit() {
  // Sprint: direct submit with confirm dialog
  if (isSprint.value) {
    try {
      await showConfirmDialog({
        title: '确定交卷吗？',
        message: `已答 ${answeredCount.value} / ${total.value} 题`,
      })
    } catch { return }
    await submitExam()
    return
  }
  // Random/Mock: show full paper preview
  showPreview.value = true
}

function previewGoTo(idx) {
  // If already on this index, show detail
  if (previewDetail.value && previewDetail.value.index === idx + 1) {
    currentIndex.value = idx
    previewDetail.value = null
    showPreview.value = false
    return
  }
  // Show detail in preview
  const q = allQuestions.value[idx]
  if (!q) return
  const saved = userAnswers.value[String(idx + 1)]
  const userLabels = toArray(saved)
  previewDetail.value = {
    index: idx + 1,
    stem: q.stem,
    options: q.options,
    userAnswer: saved || null,
    userLabels,
  }
}

function confirmSubmitFromPreview() {
  showPreview.value = false
  submitExam()
}

async function autoSubmit() {
  showToast({ message: '时间到，自动交卷', type: 'fail' })
  await submitExam()
}

async function submitExam() {
  // Save duration before submit
  const durationSeconds = Math.floor((Date.now() - sessionStartTime.value) / 1000)
  try {
    const res = await request.post(`/practice/session/${session.value.session_id}/submit`, {
      duration_seconds: durationSeconds,
    })
    scoreDetail.value = res.data.score_detail || {}
    submitted.value = true
    // Play feedback based on score
    const correctCount = res.data.correct_count || 0
    const totalCount = res.data.total_count || 1
    playFeedback(correctCount >= totalCount * 0.6 ? 'correct' : 'wrong')
    setTimeout(() => {
      router.replace(`/practice/result/${session.value.session_id}`)
    }, 1500)
  } catch (err) {
    showToast(err.message || '交卷失败')
  }
}

async function onBack() {
  try {
    await showConfirmDialog({
      title: '确定退出吗？',
      message: '当前进度将保存',
    })
    await saveProgress()
    router.back()
  } catch {}
}
</script>

<style scoped>
.exam-page { min-height: 100vh; background: #f7f8fa; }
.timer { font-size: 16px; font-weight: bold; color: #ee0a24; font-variant-numeric: tabular-nums; }
.question-area { padding: 16px; min-height: 60vh; position: relative; }
.nav-arrows { position: absolute; top: 50%; left: 0; right: 0; display: flex; justify-content: space-between; pointer-events: none; padding: 0 4px; }
.nav-arrow { pointer-events: auto; cursor: pointer; color: #c8c9cc; background: rgba(255,255,255,0.8); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
.nav-arrow:active { color: #1989fa; }
.stem { font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 16px; }
.selected-option { font-weight: bold; color: #1989fa; }

/* Swipe hint */
.swipe-hint {
  text-align: center;
  padding: 8px;
  font-size: 12px;
  color: #c8c9cc;
  animation: fadeInOut 3s ease-in-out;
}
@keyframes fadeInOut {
  0% { opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; }
}

/* Sprint nav bar */
.sprint-nav-bar {
  background: #fff;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.sprint-nav-scroll {
  display: flex;
  gap: 6px;
  padding: 0 12px;
  min-width: max-content;
}
.sprint-nav-cell {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #ebedf0;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}
.sprint-nav-cell.answered { background: #c8c9cc; color: #fff; }
.sprint-nav-cell.correct { background: #43A047; color: #fff; }
.sprint-nav-cell.wrong { background: #E53935; color: #fff; }
.sprint-nav-cell.current { border: 2px solid #1989fa; }

/* Answer result colors */
.option-correct { background: #E8F5E9 !important; }
.option-wrong { background: #FFE8E8 !important; }
.text-correct { color: #43A047; font-weight: 500; }
.text-wrong { color: #E53935; font-weight: 500; }

/* Submit area */
.submit-area { padding: 16px; }

/* Answer sheet */
.answer-sheet { padding-bottom: 16px; }
.sheet-legend { display: flex; gap: 16px; padding: 12px 16px; font-size: 12px; color: #999; }
.legend-item { display: flex; align-items: center; gap: 4px; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.dot.answered { background: #1989fa; }
.dot.unanswered { background: #ebedf0; }
.dot.current { background: #ff976a; }
.sheet-grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px; }
.sheet-cell {
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  border-radius: 8px; background: #ebedf0; font-size: 14px; cursor: pointer;
}
.sheet-cell.answered { background: #1989fa; color: #fff; }
.sheet-cell.current { border: 2px solid #ff976a; }
.sheet-stats { text-align: center; padding: 12px; font-size: 13px; color: #999; }

/* Pause overlay */
.pause-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999;
}
.pause-content { background: #fff; border-radius: 16px; padding: 32px; text-align: center; }
.pause-text { font-size: 18px; margin: 16px 0; color: #333; }

/* Preview popup */
.preview-popup { padding: 16px 16px 32px; }
.preview-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.preview-title { font-size: 16px; font-weight: 500; }
.preview-stats { font-size: 13px; color: #999; }
.preview-grid {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;
}
.preview-cell {
  width: 42px; height: 42px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px; font-size: 14px; cursor: pointer;
}
.preview-cell.answered { background: #1989fa; color: #fff; }
.preview-cell.unanswered { background: #ebedf0; color: #999; }
.preview-cell.current { border: 2px solid #ff976a; }
.preview-detail {
  padding: 12px; background: #f7f8fa; border-radius: 8px; margin-bottom: 12px;
}
.preview-detail-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; color: #666;
}
.preview-detail-stem {
  font-size: 14px; color: #333; line-height: 1.6; margin-bottom: 10px;
}
.preview-detail-opts { margin-bottom: 10px; }
.preview-detail-opt {
  padding: 8px 10px; margin-bottom: 4px; border-radius: 6px;
  background: #fff; font-size: 13px; color: #555;
  display: flex; align-items: center; gap: 6px;
}
.preview-detail-opt.opt-selected { background: #e8f4fd; color: #1989fa; }
.preview-actions { margin-top: 12px; }
</style>
