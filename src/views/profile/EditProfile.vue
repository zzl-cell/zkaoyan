<template>
  <div class="edit-profile">
    <van-nav-bar title="编辑资料" left-arrow @click-left="router.back()" right-text="保存" @click-right="onSave" />
    <van-cell-group>
      <!-- Avatar -->
      <van-cell title="头像" is-link center @click="triggerAvatarUpload">
        <template #right-icon>
          <van-image round width="32" height="32" :src="form.avatar || ''" />
        </template>
      </van-cell>
      <input ref="avatarInput" type="file" accept="image/*" style="display: none;" @change="onAvatarChange" />

      <!-- Nickname -->
      <van-field v-model="form.nickname" label="昵称" placeholder="请输入昵称" maxlength="20" show-word-limit />

      <!-- Bio -->
      <van-field v-model="form.bio" label="简介" type="textarea" placeholder="介绍一下自己" maxlength="100" rows="2" show-word-limit />

      <!-- Grade -->
      <van-cell title="年级" is-link :value="gradeLabel" @click="showGrade = true" />

      <!-- Exam goals -->
      <van-cell title="备考目标" is-link :value="examGoalLabel" @click="showExamGoal = true" />

      <!-- Interest tags -->
      <van-cell title="兴趣标签" is-link @click="showTags = true" />
    </van-cell-group>

    <!-- Grade picker -->
    <van-action-sheet v-model:show="showGrade" title="选择年级">
      <van-picker
        :columns="gradeColumns"
        @confirm="onGradeConfirm"
        @cancel="showGrade = false"
      />
    </van-action-sheet>

    <!-- Exam goal picker -->
    <van-action-sheet v-model:show="showExamGoal" title="备考目标">
      <van-checkbox-group v-model="selectedGoals">
        <van-cell-group>
          <van-cell v-for="g in examGoalOptions" :key="g.value" :title="g.text" clickable @click="toggleGoal(g.value)">
            <template #right-icon><van-checkbox :name="g.value" /></template>
          </van-cell>
        </van-cell-group>
      </van-checkbox-group>
      <div style="padding: 16px;">
        <van-button block type="primary" @click="showExamGoal = false">确定</van-button>
      </div>
    </van-action-sheet>

    <!-- Interest tags -->
    <van-action-sheet v-model:show="showTags" title="兴趣学科">
      <div style="padding: 16px;">
        <van-checkbox-group v-model="selectedTags" direction="horizontal" style="display: flex; flex-wrap: wrap; gap: 8px;">
          <van-checkbox v-for="t in tagOptions" :key="t" :name="t" shape="square">{{ t }}</van-checkbox>
        </van-checkbox-group>
        <div style="margin-top: 16px;">
          <van-button block type="primary" @click="showTags = false">确定</van-button>
        </div>
      </div>
    </van-action-sheet>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { showToast } from 'vant'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  nickname: '',
  bio: '',
  avatar: '',
  grade: '',
  exam_goals: [],
})

const showGrade = ref(false)
const showExamGoal = ref(false)
const showTags = ref(false)
const avatarInput = ref(null)
const selectedGoals = ref([])
const selectedTags = ref([])

const gradeColumns = [
  { text: '大一', value: 'freshman' },
  { text: '大二', value: 'sophomore' },
  { text: '大三', value: 'junior' },
  { text: '大四', value: 'senior' },
]

const gradeLabel = computed(() => {
  const g = gradeColumns.find((c) => c.value === form.grade)
  return g ? g.text : '未设置'
})

const examGoalOptions = [
  { text: '期末考试', value: 'final' },
  { text: '考研', value: 'postgraduate' },
  { text: '考证', value: 'certificate' },
  { text: '其他', value: 'other' },
]

const examGoalLabel = computed(() => {
  if (!selectedGoals.value.length) return '未设置'
  return examGoalOptions.filter((g) => selectedGoals.value.includes(g.value)).map((g) => g.text).join('、')
})

const tagOptions = [
  '微观经济学', '宏观经济学', '英语', '中级财务会计',
  '高等数学', '线性代数', '概率论与数理统计', '统计学', '管理学',
]

onMounted(() => {
  const info = userStore.userInfo
  if (info) {
    form.nickname = info.nickname || ''
    form.bio = info.bio || ''
    form.avatar = info.avatar || ''
    form.grade = info.grade || ''
    selectedGoals.value = info.exam_goals || []
    selectedTags.value = info.interest_tags || []
  }
})

function onGradeConfirm({ selectedOptions }) {
  form.grade = selectedOptions[0]?.value || ''
  showGrade.value = false
}

function toggleGoal(value) {
  const idx = selectedGoals.value.indexOf(value)
  if (idx >= 0) {
    selectedGoals.value.splice(idx, 1)
  } else {
    selectedGoals.value.push(value)
  }
}

function triggerAvatarUpload() {
  avatarInput.value?.click()
}

function onAvatarChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    showToast('头像大小不能超过2MB')
    return
  }
  // TODO: Upload to object storage, get URL
  // For now, create local preview
  const reader = new FileReader()
  reader.onload = (ev) => {
    form.avatar = ev.target.result
  }
  reader.readAsDataURL(file)
}

async function onSave() {
  if (!form.nickname.trim()) {
    showToast('请输入昵称')
    return
  }
  try {
    await userStore.updateProfile({
      nickname: form.nickname,
      bio: form.bio,
      avatar: form.avatar,
      grade: form.grade,
      exam_goals: selectedGoals.value,
    })
    showToast('保存成功')
    router.back()
  } catch (err) {
    showToast(err.message || '保存失败')
  }
}
</script>
