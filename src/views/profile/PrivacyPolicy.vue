<template>
  <div class="privacy-policy-page">
    <van-nav-bar title="隐私策略" left-arrow @click-left="router.back()" />
    <div class="content">
      <h2><span class="brand">Z考研</span> 隐私策略</h2>
      <p class="update-date">更新日期：2026年6月1日</p>

      <h3>一、信息收集</h3>
      <p>我们收集以下信息以提供服务：</p>
      <p>1. <strong>账号信息</strong>：手机号、昵称、头像等注册信息。</p>
      <p>2. <strong>学习数据</strong>：刷题记录、错题本、收藏、成绩等学习行为数据。</p>
      <p>3. <strong>设备信息</strong>：设备型号、操作系统版本、网络状态等基础信息。</p>

      <h3>二、信息使用</h3>
      <p>我们使用收集的信息用于：</p>
      <p>1. 提供、维护和改进我们的服务。</p>
      <p>2. 个性化您的学习体验（如推荐题目、统计分析）。</p>
      <p>3. 保障账号安全和平台安全。</p>
      <p>4. 向您发送服务通知（如系统更新、活动信息）。</p>

      <h3>三、信息存储与保护</h3>
      <p>1. 您的数据存储在安全的云服务器上，采用加密传输和存储。</p>
      <p>2. 我们采取合理的技术和管理措施保护您的个人信息安全。</p>
      <p>3. 未经您的同意，我们不会向第三方披露您的个人信息。</p>

      <h3>四、信息共享</h3>
      <p>除以下情况外，我们不会共享您的个人信息：</p>
      <p>1. 获得您的明确同意。</p>
      <p>2. 法律法规要求或政府机关依法要求。</p>
      <p>3. 为保护平台、用户或公众的合法权益所必需。</p>

      <h3>五、Cookie 和本地存储</h3>
      <p>我们使用 localStorage 存储您的登录凭证（Token）和偏好设置。这些数据仅存储在您的设备上，您可随时通过清除浏览器数据来删除。</p>

      <h3>六、您的权利</h3>
      <p>1. <strong>访问权</strong>：您可随时查看您的个人信息和学习数据。</p>
      <p>2. <strong>更正权</strong>：您可随时修改您的个人资料。</p>
      <p>3. <strong>删除权</strong>：您可申请删除特定数据或注销账号。</p>
      <p>4. <strong>撤回同意</strong>：您可随时撤回对特定信息处理的同意。</p>

      <h3>七、未成年人保护</h3>
      <p>如果您是未满18周岁的未成年人，请在监护人的陪同下阅读本策略，并在取得监护人同意后使用我们的服务。</p>

      <h3>八、策略更新</h3>
      <p>我们可能会不时更新本策略。更新后的策略将在平台内公告。继续使用我们的服务即表示您同意更新后的策略。</p>

      <h3>九、联系我们</h3>
      <p>如您对本策略有任何疑问，可通过"意见反馈"功能联系我们。</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.privacy-policy-page { min-height: 100vh; background: #fff; }
.content { padding: 16px; line-height: 1.8; }
.content h2 { font-size: 22px; text-align: center; margin-bottom: 4px; color: #333; }
.update-date { text-align: center; font-size: 12px; color: #999; margin-bottom: 20px; }
.content h3 { font-size: 15px; color: #333; margin: 16px 0 8px; }
.content p { font-size: 14px; color: #555; margin-bottom: 6px; }
.brand { color: #1989fa; font-weight: bold; }
</style>
