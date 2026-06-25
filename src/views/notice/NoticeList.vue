<template>
  <div class="notice-list">
    <van-nav-bar title="公告" />
    <van-list finished-text="没有更多了">
      <van-cell v-for="i in 3" :key="i" :title="`公告标题 ${i}`" label="系统通知 | 2026-07-20" is-link @click="router.push(`/notice/${i}`)" />
    </van-list>
    <div v-if="!list.length" style="padding: 60px 0; text-align: center; color: #999;">暂无公告</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const list = ref([])
</script>
