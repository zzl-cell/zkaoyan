<template>
  <div class="prob-log">
    <van-nav-bar title="概率奖励记录" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px 0;" />

    <template v-else>
      <van-empty v-if="!coinStore.probLogs.length" description="暂无概率奖励记录" />

      <van-list v-else>
        <van-cell
          v-for="log in coinStore.probLogs"
          :key="log.log_id"
          :title="log.sign_date"
          :label="`随机数: ${log.random_number?.toFixed(4) || '-'} | 命中区间: ${log.prob_range}`"
          :value="`+${log.prob_reward} 币`"
          value-class="prob-reward"
        />
      </van-list>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCoinStore } from '../../stores/coin'

const router = useRouter()
const coinStore = useCoinStore()
const loading = ref(true)

onMounted(async () => {
  try {
    await coinStore.fetchProbLog()
  } catch {}
  loading.value = false
})
</script>

<style scoped>
.prob-reward {
  color: #ff6034 !important;
  font-weight: bold;
}
</style>
