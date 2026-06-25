import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getBalance,
  sign as signApi,
  getSignStatus,
  getSignLogs,
  getTransactions,
  getProbLog,
} from '../api/coin'

export const useCoinStore = defineStore('coin', () => {
  // Balance
  const balance = ref(0)
  const totalEarned = ref(0)
  const totalSpent = ref(0)

  // Sign-in
  const signedToday = ref(false)
  const streakDays = ref(0)
  const todayReward = ref(null)

  // Lists
  const transactions = ref([])
  const signLogs = ref([])
  const probLogs = ref([])

  const balanceDisplay = computed(() => balance.value.toLocaleString())

  // Fetch balance from API
  async function fetchBalance() {
    const res = await getBalance()
    balance.value = res.data.balance
    totalEarned.value = res.data.total_earned
    totalSpent.value = res.data.total_spent
  }

  // Fetch sign-in status
  async function fetchSignStatus() {
    const res = await getSignStatus()
    signedToday.value = res.data.signed_today
    streakDays.value = res.data.streak_days
    todayReward.value = res.data.today_reward
  }

  // Sign in
  async function signIn() {
    const randomNumber = Math.random()
    const res = await signApi({ random_number: randomNumber })
    signedToday.value = true
    streakDays.value = res.data.streak_days
    todayReward.value = res.data.total_reward
    balance.value = res.data.balance
    return res.data
  }

  // Fetch sign logs
  async function fetchSignLogs() {
    const res = await getSignLogs()
    signLogs.value = res.data.list
  }

  // Fetch transaction history
  async function fetchTransactions() {
    const res = await getTransactions()
    transactions.value = res.data.list
  }

  // Fetch probability reward logs
  async function fetchProbLog() {
    const res = await getProbLog()
    probLogs.value = res.data.list
  }

  return {
    balance, totalEarned, totalSpent, balanceDisplay,
    signedToday, streakDays, todayReward,
    transactions, signLogs, probLogs,
    fetchBalance, fetchSignStatus, signIn,
    fetchSignLogs, fetchTransactions, fetchProbLog,
  }
})
