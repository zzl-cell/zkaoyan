<template>
  <div class="following-feed">
    <van-nav-bar title="关注" left-arrow @click-left="router.back()" />
    <van-list finished-text="没有更多了">
      <van-cell>关注 Feed 列表（待实现）</van-cell>
    </van-list>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
