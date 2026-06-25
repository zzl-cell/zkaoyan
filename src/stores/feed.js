import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFeedStore = defineStore('feed', () => {
  const recommendList = ref([])
  const followingList = ref([])
  const currentPost = ref(null)
  const isPublishing = ref(false)
  const recommendPage = ref(1)
  const followingPage = ref(1)
  const hasMoreRecommend = ref(true)
  const hasMoreFollowing = ref(true)

  function resetFeed() {
    recommendList.value = []
    followingList.value = []
    recommendPage.value = 1
    followingPage.value = 1
    hasMoreRecommend.value = true
    hasMoreFollowing.value = true
  }

  return {
    recommendList, followingList, currentPost, isPublishing,
    recommendPage, followingPage, hasMoreRecommend, hasMoreFollowing,
    resetFeed,
  }
})
