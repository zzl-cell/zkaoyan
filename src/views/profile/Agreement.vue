<template>
  <div class="agreement-page">
    <van-nav-bar title="用户协议" left-arrow @click-left="router.back()" />
    <div class="content">
      <h2><span class="brand">Z考研</span> 用户协议</h2>
      <p class="update-date">更新日期：2026年6月1日</p>

      <h3>一、服务条款的确认</h3>
      <p>欢迎您使用<span class="brand">Z考研</span>（以下简称"本平台"）。在使用本平台提供的各项服务之前，请您仔细阅读以下协议条款。一旦您开始使用本平台，即表示您已充分理解并同意本协议。</p>

      <h3>二、账号注册</h3>
      <p>1. 您需要使用手机号注册账号，并妥善保管账号密码。</p>
      <p>2. 您应保证注册信息的真实性、准确性和完整性。</p>
      <p>3. 每个手机号仅能注册一个账号。账号不可转让、赠与或继承。</p>

      <h3>三、虚拟币规则</h3>
      <p>1. 注册即赠送1000虚拟币，用于购买平台内的资料和题库。</p>
      <p>2. 每日签到可获得虚拟币奖励，连续签到奖励递增。</p>
      <p>3. 虚拟币仅限在本平台内使用，不可提现或转让。</p>
      <p>4. 充值获得的虚拟币不支持退款。</p>

      <h3>四、用户行为规范</h3>
      <p>1. 不得发布违法违规、虚假、侵权的内容。</p>
      <p>2. 不得利用平台进行任何形式的欺诈行为。</p>
      <p>3. 不得恶意攻击、干扰平台正常运行。</p>
      <p>4. 违反规范的账号将被限制功能或永久封禁。</p>

      <h3>五、知识产权</h3>
      <p>平台内的题目、资料等内容的知识产权归平台或原始权利人所有。未经授权，不得复制、传播或用于商业用途。</p>

      <h3>六、免责声明</h3>
      <p>1. 题目内容仅供参考学习，不保证考试通过。</p>
      <p>2. 因网络、设备等原因导致的服务中断，平台不承担责任。</p>
      <p>3. 第三方资料的准确性由提供方负责。</p>

      <h3>七、账号注销</h3>
      <p>您可随时申请注销账号。注销后，您的数据将被删除且无法恢复。未使用的虚拟币将不予退还。</p>

      <h3>八、协议修改</h3>
      <p>平台有权根据运营需要修改本协议，修改后的协议将在平台内公告。如您不同意修改内容，可停止使用平台并申请注销账号。</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.agreement-page { min-height: 100vh; background: #fff; }
.content { padding: 16px; line-height: 1.8; }
.content h2 { font-size: 22px; text-align: center; margin-bottom: 4px; color: #333; }
.update-date { text-align: center; font-size: 12px; color: #999; margin-bottom: 20px; }
.content h3 { font-size: 15px; color: #333; margin: 16px 0 8px; }
.content p { font-size: 14px; color: #555; margin-bottom: 6px; }
.brand { color: #1989fa; font-weight: bold; }
</style>
