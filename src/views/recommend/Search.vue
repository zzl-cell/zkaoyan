<template>
  <div class="search-page">
    <van-search v-model="keyword" placeholder="搜索用户/话题" show-action @search="onSearch">
      <template #action><span @click="router.back()">取消</span></template>
    </van-search>
    <van-tabs v-model:active="tab">
      <van-tab title="用户">用户搜索结果（待实现）</van-tab>
      <van-tab title="话题">话题搜索结果（待实现）</van-tab>
    </van-tabs>
    <div class="history">
      <van-cell title="搜索历史" value="清除" />
      <van-cell-group>搜索历史列表（待实现）</van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const keyword = ref('')
const tab = ref(0)
function onSearch() { /* TODO */ }
</script>
