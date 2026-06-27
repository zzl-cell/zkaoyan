<template>
  <div class="my-library">
    <van-nav-bar title="我的资料库" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" style="text-align: center; padding: 40px 0;" />

    <template v-else>
      <van-empty v-if="!assets.length" description="暂无已购资料">
        <van-button type="primary" size="small" @click="router.push('/shop')">去商城逛逛</van-button>
      </van-empty>

      <van-cell-group v-else inset style="margin-top: 12px;">
        <van-cell
          v-for="item in assets"
          :key="item.product_id"
          :title="item.name || item.product_name"
          :label="cellLabel(item)"
          is-link
          @click="onCellClick(item)"
        >
          <template #icon>
            <van-icon
              :name="item.is_question_bank ? 'edit' : 'description'"
              size="20"
              :color="item.is_question_bank ? '#1989fa' : '#999'"
              style="margin-right: 8px;"
            />
          </template>
          <template #value>
            <div v-if="item.is_question_bank" class="import-status">
              <van-tag type="success" size="small">已就绪</van-tag>
              <span class="question-count">{{ item.question_count }}题</span>
            </div>
            <div v-else class="import-status">
              <van-tag type="primary" size="small">文件资料</van-tag>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUserAssets } from '../../api/shop'

const router = useRouter()
const assets = ref([])
const loading = ref(true)

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function cellLabel(item) {
  const time = formatTime(item.purchased_at)
  if (item.is_question_bank) {
    return `购买时间: ${time}`
  }
  return `购买时间: ${time}`
}

function onCellClick(item) {
  if (item.is_question_bank) {
    router.push('/practice')
  } else {
    router.push(`/shop/view/${item.product_id}`)
  }
}

onMounted(async () => {
  try {
    const res = await getUserAssets()
    assets.value = res.data.items || res.data.list || []
  } catch {} finally {
    loading.value = false
  }
})
</script>

<style scoped>
.my-library { min-height: 100vh; background: #f7f8fa; }
.import-status { display: flex; align-items: center; gap: 6px; }
.question-count { font-size: 12px; color: #666; }
</style>
