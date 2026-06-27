<template>
  <div class="admin-notices">
    <van-nav-bar title="公告管理" left-arrow @click-left="router.back()">
      <template #right><van-icon name="plus" size="20" @click="openCreate" /></template>
    </van-nav-bar>

    <van-list v-model:loading="loading" :finished="finished" finished-text="没有更多了" @load="loadNotices">
      <van-swipe-cell v-for="n in notices" :key="n.notice_id">
        <van-cell :title="n.title" :label="noticeLabel(n)">
          <template #value>
            <div style="display: flex; gap: 4px; justify-content: flex-end; align-items: center;">
              <van-tag v-if="n.is_pinned" type="danger" size="small">置顶</van-tag>
              <van-tag size="small">{{ n.type }}</van-tag>
            </div>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="primary" text="编辑" @click="onEdit(n)" />
          <van-button square :type="n.is_pinned ? 'default' : 'warning'" :text="n.is_pinned ? '取消置顶' : '置顶'" @click="onTogglePin(n)" />
          <van-button square type="danger" text="删除" @click="onDelete(n)" />
        </template>
      </van-swipe-cell>
    </van-list>

    <!-- Create/Edit dialog -->
    <van-popup v-model:show="showForm" position="bottom" round style="max-height: 85vh;">
      <div class="form-popup">
        <div class="form-title">{{ editingId ? '编辑公告' : '发布公告' }}</div>
        <van-field v-model="form.title" label="标题" placeholder="公告标题" />
        <van-field v-model="form.content" type="textarea" label="内容" placeholder="公告内容" rows="5" />
        <van-field v-model="form.type" label="类型" is-link readonly @click="showTypePicker = true" />
        <van-cell title="置顶" center>
          <template #right-icon>
            <van-switch v-model="form.is_pinned" size="22" />
          </template>
        </van-cell>
        <van-button block type="primary" style="margin-top: 12px;" :loading="submitting" @click="onSubmit">
          {{ editingId ? '保存' : '发布' }}
        </van-button>
      </div>
    </van-popup>

    <!-- Type picker -->
    <van-popup v-model:show="showTypePicker" position="bottom" round>
      <van-picker :columns="['system','activity','update','exam']" @confirm="onTypeConfirm" @cancel="showTypePicker = false" />
    </van-popup>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog, showConfirmDialog } from 'vant'
import request from '../../api/request'

const router = useRouter()
const notices = ref([])
const loading = ref(false)
const finished = ref(false)
const page = ref(1)

const showForm = ref(false)
const editingId = ref('')
const submitting = ref(false)
const showTypePicker = ref(false)

const form = ref({
  title: '',
  content: '',
  type: 'system',
  is_pinned: false,
})

function noticeLabel(n) {
  const parts = []
  if (n.created_at) parts.push(n.created_at.slice(0, 10))
  return parts.join(' · ')
}

function openCreate() {
  editingId.value = ''
  form.value = { title: '', content: '', type: 'system', is_pinned: false }
  showForm.value = true
}

function onEdit(n) {
  editingId.value = n.notice_id
  form.value = {
    title: n.title || '',
    content: n.content || '',
    type: n.type || 'system',
    is_pinned: !!n.is_pinned,
  }
  showForm.value = true
}

function onTypeConfirm({ selectedValues }) {
  form.value.type = selectedValues[0]
  showTypePicker.value = false
}

async function loadNotices() {
  loading.value = true
  try {
    const res = await request.get('/admin/notices', { params: { page: page.value, page_size: 20 } })
    const list = res.data.list || res.data || []
    if (page.value === 1) notices.value = list
    else notices.value.push(...list)
    if (list.length < 20) finished.value = true
    page.value++
  } catch {} finally { loading.value = false }
}

async function onSubmit() {
  if (!form.value.title.trim()) return showToast('请填写标题')
  if (!form.value.content.trim()) return showToast('请填写内容')

  submitting.value = true
  try {
    if (editingId.value) {
      await request.post('/admin/notices_update', {
        notice_id: editingId.value,
        ...form.value,
      })
      showToast('更新成功')
    } else {
      await request.post('/admin/notices', form.value)
      showToast('发布成功')
    }
    showForm.value = false
    page.value = 1; finished.value = false; notices.value = []
    loadNotices()
  } catch (err) {
    showToast(err.message || '操作失败')
  } finally { submitting.value = false }
}

async function onTogglePin(n) {
  try {
    await request.post('/admin/notices_update', {
      notice_id: n.notice_id,
      is_pinned: !n.is_pinned,
    })
    n.is_pinned = n.is_pinned ? 0 : 1
    showToast(n.is_pinned ? '已置顶' : '已取消置顶')
  } catch {}
}

async function onDelete(n) {
  try {
    await showConfirmDialog({ title: '确认删除', message: n.title })
    await request.delete(`/admin/notices/${n.notice_id}`)
    showToast('已删除')
    notices.value = notices.value.filter(item => item.notice_id !== n.notice_id)
  } catch {}
}
</script>

<style scoped>
.admin-notices { min-height: 100vh; background: #f7f8fa; }
.form-popup { padding: 16px; }
.form-title { font-size: 16px; font-weight: 500; margin-bottom: 12px; }
</style>
