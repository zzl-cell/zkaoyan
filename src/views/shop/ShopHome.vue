<template>
  <div class="shop-home">
    <van-nav-bar title="资料">
      <template #right>
        <van-icon name="bag-o" size="20" @click="router.push('/shop/library')" />
      </template>
    </van-nav-bar>

    <!-- Category dropdown trigger -->
    <div class="category-trigger" @click="showPanel = !showPanel">
      <span class="trigger-text">{{ selectedCategory }}</span>
      <van-icon :name="showPanel ? 'arrow-up' : 'arrow-down'" size="14" color="#999" />
    </div>

    <!-- Category dropdown panel -->
    <transition name="slide-down">
      <div v-if="showPanel" class="category-panel">
        <div class="category-grid">
          <div
            v-for="cat in visibleCategories"
            :key="cat"
            class="category-cell"
            :class="{ active: selectedCategory === cat }"
            @click="selectCategory(cat)"
          >
            {{ cat }}
          </div>
        </div>
        <div v-if="dynamicCategories.length > 8" class="expand-btn" @click="expanded = !expanded">
          <span>{{ expanded ? '收起' : '展开全部' }}</span>
          <van-icon :name="expanded ? 'arrow-up' : 'arrow-down'" size="12" />
        </div>
      </div>
    </transition>

    <!-- Overlay to close panel -->
    <div v-if="showPanel" class="panel-overlay" @click="showPanel = false" />

    <!-- Sort bar -->
    <van-dropdown-menu @close="onSortChange">
      <van-dropdown-item v-model="sort" :options="sortOptions" />
    </van-dropdown-menu>

    <!-- Product list -->
    <van-loading v-if="shopStore.loading" style="text-align: center; padding: 40px 0;" />

    <template v-else>
      <van-empty v-if="!shopStore.products.length" description="暂无资料" />

      <van-list v-else finished-text="没有更多了">
        <van-card
          v-for="p in shopStore.products"
          :key="p.product_id"
          :title="p.name"
          :price="String(p.price)"
          currency="虚拟币"
          :desc="p.is_question_bank ? `${p.question_count}道题 · 已购${p.sales_count}人` : `已购 ${p.sales_count} 人`"
          :thumb="p.cover_url || ''"
          @click="router.push(`/shop/product/${p.product_id}`)"
        >
          <template #tags>
            <van-tag plain type="primary" style="margin-right: 4px;">{{ p.category }}</van-tag>
            <van-tag v-if="p.is_question_bank" plain type="warning" style="margin-right: 4px;">题库</van-tag>
            <van-tag v-if="p.is_purchased" plain type="success">已购</van-tag>
          </template>
        </van-card>
      </van-list>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useShopStore } from '../../stores/shop'

const router = useRouter()
const shopStore = useShopStore()

const showPanel = ref(false)
const expanded = ref(false)
const selectedCategory = ref('全部')
const sort = ref(0)

const sortOptions = [
  { text: '默认排序', value: 0 },
  { text: '价格升序', value: 1 },
  { text: '价格降序', value: 2 },
  { text: '销量优先', value: 3 },
]

const sortMap = { 0: 'default', 1: 'price_asc', 2: 'price_desc', 3: 'sales' }

// Dynamic categories extracted from loaded products
const dynamicCategories = computed(() => {
  const cats = [...new Set(shopStore.products.map(p => p.category).filter(Boolean))]
  return ['全部', ...cats]
})

const visibleCategories = computed(() => {
  if (expanded.value) return dynamicCategories.value
  return dynamicCategories.value.slice(0, 8)
})

function selectCategory(cat) {
  selectedCategory.value = cat
  showPanel.value = false
  loadProducts()
}

function onSortChange() {
  loadProducts()
}

function loadProducts() {
  const params = {}
  if (selectedCategory.value !== '全部') params.category = selectedCategory.value
  if (sort.value !== 0) params.sort = sortMap[sort.value]
  shopStore.fetchProducts(params)
}

onMounted(() => {
  loadProducts()
})
</script>

<style scoped>
.shop-home { min-height: 100vh; background: #f7f8fa; }
.category-trigger {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 10px 16px; background: #fff; cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
}
.trigger-text { font-size: 14px; color: #333; font-weight: 500; }
.category-panel {
  background: #fff; padding: 12px 16px;
  border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  position: relative; z-index: 101;
}
.category-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.category-cell {
  height: 36px; display: flex; align-items: center; justify-content: center;
  background: #F5F7FA; border-radius: 8px; font-size: 14px; color: #333;
  cursor: pointer; border: 2px solid transparent; transition: all 0.2s;
}
.category-cell.active { background: #E8F4FD; border-color: #1989fa; color: #1989fa; }
.expand-btn {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  padding: 10px 0; font-size: 13px; color: #999; cursor: pointer;
}
.panel-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3); z-index: 100;
}
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0; transform: translateY(-10px);
}
</style>
