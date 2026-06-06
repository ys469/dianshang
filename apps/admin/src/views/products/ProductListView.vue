<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { apiClient, type AdminProduct } from '../../services/api';

const products = ref<AdminProduct[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMsg = ref('');
const searchKeyword = ref('');
const statusFilter = ref<'all' | 'in_stock' | 'low_stock'>('all');

const categoryOptions = [
  { label: '食品生鲜', value: 'food' },
  { label: '美妆护肤', value: 'beauty' },
  { label: '数码家电', value: 'digital' },
  { label: '母婴用品', value: 'baby' },
  { label: '运动户外', value: 'sports' },
  { label: '健康保健', value: 'health' },
  { label: '家居百货', value: 'home' },
  { label: '会员专区', value: 'member' }
];

const createForm = reactive({
  categoryId: 'food',
  name: '',
  subtitle: '',
  description: '',
  image: '',
  price: 59.9,
  memberPrice: 49.9,
  stock: 30,
  tagsText: '新品,会员价'
});

async function loadProducts() {
  products.value = await apiClient.getProducts();
}

onMounted(async () => {
  try {
    await loadProducts();
  } catch {
    errorMsg.value = '加载商品数据失败，请确认 API 服务已启动。';
  } finally {
    loading.value = false;
  }
});

const filteredProducts = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();

  return products.value.filter((product) => {
    const matchesKeyword =
      !keyword ||
      [
        product.name,
        product.subtitle,
        product.description,
        product.categoryName || product.categoryId,
        product.tags.join(' ')
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword);

    if (!matchesKeyword) {
      return false;
    }

    if (statusFilter.value === 'in_stock') {
      return product.stock >= 50;
    }
    if (statusFilter.value === 'low_stock') {
      return product.stock > 0 && product.stock < 50;
    }

    return true;
  });
});

const summaryCards = computed(() => [
  { label: '商品总数', value: `${products.value.length}` },
  { label: '低库存商品', value: `${products.value.filter((item) => item.stock > 0 && item.stock < 50).length}` },
  { label: '今日已售', value: `${products.value.reduce((sum, item) => sum + item.todaySold, 0)}` },
  { label: '累计销量', value: `${products.value.reduce((sum, item) => sum + item.sales, 0)}` }
]);

function getStockClass(stock: number) {
  if (stock >= 50) return 'tag-success';
  if (stock > 0) return 'tag-warning';
  return 'tag-danger';
}

function getStockText(stock: number) {
  if (stock >= 50) return '库存充足';
  if (stock > 0) return '库存偏低';
  return '已售罄';
}

function resetCreateForm() {
  createForm.categoryId = 'food';
  createForm.name = '';
  createForm.subtitle = '';
  createForm.description = '';
  createForm.image = '';
  createForm.price = 59.9;
  createForm.memberPrice = 49.9;
  createForm.stock = 30;
  createForm.tagsText = '新品,会员价';
}

async function handleCreateProduct() {
  const name = createForm.name.trim();
  if (!name) {
    errorMsg.value = '请先填写商品名称。';
    return;
  }

  saving.value = true;
  errorMsg.value = '';

  try {
    const created = await apiClient.createProduct({
      categoryId: createForm.categoryId,
      name,
      subtitle: createForm.subtitle.trim(),
      description: createForm.description.trim(),
      image: createForm.image.trim(),
      price: Number(createForm.price),
      memberPrice: Number(createForm.memberPrice),
      stock: Number(createForm.stock),
      tags: createForm.tagsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    });

    products.value.unshift(created);
    resetCreateForm();
  } catch {
    errorMsg.value = '新增商品失败，请稍后重试。';
  } finally {
    saving.value = false;
  }
}

async function handleStockChange(product: AdminProduct, delta: number) {
  errorMsg.value = '';

  try {
    const updated = await apiClient.updateProductStock(product.id, delta);
    const target = products.value.find((item) => item.id === product.id);
    if (target) {
      Object.assign(target, updated);
    }
  } catch {
    errorMsg.value = delta > 0 ? '补货失败。' : '减库存失败，当前库存可能不足。';
  }
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>商品管理</h3>
        <p>支持新增商品、设置图片和简介，并实时联动库存、今日销量和累计销量。</p>
      </div>
    </div>

    <div v-if="errorMsg" class="info-banner">{{ errorMsg }}</div>

    <section class="stats-grid">
      <article v-for="item in summaryCards" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="create-panel">
      <div class="section-head">
        <h4>新增商品</h4>
        <p>新商品创建后会立刻出现在后台列表，并参与会员下单与销售统计。</p>
      </div>

      <div class="form-grid">
        <label>
          <span>商品名称</span>
          <input v-model="createForm.name" type="text" placeholder="输入商品名称" />
        </label>

        <label>
          <span>所属分类</span>
          <select v-model="createForm.categoryId">
            <option v-for="item in categoryOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label>
          <span>初始库存</span>
          <input v-model="createForm.stock" type="number" min="0" step="1" />
        </label>

        <label class="wide">
          <span>副标题</span>
          <input v-model="createForm.subtitle" type="text" placeholder="例如：门店爆款、会员专享、限时补货" />
        </label>

        <label class="wide">
          <span>商品图片</span>
          <input v-model="createForm.image" type="url" placeholder="输入商品图片 URL" />
        </label>

        <label class="wide">
          <span>商品简介</span>
          <textarea
            v-model="createForm.description"
            rows="4"
            placeholder="输入适合展示在商品卡片和详情页的简介"
          />
        </label>

        <label>
          <span>销售价</span>
          <input v-model="createForm.price" type="number" min="0" step="0.1" />
        </label>

        <label>
          <span>会员价</span>
          <input v-model="createForm.memberPrice" type="number" min="0" step="0.1" />
        </label>

        <label>
          <span>标签</span>
          <input v-model="createForm.tagsText" type="text" placeholder="用英文逗号分隔，如：新品,爆款" />
        </label>
      </div>

      <div class="create-actions">
        <button class="primary-btn" :disabled="saving || !createForm.name.trim()" @click="handleCreateProduct">
          {{ saving ? '提交中...' : '新增商品' }}
        </button>
      </div>
    </section>

    <div class="filter-bar">
      <input
        v-model="searchKeyword"
        class="search-box"
        type="text"
        placeholder="搜索商品名称、简介、分类或标签..."
      />
      <div class="filter-tabs">
        <button :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
        <button :class="{ active: statusFilter === 'in_stock' }" @click="statusFilter = 'in_stock'">库存充足</button>
        <button :class="{ active: statusFilter === 'low_stock' }" @click="statusFilter = 'low_stock'">库存偏低</button>
      </div>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <div v-else class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>商品信息</th>
            <th>分类</th>
            <th>销售价</th>
            <th>会员价</th>
            <th>库存</th>
            <th>今日已售</th>
            <th>累计销量</th>
            <th>标签</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in filteredProducts" :key="product.id">
            <td>
              <div class="product-cell">
                <img :src="product.image" :alt="product.name" class="product-thumb" />
                <div class="product-copy">
                  <strong>{{ product.name }}</strong>
                  <span>{{ product.subtitle || '暂无副标题' }}</span>
                  <p>{{ product.description || '暂无商品简介' }}</p>
                </div>
              </div>
            </td>
            <td>{{ product.categoryName || product.categoryId }}</td>
            <td>¥{{ product.price.toFixed(2) }}</td>
            <td class="member-price">¥{{ product.memberPrice.toFixed(2) }}</td>
            <td>
              <span :class="['stock-tag', getStockClass(product.stock)]">
                {{ product.stock }} / {{ getStockText(product.stock) }}
              </span>
            </td>
            <td>{{ product.todaySold }}</td>
            <td>{{ product.sales }}</td>
            <td>
              <div class="tag-list">
                <span v-for="tag in product.tags" :key="tag" class="product-tag">{{ tag }}</span>
              </div>
            </td>
            <td>
              <div class="action-row">
                <button class="ghost-btn" @click="handleStockChange(product, 10)">补货 +10</button>
                <button class="danger-btn" @click="handleStockChange(product, -1)">减库存 -1</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.stat-card,
.create-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.stat-card {
  padding: 18px;
  display: grid;
  gap: 8px;
}

.stat-card span {
  font-size: 13px;
  color: #64748b;
}

.stat-card strong {
  font-size: 24px;
  color: #111827;
}

.create-panel {
  padding: 18px;
  margin-bottom: 20px;
}

.section-head h4 {
  margin: 0 0 6px;
  font-size: 16px;
  color: #111827;
}

.section-head p {
  margin: 0 0 16px;
  font-size: 13px;
  color: #64748b;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.form-grid label {
  display: grid;
  gap: 8px;
}

.form-grid label.wide {
  grid-column: span 3;
}

.form-grid span {
  font-size: 13px;
  color: #374151;
}

.form-grid input,
.form-grid select,
.form-grid textarea,
.search-box {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.form-grid textarea {
  resize: vertical;
}

.form-grid input:focus,
.form-grid select:focus,
.form-grid textarea:focus,
.search-box:focus {
  border-color: #667eea;
}

.create-actions {
  margin-top: 16px;
}

.primary-btn,
.ghost-btn,
.danger-btn,
.filter-tabs button {
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.primary-btn {
  border: 0;
  padding: 10px 18px;
  background: #667eea;
  color: #ffffff;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost-btn,
.danger-btn,
.filter-tabs button {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
}

.danger-btn {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff7f7;
}

.filter-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
}

.search-box {
  width: 320px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tabs button.active {
  background: #667eea;
  color: #ffffff;
  border-color: #667eea;
}

.info-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 12px 16px;
  border-radius: 8px;
  color: #1e40af;
  font-size: 13px;
  margin-bottom: 16px;
}

.loading-text {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.product-cell {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.product-thumb {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
  background: #f3f4f6;
}

.product-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.product-copy strong {
  color: #111827;
}

.product-copy span,
.product-copy p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.product-copy p {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.stock-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tag-success {
  background: #dcfce7;
  color: #166534;
}

.tag-warning {
  background: #fef9c3;
  color: #854d0e;
}

.tag-danger {
  background: #fee2e2;
  color: #991b1b;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.product-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: #ede9fe;
  color: #5b21b6;
  font-size: 12px;
}

.member-price {
  color: #e6a23c;
  font-weight: 600;
}

.action-row {
  display: flex;
  gap: 8px;
}
</style>
