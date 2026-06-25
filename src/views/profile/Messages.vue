<template>
  <div class="messages">
    <van-nav-bar title="消息" left-arrow @click-left="router.back()" />
    <van-list finished-text="没有更多了">
      <van-cell v-for="item in messages" :key="item.id" :title="item.title" :label="item.time" is-link>
        <template #right-icon><van-badge v-if="!item.read" dot /></template>
      </van-cell>
    </van-list>
    <div v-if="!messages.length" style="padding: 60px 0; text-align: center; color: #999;">暂无消息</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const messages = ref([])
</script>
