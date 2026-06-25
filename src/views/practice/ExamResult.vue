<template>
  <div class="exam-result">
    <van-nav-bar title="成绩报告" left-arrow @click-left="router.push('/practice')" />

    <!-- Score display -->
    <div class="score-section">
      <div class="score-big">{{ result.total_score || 0 }}</div>
      <div class="score-label">总分（满分100）</div>
    </div>

    <!-- Stats grid -->
    <van-grid :column-num="3" style="margin: 0 16px; border-radius: 12px; overflow: hidden;">
      <van-grid-item>
        <div class="stat-num correct">{{ result.correct_count || 0 }}</div>
        <div class="stat-lbl">正确</div>
      </van-grid-item>
      <van-grid-item>
        <div class="stat-num wrong">{{ result.wrong_count || 0 }}</div>
        <div class="stat-lbl">错误</div>
      </van-grid-item>
      <van-grid-item>
        <div class="stat-num unanswered">{{ result.unanswered_count || 0 }}</div>
        <div class="stat-lbl">未答</div>
      </van-grid-item>
    </van-grid>

    <!-- Duration -->
    <van-cell-group style="margin: 12px 16px; border-radius: 12px; overflow: hidden;">
      <van-cell title="用时" :value="result.duration_display || '-'" />
      <van-cell v-if="personalRank" title="个人最佳" :value="personalRank.best_score + '分'" />
      <van-cell v-if="personalRank" title="平均分" :value="personalRank.avg_score + '分'" />
      <van-cell v-if="personalRank" title="累计练习" :value="personalRank.total_attempts + '次'" />
    </van-cell-group>

    <!-- Question number grid -->
    <div class="q-grid-section">
      <div class="q-grid-header">答题详情</div>
      <div class="q-grid-legend">
        <span class="legend-item"><span class="legend-dot correct"></span> 正确</span>
        <span class="legend-item"><span class="legend-dot wrong"></span> 错误</span>
        <span class="legend-item"><span class="legend-dot unanswered"></span> 未答</span>
      </div>
      <div class="q-grid">
        <div
          v-for="q in questionsWithAnswers"
          :key="q.index"
          class="q-grid-cell"
          :class="{
            correct: q.is_correct,
            wrong: !q.is_correct && q.user_answer,
            unanswered: !q.user_answer,
          }"
          @click="showQuestionDetail(q)"
        >
          <span class="q-grid-num">{{ q.index }}</span>
          <van-icon v-if="q.is_correct" name="passed" size="14" />
          <van-icon v-else-if="q.user_answer" name="close" size="14" />
          <van-icon v-else name="minus" size="14" />
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div style="padding: 16px;">
      <van-button block plain style="margin-top: 8px;" @click="router.push('/practice')">
        返回首页
      </van-button>
    </div>

    <!-- Question detail popup -->
    <van-popup v-model:show="showDetail" position="bottom" round style="max-height: 80vh;">
      <div class="detail-popup" v-if="detailQuestion">
        <div class="detail-header">
          <van-tag :type="detailQuestion.is_correct ? 'success' : 'danger'" size="medium">
            {{ detailQuestion.is_correct ? '✔ 正确' : '✘ 错误' }}
          </van-tag>
          <span class="detail-index">第 {{ detailQuestion.index }} 题</span>
          <van-tag
            :type="detailQuestion.question_type === 'multi' ? 'warning' : 'primary'"
            size="small"
            plain
          >
            {{ typeLabel(detailQuestion.question_type) }}
          </van-tag>
        </div>

        <div class="detail-stem">{{ detailQuestion.stem }}</div>

        <div class="detail-options">
          <div
            v-for="opt in detailQuestion.options"
            :key="opt.label"
            class="detail-opt"
            :class="{
              'opt-correct': isCorrectLabel(detailQuestion, opt.label),
              'opt-wrong': isUserSelected(detailQuestion, opt.label) && !isCorrectLabel(detailQuestion, opt.label),
            }"
          >
            <span class="opt-label">{{ opt.label }}.</span>
            <span class="opt-content">{{ opt.content }}</span>
            <van-tag v-if="isCorrectLabel(detailQuestion, opt.label)" type="success" size="small">正确答案</van-tag>
            <van-tag v-if="isUserSelected(detailQuestion, opt.label) && !isCorrectLabel(detailQuestion, opt.label)" type="danger" size="small">你的答案</van-tag>
          </div>
        </div>

        <div v-if="detailQuestion.explanation" class="detail-explanation">
          <strong>解析：</strong>{{ detailQuestion.explanation }}
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import request from '../../api/request'

const router = useRouter()
const route = useRoute()

const result = ref({})
const personalRank = ref(null)
const showDetail = ref(false)
const detailQuestion = ref(null)

const questionsWithAnswers = computed(() => {
  return result.value.questions_with_answers || []
})

function toArray(val) {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val) return val.split('')
  return []
}

function isCorrectLabel(q, label) {
  return toArray(q.answer).includes(label)
}

function isUserSelected(q, label) {
  return toArray(q.user_answer).includes(label)
}

function typeLabel(type) {
  const map = { single: '单选', multi: '多选', judge: '判断' }
  return map[type] || type
}

function showQuestionDetail(q) {
  detailQuestion.value = q
  showDetail.value = true
}

onMounted(async () => {
  const sessionId = route.params.sessionId
  try {
    const [resultRes, rankRes] = await Promise.all([
      request.get(`/practice/result/${sessionId}`),
      request.get(`/practice/result/${sessionId}/rank`),
    ])
    result.value = resultRes.data || {}
    personalRank.value = rankRes.data || null
  } catch {
    showToast('加载失败')
  }
})
</script>

<style scoped>
.exam-result { min-height: 100vh; background: #f7f8fa; }
.score-section { text-align: center; padding: 24px 0; }
.score-big { font-size: 56px; font-weight: bold; color: #1989fa; }
.score-label { font-size: 13px; color: #999; margin-top: 4px; }
.stat-num { font-size: 24px; font-weight: bold; }
.stat-num.correct { color: #07c160; }
.stat-num.wrong { color: #ee0a24; }
.stat-num.unanswered { color: #999; }
.stat-lbl { font-size: 12px; color: #999; margin-top: 4px; }

/* Question grid */
.q-grid-section {
  margin: 12px 16px;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}
.q-grid-header {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}
.q-grid-legend {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #999;
}
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.legend-dot.correct { background: #43A047; }
.legend-dot.wrong { background: #E53935; }
.legend-dot.unanswered { background: #ebedf0; }

.q-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.q-grid-cell {
  width: 48px;
  height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.15s;
}
.q-grid-cell:active { transform: scale(0.92); }
.q-grid-cell.correct { background: #E8F5E9; color: #43A047; }
.q-grid-cell.wrong { background: #FFEBEE; color: #E53935; }
.q-grid-cell.unanswered { background: #f5f5f5; color: #c8c9cc; }
.q-grid-num { font-size: 12px; font-weight: 500; }

/* Detail popup */
.detail-popup { padding: 16px 16px 32px; }
.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.detail-index { font-size: 14px; color: #666; }
.detail-stem {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 16px;
}
.detail-options { margin-bottom: 16px; }
.detail-opt {
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 8px;
  background: #f7f8fa;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.detail-opt.opt-correct { background: #e8f8ee; }
.detail-opt.opt-wrong { background: #fce4ec; }
.opt-label { font-weight: bold; margin-right: 2px; }
.opt-content { flex: 1; }
.detail-explanation {
  padding: 12px;
  background: #fffbe8;
  border-radius: 8px;
  color: #666;
  line-height: 1.6;
  font-size: 13px;
}
</style>
