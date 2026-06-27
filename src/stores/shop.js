import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getProducts,
  getProductDetail,
  createOrder,
  getMyOrders,
  getMyLibrary,
  getAssetDetail,
} from '../api/shop'
import { useCoinStore } from './coin'

export const useShopStore = defineStore('shop', () => {
  const products = ref([])
  const productDetail = ref(null)
  const orders = ref([])
  const library = ref([])
  const libraryItem = ref(null)
  const loading = ref(false)

  // Fetch product list
  async function fetchProducts(params) {
    loading.value = true
    try {
      const res = await getProducts(params)
      products.value = res.data.products || res.data.list || []
    } finally {
      loading.value = false
    }
  }

  // Fetch product detail
  async function fetchProductDetail(id) {
    const res = await getProductDetail(id)
    productDetail.value = res.data
    return res.data
  }

  // Purchase product with coins
  async function purchaseProduct(productId) {
    const res = await createOrder({ product_id: productId })
    // Sync coin balance
    if (res.data?.balance !== undefined) {
      const coinStore = useCoinStore()
      coinStore.balance = res.data.balance
    }
    return res.data
  }

  // Fetch my orders
  async function fetchOrders() {
    const res = await getMyOrders()
    orders.value = res.data.list
  }

  // Fetch my library
  async function fetchLibrary() {
    const res = await getMyLibrary()
    library.value = res.data.items || res.data.list || []
  }

  // Fetch library item detail
  async function fetchLibraryItem(productId) {
    const res = await getAssetDetail(productId)
    libraryItem.value = res.data
    return res.data
  }

  return {
    products, productDetail, orders, library, libraryItem, loading,
    fetchProducts, fetchProductDetail, purchaseProduct,
    fetchOrders, fetchLibrary, fetchLibraryItem,
  }
})
