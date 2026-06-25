import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useExamStore = defineStore('exam', () => {
  const session = ref(null)
  const currentQuestionIndex = ref(0)
  const userAnswers = ref({})
  const remainingSeconds = ref(0)
  const isPaused = ref(false)
  const timer = ref(null)

  const currentQuestion = computed(() => {
    if (!session.value?.paper_snapshot?.questions) return null
    return session.value.paper_snapshot.questions[currentQuestionIndex.value] || null
  })

  const totalQuestions = computed(() => {
    return session.value?.paper_snapshot?.total_count || 0
  })

  const answeredCount = computed(() => {
    return Object.keys(userAnswers.value).length
  })

  function setSession(data) {
    session.value = data
    currentQuestionIndex.value = data.current_index - 1
    userAnswers.value = { ...data.user_answers }
    remainingSeconds.value = data.remaining_seconds || 0
  }

  function selectAnswer(index, answer) {
    userAnswers.value[String(index)] = answer
  }

  function clearSession() {
    session.value = null
    currentQuestionIndex.value = 0
    userAnswers.value = {}
    remainingSeconds.value = 0
    isPaused.value = false
    if (timer.value) clearInterval(timer.value)
    timer.value = null
  }

  return {
    session, currentQuestionIndex, userAnswers, remainingSeconds, isPaused,
    currentQuestion, totalQuestions, answeredCount,
    setSession, selectAnswer, clearSession,
  }
})
