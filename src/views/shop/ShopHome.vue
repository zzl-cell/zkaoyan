<template>
  <div class="shop-home">
    <div class="page-header">
      <div class="header-title">资料</div>
      <van-icon name="bag-o" size="20" @click="router.push('/shop/library')" />
    </div>

    <!-- Category scroll bar (always visible) -->
    <div class="category-bar">
      <div
        v-for="cat in dynamicCategories"
        :key="cat"
        class="category-chip"
        :class="{ active: selectedCategory === cat }"
        @click="selectCategory(cat)"
      >
        {{ cat }}
      </div>
    </div>

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
          :desc="p.is_question_bank ? `${p.question_count}道题` : (p.description || '').slice(0, 20)"
          :thumb="p.cover_url || p.cover_image || ''"
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

function selectCategory(cat) {
  selectedCategory.value = cat
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
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px; background: #fff;
}
.header-title { font-size: 16px; font-weight: 600; }
.category-bar {
  display: flex; gap: 8px; padding: 10px 16px;
  background: #fff; overflow-x: auto; -webkit-overflow-scrolling: touch;
  border-bottom: 1px solid #f5f5f5;
}
.category-bar::-webkit-scrollbar { display: none; }
.category-chip {
  flex-shrink: 0; padding: 6px 14px; border-radius: 16px;
  background: #F5F7FA; font-size: 13px; color: #666;
  cursor: pointer; border: 1.5px solid transparent; transition: all 0.2s;
  white-space: nowrap;
}
.category-chip.active { background: #E8F4FD; border-color: #1989fa; color: #1989fa; font-weight: 500; }
</style>
