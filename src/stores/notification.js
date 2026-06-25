import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getUnreadStatus } from '../api/notification'

export const useNotificationStore = defineStore('notification', () => {
  const unreadByType = ref({
    comment: 0,
    reply: 0,
    mention: 0,
    follow: 0,
    system: 0,
  })

  const hasUnread = computed(() => {
    return Object.values(unreadByType.value).some((count) => count > 0)
  })

  async function fetchUnread() {
    const res = await getUnreadStatus()
    unreadByType.value = res.data.unread_by_type || {}
  }

  function clearUnread(type) {
    if (type) {
      unreadByType.value[type] = 0
    } else {
      Object.keys(unreadByType.value).forEach((k) => (unreadByType.value[k] = 0))
    }
  }

  return { unreadByType, hasUnread, fetchUnread, clearUnread }
})
