<template>
  <div class="badge-wall">
    <van-nav-bar title="勋章墙" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px 0;" />

    <template v-else>
      <div v-for="group in badgeGroups" :key="group.title" class="badge-group">
        <div class="group-title">{{ group.title }}</div>
        <div class="badge-grid">
          <div
            v-for="badge in group.badges"
            :key="badge.badge_id"
            class="badge-card"
            :class="{ unlocked: badge.is_unlocked, wearing: badge.is_wearing }"
            @click="showBadgeDetail(badge)"
          >
            <van-icon :name="badge.icon" size="32" :color="badge.is_unlocked ? '#ff976a' : '#c8c9cc'" />
            <div class="badge-name">{{ badge.name }}</div>
            <van-tag v-if="badge.is_wearing" size="small" type="primary">佩戴中</van-tag>
          </div>
        </div>
      </div>
    </template>

    <!-- Badge detail popup -->
    <van-popup v-model:show="showDetail" position="bottom" round style="max-height: 60vh;">
      <div class="detail-popup" v-if="detailBadge">
        <div class="detail-icon">
          <van-icon :name="detailBadge.icon" size="48" :color="detailBadge.is_unlocked ? '#ff976a' : '#c8c9cc'" />
        </div>
        <div class="detail-name">{{ detailBadge.name }}</div>
        <div class="detail-desc">{{ detailBadge.description }}</div>
        <div class="detail-condition">
          <van-tag :type="detailBadge.is_unlocked ? 'success' : 'default'" size="medium">
            {{ detailBadge.is_unlocked ? '已获得' : getConditionText(detailBadge) }}
          </van-tag>
        </div>
        <div v-if="detailBadge.is_unlocked" style="padding: 16px;">
          <van-button
            block
            :type="detailBadge.is_wearing ? 'default' : 'primary'"
            round
            @click="toggleWear(detailBadge)"
          >
            {{ detailBadge.is_wearing ? '取消佩戴' : '佩戴勋章' }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '../../api/request'

const router = useRouter()
const loading = ref(true)
const allBadges = ref([])
const showDetail = ref(false)
const detailBadge = ref(null)

const badgeGroups = ref([
  { title: '刷题量', badges: [] },
  { title: '连续签到', badges: [] },
  { title: '正确率', badges: [] },
  { title: '社交贡献', badges: [] },
])

function getConditionText(badge) {
  const cond = badge.unlock_condition
  if (!cond) return '未达成'
  if (cond.type === 'question_count') return `需累计刷题 ${cond.threshold} 题`
  if (cond.type === 'streak') return `需连续签到 ${cond.threshold} 天`
  if (cond.type === 'accuracy') return `需正确率≥${cond.accuracy_threshold}%且刷题≥${cond.question_threshold}题`
  if (cond.type === 'social') return `需${cond.metric === 'comment_count' ? '评论' : cond.metric === 'like_received' ? '获赞' : '粉丝'} ${cond.threshold}`
  return '未达成'
}

function showBadgeDetail(badge) {
  detailBadge.value = badge
  showDetail.value = true
}

async function toggleWear(badge) {
  try {
    if (badge.is_wearing) {
      await request.post('/badge/unwear', { badge_id: badge.badge_id })
      badge.is_wearing = false
      showToast('已取消佩戴')
    } else {
      // Unwear all others first
      allBadges.value.forEach(b => { b.is_wearing = false })
      await request.post('/badge/wear', { badge_id: badge.badge_id })
      badge.is_wearing = true
      showToast('佩戴成功')
    }
    detailBadge.value = { ...badge }
  } catch {}
}

onMounted(async () => {
  try {
    const res = await request.get('/badge/list')
    allBadges.value = res.data?.badges || []

    const groupMap = { question_count: 0, streak: 1, accuracy: 2, social: 3 }
    badgeGroups.value.forEach(g => g.badges = [])
    allBadges.value.forEach(b => {
      const idx = groupMap[b.type]
      if (idx !== undefined) badgeGroups.value[idx].badges.push(b)
    })
  } catch {} finally {
    loading.value = false
  }
})
</script>

<style scoped>
.badge-wall { min-height: 100vh; background: #f7f8fa; }
.badge-group { margin: 12px 16px; }
.group-title { font-size: 15px; font-weight: 500; color: #333; margin-bottom: 10px; }
.badge-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.badge-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 16px 8px; background: #fff; border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04); cursor: pointer;
  opacity: 0.5; transition: all 0.2s;
}
.badge-card.unlocked { opacity: 1; }
.badge-card.wearing { border: 2px solid #1989fa; }
.badge-name { font-size: 13px; color: #333; margin-top: 6px; text-align: center; }
.detail-popup { padding: 24px 16px; text-align: center; }
.detail-icon { margin-bottom: 12px; }
.detail-name { font-size: 18px; font-weight: 500; color: #333; margin-bottom: 6px; }
.detail-desc { font-size: 14px; color: #666; margin-bottom: 12px; }
.detail-condition { margin-bottom: 8px; }
</style>
