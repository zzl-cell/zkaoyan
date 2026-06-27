<template>
  <div class="admin-users">
    <van-nav-bar title="用户管理" left-arrow @click-left="router.back()" />

    <van-search v-model="keyword" placeholder="搜索昵称/手机号" @search="reload" show-action>
      <template #action><span @click="reload">搜索</span></template>
    </van-search>

    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadUsers">
      <van-cell v-for="u in users" :key="u.user_id" :title="u.nickname || '未设置昵称'" :label="`手机: ${u.phone} | 余额: ${u.coin_balance || 0} | 注册: ${(u.created_at || '').slice(0, 10)}`">
        <template #value>
          <van-tag :type="u.status === 'disabled' ? 'danger' : 'success'" style="margin-right:8px;">
            {{ u.status === 'disabled' ? '已禁用' : '正常' }}
          </van-tag>
        </template>
        <template #right-icon>
          <div style="display:flex;gap:4px;align-items:center;">
            <van-button size="mini" @click="showDetail(u)">详情</van-button>
            <van-button size="mini" type="primary" @click="showGrant(u)">发币</van-button>
            <van-button size="mini" :type="u.status === 'disabled' ? 'success' : 'warning'" @click="onToggle(u)">
              {{ u.status === 'disabled' ? '启用' : '禁用' }}
            </van-button>
          </div>
        </template>
      </van-cell>
    </van-list>

    <!-- User detail dialog -->
    <van-dialog v-model:show="detailVisible" title="用户详情" :show-confirm-button="true" confirm-text="关闭">
      <div v-if="detailUser" class="user-detail">
        <van-cell-group>
          <van-cell title="用户ID" :value="detailUser.user_id" />
          <van-cell title="昵称" :value="detailUser.nickname || '未设置'" />
          <van-cell title="手机号" :value="detailUser.phone" />
          <van-cell title="角色" :value="detailUser.role" />
          <van-cell title="状态" :value="detailUser.status || '正常'" />
          <van-cell title="注册时间" :value="(detailUser.created_at || '').slice(0, 19)" />
          <van-cell title="虚拟币余额" :value="detailUser.coin_balance || 0" />
          <van-cell title="累计获得" :value="detailUser.coin_total_earned || 0" />
          <van-cell title="累计消费" :value="detailUser.coin_total_spent || 0" />
          <van-cell title="错题本条数" :value="detailUser.wrong_book_count || 0" />
          <van-cell title="动态数" :value="detailUser.posts_count || 0" />
          <van-cell title="考试次数" :value="detailUser.exam_sessions_count || 0" />
        </van-cell-group>
      </div>
    </van-dialog>

    <!-- Grant coins dialog -->
    <van-dialog v-model:show="grantVisible" title="调整虚拟币" show-cancel-button @confirm="onGrant">
      <van-field v-model="grantAmount" type="number" label="数量" placeholder="正数增加，负数扣除" />
      <van-field v-model="grantReason" label="原因" placeholder="操作原因（必填）" />
    </van-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import request from '../../api/request'

const router = useRouter()
const keyword = ref('')
const users = ref([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

// Detail
const detailVisible = ref(false)
const detailUser = ref(null)

// Grant
const grantVisible = ref(false)
const grantAmount = ref('')
const grantReason = ref('')
let grantTarget = null

function reload() {
  page.value = 1
  finished.value = false
  users.value = []
  loadUsers()
}

async function loadUsers() {
  loading.value = true
  try {
    const res = await request.get('/admin/users', {
      params: { keyword: keyword.value, page: page.value, page_size: 20 },
    })
    const list = res.data.list || []
    if (page.value === 1) users.value = list
    else users.value.push(...list)
    if (list.length < 20) finished.value = true
    page.value++
  } catch {} finally { loading.value = false }
}

async function showDetail(u) {
  try {
    const res = await request.get('/admin/users_detail', { params: { id: u.user_id } })
    detailUser.value = res.data
    detailVisible.value = true
  } catch {}
}

function showGrant(u) {
  grantTarget = u
  grantAmount.value = ''
  grantReason.value = ''
  grantVisible.value = true
}

async function onGrant() {
  if (!grantAmount.value) return showToast('请输入数量')
  if (!grantReason.value) return showToast('请填写原因（必填）')
  try {
    await request.post('/admin/user_coin_grant', {
      user_id: grantTarget.user_id,
      amount: Number(grantAmount.value),
      reason: grantReason.value,
    })
    showToast(Number(grantAmount.value) > 0 ? '发放成功' : '扣除成功')
    reload()
  } catch {}
}

async function onToggle(u) {
  const action = u.status === 'disabled' ? '启用' : '禁用'
  try {
    await showConfirmDialog({ title: `确认${action}`, message: `确定要${action}用户 ${u.nickname || u.phone} 吗？` })
    await request.post('/admin/user_toggle_status', { user_id: u.user_id })
    showToast(`已${action}`)
    reload()
  } catch {}
}
</script>

<style scoped>
.user-detail { max-height: 60vh; overflow-y: auto; padding: 8px 0; }
</style>
