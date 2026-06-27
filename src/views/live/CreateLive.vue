<template>
  <div class="create-live">
    <van-nav-bar title="开播设置" left-arrow @click-left="router.back()" />

    <van-form @submit="onSubmit">
      <van-cell-group inset style="margin-top: 16px;">
        <van-field
          v-model="form.title"
          label="直播标题"
          placeholder="给直播间起个标题"
          :rules="[{ required: true, message: '请填写直播标题' }]"
          maxlength="50"
          show-word-limit
        />
        <van-field v-model="form.cover_image" label="封面图" placeholder="输入图片URL（可选）" />
        <van-cell title="是否付费" center>
          <template #right-icon>
            <van-switch v-model="isPaid" size="22" />
          </template>
        </van-cell>
        <van-field v-if="isPaid" v-model.number="form.price" label="价格" type="number" placeholder="虚拟币数量" />
        <van-field v-model.number="form.max_viewers" label="最大人数" type="number" placeholder="100" />
        <van-cell title="公开回放" label="结束后是否公开回放" center>
          <template #right-icon>
            <van-switch v-model="form.is_replay_public" size="22" />
          </template>
        </van-cell>
      </van-cell-group>

      <div style="padding: 16px;">
        <van-button block type="primary" native-type="submit" :loading="submitting" size="large">
          开始直播
        </van-button>
      </div>
    </van-form>

    <!-- 提示 -->
    <van-cell-group inset style="margin-top: 8px;">
      <van-cell title="提示" label="创建成功后将获得推流地址，使用 OBS 等工具推流即可开始直播。推流地址需在腾讯云配置后才会生效。" />
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '../../stores/user'
import request from '../../api/request'

const router = useRouter()
const userStore = useUserStore()
const submitting = ref(false)
const isPaid = ref(false)

const form = ref({
  title: '',
  cover_image: '',
  price: 0,
  max_viewers: 100,
  is_replay_public: true,
})

// 角色守卫：仅 teacher 和 admin 可访问
onMounted(() => {
  const role = userStore.userInfo?.role
  if (role !== 'teacher' && role !== 'admin') {
    showToast('仅讲师和管理员可开播')
    router.replace('/live')
  }
})

async function onSubmit() {
  if (!form.value.title.trim()) return showToast('请填写直播标题')
  submitting.value = true
  try {
    const payload = {
      title: form.value.title.trim(),
      cover_image: form.value.cover_image || '',
      type: isPaid.value ? 'paid' : 'free',
      price: isPaid.value ? (form.value.price || 0) : 0,
      max_viewers: form.value.max_viewers || 100,
      is_replay_public: form.value.is_replay_public,
    }
    const res = await request.post('/live/create', payload)
    showToast('创建成功')
    router.replace(`/live/${res.data.room_id}`)
  } catch (err) {
    showToast(err.message || '直播服务暂未开放')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.create-live { min-height: 100vh; background: #f7f8fa; }
</style>
