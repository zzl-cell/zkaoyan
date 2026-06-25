<template>
  <div class="privacy-settings">
    <van-nav-bar title="隐私设置" left-arrow @click-left="router.back()" />

    <!-- Personal data visibility -->
    <van-cell-group title="个人数据可见性">
      <van-cell title="刷题总数">
        <template #right-icon>
          <van-switch v-model="settings.totalQuestions" active-value="公开" inactive-value="仅自己" size="20" @change="onSettingChange" />
        </template>
      </van-cell>
      <van-cell title="正确率">
        <template #right-icon>
          <van-switch v-model="settings.accuracy" active-value="公开" inactive-value="仅自己" size="20" @change="onSettingChange" />
        </template>
      </van-cell>
      <van-cell title="学习时长">
        <template #right-icon>
          <van-switch v-model="settings.studyTime" active-value="公开" inactive-value="仅自己" size="20" @change="onSettingChange" />
        </template>
      </van-cell>
      <van-cell title="连签天数">
        <template #right-icon>
          <van-switch v-model="settings.streak" active-value="公开" inactive-value="仅自己" size="20" @change="onSettingChange" />
        </template>
      </van-cell>
    </van-cell-group>

    <!-- Community visibility -->
    <van-cell-group title="社区可见性">
      <van-cell title="动态列表" is-link :value="settings.dynamicList" @click="showPicker('dynamicList', ['公开', '仅关注者', '仅自己'])" />
      <van-cell title="勋章墙" is-link :value="settings.badgeWall" @click="showPicker('badgeWall', ['公开', '仅自己'])" />
      <van-cell title="粉丝列表" is-link :value="settings.followers" @click="showPicker('followers', ['公开', '仅自己'])" />
      <van-cell title="关注列表" is-link :value="settings.following" @click="showPicker('following', ['公开', '仅自己'])" />
      <van-cell title="纠错排行榜" is-link :value="settings.correctionRank" @click="showPicker('correctionRank', ['公开', '隐藏'])" />
    </van-cell-group>

    <!-- Private account -->
    <van-cell-group title="私密账号">
      <van-cell title="私密账号" label="开启后所有数据对外隐藏，动态仅粉丝可见">
        <template #right-icon>
          <van-switch v-model="isPrivate" size="20" @change="onPrivateToggle" />
        </template>
      </van-cell>
    </van-cell-group>

    <div style="padding: 16px;">
      <van-button block type="primary" @click="onSave" :loading="saving">保存</van-button>
    </div>

    <!-- Value picker -->
    <van-action-sheet v-model:show="pickerVisible" :title="pickerTitle">
      <van-picker
        :columns="pickerOptions"
        @confirm="onPickerConfirm"
        @cancel="pickerVisible = false"
      />
    </van-action-sheet>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()
const userStore = useUserStore()
const saving = ref(false)

const settings = reactive({
  totalQuestions: '公开',
  accuracy: '公开',
  studyTime: '仅自己',
  streak: '仅自己',
  dynamicList: '公开',
  badgeWall: '公开',
  followers: '公开',
  following: '公开',
  correctionRank: '公开',
})

const isPrivate = ref(false)

// Picker state
const pickerVisible = ref(false)
const pickerTitle = ref('')
const pickerOptions = ref([])
const pickerField = ref('')

onMounted(async () => {
  try {
    await userStore.fetchPrivacy()
    const ps = userStore.privacySettings
    Object.keys(settings).forEach((key) => {
      if (ps[key] !== undefined) settings[key] = ps[key]
    })
    isPrivate.value = userStore.isPrivate
  } catch {}
})

function showPicker(field, options) {
  pickerField.value = field
  pickerTitle.value = {
    dynamicList: '动态列表', badgeWall: '勋章墙',
    followers: '粉丝列表', following: '关注列表', correctionRank: '纠错排行榜',
  }[field] || field
  pickerOptions.value = options.map((o) => ({ text: o, value: o }))
  pickerVisible.value = true
}

function onPickerConfirm({ selectedOptions }) {
  settings[pickerField.value] = selectedOptions[0]?.value || ''
  pickerVisible.value = false
  onSettingChange()
}

function onSettingChange() {
  // Settings changed, user needs to save
}

async function onPrivateToggle() {
  try {
    await showConfirmDialog({
      title: isPrivate.value ? '开启私密模式？' : '关闭私密模式？',
      message: isPrivate.value
        ? '开启后，所有历史动态将转为仅自己可见，个人空间对外隐藏。'
        : '关闭后，历史动态将恢复为之前的可见范围。',
    })
    await userStore.togglePrivate()
    showToast(isPrivate.value ? '已开启私密模式' : '已关闭私密模式')
  } catch {
    // User cancelled
    isPrivate.value = !isPrivate.value
  }
}

async function onSave() {
  saving.value = true
  try {
    await userStore.updatePrivacy({ ...settings })
    showToast('保存成功')
    router.back()
  } catch (err) {
    showToast(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>
