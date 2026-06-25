<template>
  <div class="followers-list">
    <van-nav-bar title="粉丝" left-arrow @click-left="router.back()" />
    <van-list finished-text="没有更多了">
      <van-cell v-for="i in 3" :key="i" :title="`粉丝 ${i}`" label="简介信息" is-link @click="router.push(`/recommend/user/${i}`)">
        <template #right-icon><van-button size="mini" type="primary">关注</van-button></template>
      </van-cell>
    </van-list>
    <div v-if="!list.length" style="padding: 60px 0; text-align: center; color: #999;">暂无粉丝</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const list = ref([])
</script>
