import { createRouter, createWebHistory } from 'vue-router'
import { getToken, clearAll } from '../utils/storage'
import { isTokenExpired } from '../utils/auth'

// TabBar layout component
const TabBarLayout = () => import('../components/common/TabBarLayout.vue')

// ========================
// Recommend Tab routes
// ========================
const recommendRoutes = [
  {
    path: '/recommend',
    name: 'RecommendFeed',
    component: () => import('../views/recommend/RecommendFeed.vue'),
    meta: { title: '推荐', showTabBar: true },
  },
  {
    path: '/recommend/following',
    name: 'FollowingFeed',
    component: () => import('../views/recommend/FollowingFeed.vue'),
    meta: { title: '关注', showTabBar: true },
  },
  {
    path: '/recommend/post/create',
    name: 'CreatePost',
    component: () => import('../views/recommend/CreatePost.vue'),
    meta: { title: '发布动态', showTabBar: false },
  },
  {
    path: '/recommend/post/:id',
    name: 'PostDetail',
    component: () => import('../views/recommend/PostDetail.vue'),
    meta: { title: '动态详情', showTabBar: true },
  },
  {
    path: '/recommend/search',
    name: 'Search',
    component: () => import('../views/recommend/Search.vue'),
    meta: { title: '搜索', showTabBar: false },
  },
  {
    path: '/recommend/user/:id',
    name: 'UserSpace',
    component: () => import('../views/recommend/UserSpace.vue'),
    meta: { title: '用户空间', showTabBar: true },
  },
]

// ========================
// Practice Tab routes
// ========================
const practiceRoutes = [
  {
    path: '/practice',
    name: 'PracticeHome',
    component: () => import('../views/practice/PracticeHome.vue'),
    meta: { title: '练习', showTabBar: true },
  },
  {
    path: '/practice/sprint',
    name: 'SprintPapers',
    component: () => import('../views/practice/SprintPapers.vue'),
    meta: { title: '考前冲刺', showTabBar: true },
  },
  {
    path: '/practice/exam/:sessionId',
    name: 'ExamPage',
    component: () => import('../views/practice/ExamPage.vue'),
    meta: { title: '答题', showTabBar: false },
  },
  {
    path: '/practice/result/:sessionId',
    name: 'ExamResult',
    component: () => import('../views/practice/ExamResult.vue'),
    meta: { title: '成绩报告', showTabBar: true },
  },
  {
    path: '/practice/wrongbook',
    name: 'WrongBook',
    component: () => import('../views/practice/WrongBook.vue'),
    meta: { title: '错题本', showTabBar: true },
  },
  {
    path: '/practice/favorites',
    name: 'FavoriteQuestions',
    component: () => import('../views/practice/FavoriteQuestions.vue'),
    meta: { title: '收藏题目', showTabBar: true },
  },
  {
    path: '/practice/history',
    name: 'StudyHistory',
    component: () => import('../views/practice/StudyHistory.vue'),
    meta: { title: '刷题记录', showTabBar: true },
  },
]

// ========================
// Shop Tab routes
// ========================
const shopRoutes = [
  {
    path: '/shop',
    name: 'ShopHome',
    component: () => import('../views/shop/ShopHome.vue'),
    meta: { title: '资料', showTabBar: true },
  },
  {
    path: '/shop/product/:id',
    name: 'ProductDetail',
    component: () => import('../views/shop/ProductDetail.vue'),
    meta: { title: '资料详情', showTabBar: true },
  },
  {
    path: '/shop/order/confirm',
    name: 'OrderConfirm',
    component: () => import('../views/shop/OrderConfirm.vue'),
    meta: { title: '确认订单', showTabBar: false },
  },
  {
    path: '/shop/order/result',
    name: 'OrderResult',
    component: () => import('../views/shop/OrderResult.vue'),
    meta: { title: '支付结果', showTabBar: false },
  },
  {
    path: '/shop/library',
    name: 'MyLibrary',
    component: () => import('../views/shop/MyLibrary.vue'),
    meta: { title: '我的资料库', showTabBar: true },
  },
  {
    path: '/shop/view/:assetId',
    name: 'AssetView',
    component: () => import('../views/shop/AssetView.vue'),
    meta: { title: '查看资料', showTabBar: false },
  },
  {
    path: '/shop/correction/:productId',
    name: 'CorrectionSubmit',
    component: () => import('../views/shop/CorrectionSubmit.vue'),
    meta: { title: '提交纠错', showTabBar: false },
  },
]

// ========================
// Notice routes (under Recommend tab)
// ========================
const noticeRoutes = [
  {
    path: '/recommend/notice',
    name: 'NoticeList',
    component: () => import('../views/notice/NoticeList.vue'),
    meta: { title: '公告', showTabBar: true },
  },
  {
    path: '/recommend/notice/:id',
    name: 'NoticeDetail',
    component: () => import('../views/notice/NoticeDetail.vue'),
    meta: { title: '公告详情', showTabBar: true },
  },
  // Legacy redirects
  { path: '/notice', redirect: '/recommend/notice' },
  { path: '/notice/:id', redirect: (to) => `/recommend/notice/${to.params.id}` },
]

// ========================
// Profile Tab routes
// ========================
const profileRoutes = [
  {
    path: '/profile',
    name: 'ProfileHome',
    component: () => import('../views/profile/ProfileHome.vue'),
    meta: { title: '我的', showTabBar: true },
  },
  {
    path: '/profile/edit',
    name: 'EditProfile',
    component: () => import('../views/profile/EditProfile.vue'),
    meta: { title: '编辑资料', showTabBar: true },
  },
  {
    path: '/profile/badges',
    name: 'BadgeWall',
    component: () => import('../views/profile/BadgeWall.vue'),
    meta: { title: '勋章墙', showTabBar: true },
  },
  {
    path: '/profile/following',
    name: 'FollowingList',
    component: () => import('../views/profile/FollowingList.vue'),
    meta: { title: '关注', showTabBar: true },
  },
  {
    path: '/profile/followers',
    name: 'FollowersList',
    component: () => import('../views/profile/FollowersList.vue'),
    meta: { title: '粉丝', showTabBar: true },
  },
  {
    path: '/profile/coin',
    name: 'CoinAccount',
    component: () => import('../views/profile/CoinAccount.vue'),
    meta: { title: '虚拟币', showTabBar: true },
  },
  {
    path: '/profile/coin/prob-log',
    name: 'ProbLog',
    component: () => import('../views/profile/ProbLog.vue'),
    meta: { title: '概率日志', showTabBar: true },
  },
  {
    path: '/profile/messages',
    name: 'Messages',
    component: () => import('../views/profile/Messages.vue'),
    meta: { title: '消息', showTabBar: true },
  },
  {
    path: '/profile/settings',
    name: 'Settings',
    component: () => import('../views/profile/Settings.vue'),
    meta: { title: '设置', showTabBar: true },
  },
  {
    path: '/profile/questions',
    name: 'QuestionsList',
    component: () => import('../views/profile/QuestionsList.vue'),
    meta: { title: '我的题库', showTabBar: true },
  },
  {
    path: '/profile/questions/:productId',
    name: 'BankQuestions',
    component: () => import('../views/profile/BankQuestions.vue'),
    meta: { title: '题库详情', showTabBar: true },
  },
  {
    path: '/profile/settings/privacy',
    name: 'PrivacySettings',
    component: () => import('../views/profile/PrivacySettings.vue'),
    meta: { title: '隐私设置', showTabBar: true },
  },
  {
    path: '/profile/settings/password',
    name: 'ChangePassword',
    component: () => import('../views/profile/ChangePassword.vue'),
    meta: { title: '修改密码', showTabBar: true },
  },
  {
    path: '/profile/settings/change-phone',
    name: 'ChangePhone',
    component: () => import('../views/profile/ChangePhone.vue'),
    meta: { title: '换绑手机', showTabBar: true },
  },
  {
    path: '/profile/settings/feedback',
    name: 'Feedback',
    component: () => import('../views/profile/Feedback.vue'),
    meta: { title: '意见反馈', showTabBar: true },
  },
  {
    path: '/profile/settings/agreement',
    name: 'Agreement',
    component: () => import('../views/profile/Agreement.vue'),
    meta: { title: '用户协议', showTabBar: true },
  },
  {
    path: '/profile/settings/privacy-policy',
    name: 'PrivacyPolicy',
    component: () => import('../views/profile/PrivacyPolicy.vue'),
    meta: { title: '隐私策略', showTabBar: true },
  },
  {
    path: '/profile/settings/about',
    name: 'About',
    component: () => import('../views/profile/About.vue'),
    meta: { title: '关于我们', showTabBar: true },
  },
  {
    path: '/profile/favorites-posts',
    name: 'FavoritePosts',
    component: () => import('../views/profile/FavoritePosts.vue'),
    meta: { title: '收藏动态', showTabBar: true },
  },
  {
    path: '/profile/correction-rank',
    name: 'CorrectionRank',
    component: () => import('../views/profile/CorrectionRank.vue'),
    meta: { title: '纠错排行榜', showTabBar: true },
  },
]

// ========================
// Auth routes (no TabBar)
// ========================
const authRoutes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/Login.vue'),
    meta: { title: '登录', showTabBar: false },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/auth/Register.vue'),
    meta: { title: '注册', showTabBar: false },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/auth/ResetPassword.vue'),
    meta: { title: '重置密码', showTabBar: false },
  },
]

// ========================
// Deep link redirects
// ========================
const deepLinkRoutes = [
  { path: '/post/:id', redirect: (to) => `/recommend/post/${to.params.id}` },
  { path: '/user/:id', redirect: (to) => `/recommend/user/${to.params.id}` },
  { path: '/product/:id', redirect: (to) => `/shop/product/${to.params.id}` },
]

// ========================
// Router instance
// ========================
const routes = [
  {
    path: '/',
    component: TabBarLayout,
    children: [
      ...recommendRoutes,
      ...practiceRoutes,
      ...shopRoutes,
      ...noticeRoutes,
      ...profileRoutes,
    ],
  },
  ...authRoutes,
  ...deepLinkRoutes,
  { path: '/:pathMatch(.*)*', redirect: '/recommend' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Free-login whitelist
const whiteList = ['/login', '/register', '/reset-password', '/recommend/notice', '/recommend/notice/:id']
const productDetailPattern = /^\/shop\/product\/\w+$/

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - Z考研` : 'Z考研'
  const token = getToken()

  if (token) {
    // Check JWT expiry before allowing navigation
    if (isTokenExpired()) {
      clearAll()
      next(`/login?redirect=${to.fullPath}`)
      return
    }
    next()
  } else if (
    whiteList.some((p) => to.path === p || to.path.startsWith(p.replace(/:.*$/, ''))) ||
    productDetailPattern.test(to.path)
  ) {
    next()
  } else {
    next(`/login?redirect=${to.fullPath}`)
  }
})

export default router
