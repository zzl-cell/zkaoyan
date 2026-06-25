<template>
  <div class="bank-questions">
    <van-nav-bar :title="bankName" left-arrow @click-left="router.back()" />

    <van-loading v-if="initialLoading" style="text-align: center; padding: 60px 0;" />

    <template v-else>
      <!-- Stats bar -->
      <div class="stats-bar">
        <span class="stats-total">共 {{ total }} 道题</span>
        <span class="stats-type">
          单选 {{ typeStats.single }} · 多选 {{ typeStats.multiple }} · 判断 {{ typeStats.judge }}
        </span>
      </div>

      <!-- Question list -->
      <van-cell-group inset>
        <van-collapse v-model="expandedIds">
          <van-collapse-item
            v-for="(q, idx) in list"
            :key="q.question_id"
            :name="q.question_id"
          >
            <template #title>
              <div class="question-title">
                <span class="q-index">{{ idx + 1 }}.</span>
                <van-tag
                  :type="q.question_type === 'single' ? 'primary' : q.question_type === 'multi' ? 'warning' : 'success'"
                  size="small"
                  style="margin-right: 6px;"
                >
                  {{ typeLabel(q.question_type) }}
                </van-tag>
                <span class="stem-text">{{ truncate(q.stem, 35) }}</span>
              </div>
            </template>
            <div class="question-detail">
              <div class="stem-full">{{ q.stem }}</div>
              <div class="options">
                <div v-for="opt in q.options" :key="opt.label" class="option-item">
                  <span class="option-label">{{ opt.label }}.</span>
                  <span>{{ opt.content }}</span>
                </div>
              </div>
              <div v-if="q.answer" class="answer-line">
                <van-tag type="primary" size="small">答案：{{ q.answer }}</van-tag>
              </div>
              <div v-if="q.explanation" class="explanation">
                解析：{{ q.explanation }}
              </div>
            </div>
          </van-collapse-item>
        </van-collapse>
      </van-cell-group>

      <!-- Load more button -->
      <div v-if="list.length < total" class="load-more">
        <van-button
          plain
          type="primary"
          size="small"
          :loading="loadingMore"
          loading-text="加载中..."
          @click="loadMore"
        >
          展开更多（{{ list.length }}/{{ total }}）
        </van-button>
      </div>

      <!-- All loaded -->
      <div v-else-if="list.length > 0" class="all-loaded">
        已展示全部 {{ total }} 道题
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getQuestionsList } from '../../api/practice'
import { getUserAssets } from '../../api/shop'
import { showToast } from 'vant'

const router = useRouter()
const route = useRoute()

const productId = route.params.productId
const bankName = ref('题库详情')
const list = ref([])
const total = ref(0)
const expandedIds = ref([])
const initialLoading = ref(true)
const loadingMore = ref(false)
const page = ref(1)
const pageSize = 20

const typeStats = reactive({ single: 0, multiple: 0, judge: 0 })

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

function typeLabel(type) {
  const map = { single: '单选', multi: '多选', judge: '判断' }
  return map[type] || type
}

async function loadInitial() {
  initialLoading.value = true
  try {
    // Get bank name from user assets
    const assetsRes = await getUserAssets()
    const bank = (assetsRes.data.list || []).find(a => a.product_id === productId)
    if (bank) {
      bankName.value = bank.product_name || '题库详情'
    }

    // Load first page
    const res = await getQuestionsList({
      page: 1,
      page_size: pageSize,
      product_id: productId,
    })
    const data = res.data
    list.value = data.list || []
    total.value = data.total || 0
    if (data.stats) {
      typeStats.single = data.stats.single || 0
      typeStats.multiple = data.stats.multiple || 0
      typeStats.judge = data.stats.judge || 0
    }
    page.value = 2
  } catch {
    showToast('加载失败')
  } finally {
    initialLoading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  try {
    const res = await getQuestionsList({
      page: page.value,
      page_size: pageSize,
      product_id: productId,
    })
    const data = res.data
    list.value.push(...(data.list || []))
    page.value++
  } catch {
    showToast('加载失败')
  } finally {
    loadingMore.value = false
  }
}

onMounted(() => {
  loadInitial()
})
</script>

<style scoped>
.bank-questions {
  min-height: 100vh;
  background: #f7f8fa;
}
.stats-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}
.stats-total {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}
.stats-type {
  font-size: 12px;
  color: #999;
}
.question-title {
  display: flex;
  align-items: center;
  line-height: 1.6;
}
.q-index {
  font-size: 13px;
  color: #999;
  margin-right: 6px;
  font-weight: 500;
  min-width: 20px;
}
.stem-text {
  font-size: 14px;
  color: #333;
}
.question-detail {
  padding: 4px 0;
}
.stem-full {
  font-size: 14px;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.6;
}
.options {
  margin-bottom: 8px;
}
.option-item {
  font-size: 13px;
  color: #555;
  padding: 3px 0;
}
.option-label {
  font-weight: bold;
  margin-right: 4px;
}
.answer-line {
  margin-top: 8px;
}
.explanation {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
  line-height: 1.5;
}
.load-more {
  text-align: center;
  padding: 20px 16px;
}
.all-loaded {
  text-align: center;
  padding: 20px 16px;
  font-size: 13px;
  color: #c8c9cc;
}
</style>
