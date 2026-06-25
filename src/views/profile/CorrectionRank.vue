<template>
  <div class="correction-rank">
    <van-nav-bar title="纠错排行榜" left-arrow @click-left="router.back()" />
    <van-list finished-text="没有更多了">
      <van-cell v-for="i in 10" :key="i">
        <template #title>
          <span style="font-weight: bold; margin-right: 8px;">{{ i }}</span>
          <span>张*</span>
        </template>
        <template #value>累计纠错获币: {{ (11 - i) * 2000 }}</template>
      </van-cell>
    </van-list>
    <div style="padding: 16px; text-align: center; color: #1989fa;">我的排名: 第 -- 名</div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
