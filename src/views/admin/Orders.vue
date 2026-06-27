<template>
  <div class="admin-orders">
    <van-nav-bar title="订单管理" left-arrow @click-left="router.back()" />

    <!-- Status filter -->
    <div class="filter-bar">
      <van-tabs v-model:active="activeTab" @change="onTabChange">
        <van-tab title="全部" name="" />
        <van-tab title="待支付" name="pending" />
        <van-tab title="已支付" name="paid" />
        <van-tab title="已退款" name="refunded" />
      </van-tabs>
    </div>

    <!-- Order list -->
    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadOrders">
      <van-swipe-cell v-for="o in orders" :key="o.order_id">
        <van-cell :title="o.product_name || '未知商品'" :label="orderLabel(o)">
          <template #value>
            <div style="text-align: right;">
              <div style="font-size: 14px; font-weight: 500; color: #ee0a24;">{{ formatAmount(o.final_amount) }}</div>
              <van-tag :type="statusTag(o.status)" size="small">{{ statusText(o.status) }}</van-tag>
            </div>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="primary" text="详情" @click="onDetail(o)" />
          <van-button v-if="o.status === 'paid'" square type="warning" text="退款" @click="onRefund(o)" />
        </template>
      </van-swipe-cell>
    </van-list>

    <!-- Detail popup -->
    <van-popup v-model:show="showDetail" position="bottom" round style="max-height: 80vh;">
      <div class="detail-popup" v-if="detailItem">
        <div class="detail-section"><strong>订单ID：</strong>{{ detailItem.order_id }}</div>
        <div class="detail-section"><strong>用户：</strong>{{ detailItem.user_nickname || '未知' }}（{{ detailItem.user_phone || '-' }}）</div>
        <div class="detail-section"><strong>商品：</strong>{{ detailItem.product_name_detail || detailItem.product_name }}</div>
        <div v-if="detailItem.product_description" class="detail-section"><strong>商品描述：</strong>{{ detailItem.product_description }}</div>
        <div class="detail-section"><strong>原价：</strong>{{ formatAmount(detailItem.original_amount) }}</div>
        <div class="detail-section"><strong>实付：</strong>{{ formatAmount(detailItem.final_amount) }}</div>
        <div class="detail-section"><strong>支付方式：</strong>{{ detailItem.payment_method === 'coin' ? '虚拟币' : detailItem.payment_method }}</div>
        <div class="detail-section"><strong>状态：</strong>{{ statusText(detailItem.status) }}</div>
        <div class="detail-section"><strong>支付时间：</strong>{{ detailItem.paid_at || '未支付' }}</div>
        <div class="detail-section"><strong>创建时间：</strong>{{ detailItem.created_at }}</div>
        <van-button block plain style="margin-top: 12px;" @click="showDetail = false">关闭</van-button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '../../api/request'

const router = useRouter()

const orders = ref([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const activeTab = ref('')

const showDetail = ref(false)
const detailItem = ref(null)

function formatAmount(amount) {
  return amount ? `${amount} 币` : '0 币'
}

function orderLabel(o) {
  const parts = []
  if (o.user_nickname) parts.push(o.user_nickname)
  if (o.created_at) parts.push(o.created_at.slice(0, 10))
  return parts.join(' · ')
}

function statusText(s) {
  return { pending: '待支付', paid: '已支付', refunded: '已退款', cancelled: '已取消' }[s] || s
}

function statusTag(s) {
  return { pending: 'warning', paid: 'success', refunded: 'default', cancelled: 'danger' }[s] || 'default'
}

function onTabChange() {
  page.value = 1
  finished.value = false
  orders.value = []
  loadOrders()
}

async function loadOrders() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: 20 }
    if (activeTab.value) params.status = activeTab.value
    const res = await request.get('/admin/orders', { params })
    const list = res.data.list || []
    if (page.value === 1) orders.value = list
    else orders.value.push(...list)
    if (list.length < 20) finished.value = true
    page.value++
  } catch {} finally { loading.value = false }
}

async function onDetail(o) {
  try {
    const res = await request.get('/admin/orders_detail', { params: { id: o.order_id } })
    detailItem.value = res.data
    showDetail.value = true
  } catch {}
}

async function onRefund(o) {
  try {
    await showConfirmDialog({
      title: '确认退款',
      message: `订单 ${o.order_id}\n商品：${o.product_name}\n金额：${formatAmount(o.final_amount)}`,
    })
    await request.post('/admin/orders_refund', { order_id: o.order_id })
    showToast('退款成功')
    o.status = 'refunded'
  } catch {}
}
</script>

<style scoped>
.admin-orders { min-height: 100vh; background: #f7f8fa; }
.filter-bar { background: #fff; }
.detail-popup { padding: 16px; }
.detail-section { font-size: 14px; color: #333; margin-bottom: 10px; line-height: 1.5; }
</style>
