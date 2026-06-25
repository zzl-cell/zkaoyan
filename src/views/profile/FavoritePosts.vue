<template>
  <div class="favorite-posts">
    <van-nav-bar title="收藏动态" left-arrow @click-left="router.back()" />
    <van-list finished-text="没有更多了">
      <van-cell v-for="i in 3" :key="i" :title="`收藏的动态 ${i}`" label="发布者昵称 | 2026-07-20" is-link @click="router.push(`/recommend/post/${i}`)" />
    </van-list>
    <div v-if="!list.length" style="padding: 60px 0; text-align: center; color: #999;">暂无收藏动态</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const list = ref([])
</script>
