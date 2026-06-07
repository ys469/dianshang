<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { apiClient, type AdminProduct } from '../../services/api';
import { filterProducts, type ProductStatusFilter } from '../../utils/admin-operations';

const categoryOptions = [
  { label: '食品生鲜', value: 'food' },
  { label: '美妆护肤', value: 'beauty' },
  { label: '数码家电', value: 'digital' },
  { label: '母婴用品', value: 'baby' },
  { label: '运动户外', value: 'sports' },
  { label: '健康保健', value: 'health' },
  { label: '家居百货', value: 'home' },
  { label: '会员专区', value: 'member' }
] as const;

type ProductFormState = {
  categoryId: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  price: number;
  memberPrice: number;
  stock: number;
  tagsText: string;
  listed: boolean;
};

const products = ref<AdminProduct[]>([]);
const loading = ref(true);
const creating = ref(false);
const savingProductId = ref('');
const editingProductId = ref('');
const errorMsg = ref('');
const successMsg = ref('');
const searchKeyword = ref('');
const statusFilter = ref<ProductStatusFilter>('all');

const createForm = reactive<ProductFormState>({
  categoryId: 'food',
  name: '',
  subtitle: '',
  description: '',
  image: '',
  price: 59.9,
  memberPrice: 49.9,
  stock: 30,
  tagsText: '新品,会员价',
  listed: true
});

const editForm = reactive<ProductFormState>({
  categoryId: 'food',
  name: '',
  subtitle: '',
  description: '',
  image: '',
  price: 0,
  memberPrice: 0,
  stock: 0,
  tagsText: '',
  listed: true
});

function sortProducts(list: AdminProduct[]) {
  return [...list].sort((left, right) => {
    if (left.listed !== right.listed) {
      return Number(right.listed) - Number(left.listed);
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function normalizeTags(tagsText: string) {
  return tagsText
    .split(/[,\uFF0C]/)
    .map((item) => item.trim())
    .filter(Boolean);
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
  createForm.listed = true;
}

function syncFormFromProduct(target: ProductFormState, product: AdminProduct) {
  target.categoryId = product.categoryId;
  target.name = product.name;
  target.subtitle = product.subtitle;
  target.description = product.description;
  target.image = product.image;
  target.price = product.price;
  target.memberPrice = product.memberPrice;
  target.stock = product.stock;
  target.tagsText = product.tags.join(', ');
  target.listed = product.listed;
}

function validateForm(form: ProductFormState) {
  if (!form.name.trim()) {
    return '请填写商品名称。';
  }

  if (form.price < 0 || form.memberPrice < 0) {
    return '商品价格不能小于 0。';
  }

  if (form.memberPrice > form.price) {
    return '会员价不能高于销售价。';
  }

  if (form.stock < 0) {
    return '库存不能小于 0。';
  }

  return '';
}

function applyProductUpdate(updated: AdminProduct) {
  const nextList = products.value.map((item) => (item.id === updated.id ? updated : item));
  products.value = sortProducts(nextList);

  if (editingProductId.value === updated.id) {
    syncFormFromProduct(editForm, updated);
  }
}

async function loadProducts() {
  const result = await apiClient.getProducts();
  products.value = sortProducts(result);
}

onMounted(async () => {
  try {
    await loadProducts();
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '加载商品数据失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
});

const filteredProducts = computed(() =>
  filterProducts(products.value, searchKeyword.value, statusFilter.value)
);

const summaryCards = computed(() => [
  { label: '商品总数', value: `${products.value.length}` },
  { label: '已上架商品', value: `${products.value.filter((item) => item.listed).length}` },
  { label: '待调整库存', value: `${products.value.filter((item) => item.stock > 0 && item.stock < 50).length}` },
  { label: '今日销量', value: `${products.value.reduce((sum, item) => sum + item.todaySold, 0)}` }
]);

function beginEdit(product: AdminProduct) {
  editingProductId.value = product.id;
  syncFormFromProduct(editForm, product);
  errorMsg.value = '';
  successMsg.value = '';
}

function cancelEdit() {
  editingProductId.value = '';
}

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

function getListedClass(listed: boolean) {
  return listed ? 'listed-tag listed' : 'listed-tag unlisted';
}

async function handleCreateProduct() {
  const validationMessage = validateForm(createForm);
  if (validationMessage) {
    errorMsg.value = validationMessage;
    successMsg.value = '';
    return;
  }

  creating.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const created = await apiClient.createProduct({
      categoryId: createForm.categoryId,
      name: createForm.name.trim(),
      subtitle: createForm.subtitle.trim(),
      description: createForm.description.trim(),
      image: createForm.image.trim(),
      price: Number(createForm.price),
      memberPrice: Number(createForm.memberPrice),
      stock: Number(createForm.stock),
      tags: normalizeTags(createForm.tagsText),
      listed: createForm.listed
    });

    products.value = sortProducts([created, ...products.value]);
    resetCreateForm();
    successMsg.value = '商品已创建，前台商品池和后台统计已同步更新。';
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '新增商品失败，请稍后重试。';
  } finally {
    creating.value = false;
  }
}

async function handleSaveEdit(productId: string) {
  const validationMessage = validateForm(editForm);
  if (validationMessage) {
    errorMsg.value = validationMessage;
    successMsg.value = '';
    return;
  }

  savingProductId.value = productId;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const updated = await apiClient.updateProduct(productId, {
      categoryId: editForm.categoryId,
      name: editForm.name.trim(),
      subtitle: editForm.subtitle.trim(),
      description: editForm.description.trim(),
      image: editForm.image.trim(),
      price: Number(editForm.price),
      memberPrice: Number(editForm.memberPrice),
      stock: Number(editForm.stock),
      tags: normalizeTags(editForm.tagsText),
      listed: editForm.listed
    });

    applyProductUpdate(updated);
    editingProductId.value = '';
    successMsg.value = '商品信息已保存。';
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '保存商品失败，请稍后重试。';
  } finally {
    savingProductId.value = '';
  }
}

async function handleToggleListed(product: AdminProduct) {
  savingProductId.value = product.id;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const updated = await apiClient.updateProduct(product.id, {
      listed: !product.listed
    });

    applyProductUpdate(updated);
    successMsg.value = product.listed ? '商品已下架，前台不会再展示。' : '商品已上架，前台可立即购买。';
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : '更新商品上架状态失败。';
  } finally {
    savingProductId.value = '';
  }
}

async function handleStockChange(product: AdminProduct, delta: number) {
  savingProductId.value = product.id;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const updated = await apiClient.updateProductStock(product.id, delta);
    applyProductUpdate(updated);
    successMsg.value = delta > 0 ? '库存已补充。' : '库存已扣减。';
  } catch (error) {
    errorMsg.value =
      error instanceof Error
        ? error.message
        : delta > 0
          ? '补货失败，请稍后重试。'
          : '扣减库存失败，请检查当前库存。';
  } finally {
    savingProductId.value = '';
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h3>商品管理</h3>
        <p>在一个页面里完成新增、改价、改库存、上下架和商品素材维护。</p>
      </div>
    </div>

    <div v-if="errorMsg" class="info-banner error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="info-banner success">{{ successMsg }}</div>

    <section class="stats-grid">
      <article v-for="item in summaryCards" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section :class="['panel-grid', { single: !editingProductId }]">
      <article class="form-panel">
        <div class="section-head">
          <h4>新增商品</h4>
          <p>创建后即可参与前台展示、下单和后台销量统计。</p>
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
            <input v-model="createForm.subtitle" type="text" placeholder="例如：门店爆款、会员专享、节日礼盒" />
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
              placeholder="输入将展示在商品卡片和详情页的简介"
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
            <input v-model="createForm.tagsText" type="text" placeholder="用逗号分隔，如：新品,爆款" />
          </label>

          <label class="checkbox-field">
            <input v-model="createForm.listed" type="checkbox" />
            <span>创建后立即上架</span>
          </label>
        </div>

        <div class="create-actions">
          <button class="primary-btn" :disabled="creating || !createForm.name.trim()" @click="handleCreateProduct">
            {{ creating ? '提交中...' : '新增商品' }}
          </button>
        </div>
      </article>

      <article v-if="editingProductId" class="form-panel edit-panel">
        <div class="section-head">
          <h4>编辑商品</h4>
          <p>修改后立即影响前台显示价格、库存和商品详情。</p>
        </div>

        <div class="form-grid">
          <label>
            <span>商品名称</span>
            <input v-model="editForm.name" type="text" />
          </label>

          <label>
            <span>所属分类</span>
            <select v-model="editForm.categoryId">
              <option v-for="item in categoryOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label>
            <span>当前库存</span>
            <input v-model="editForm.stock" type="number" min="0" step="1" />
          </label>

          <label class="wide">
            <span>副标题</span>
            <input v-model="editForm.subtitle" type="text" />
          </label>

          <label class="wide">
            <span>商品图片</span>
            <input v-model="editForm.image" type="url" />
          </label>

          <label class="wide">
            <span>商品简介</span>
            <textarea v-model="editForm.description" rows="4" />
          </label>

          <label>
            <span>销售价</span>
            <input v-model="editForm.price" type="number" min="0" step="0.1" />
          </label>

          <label>
            <span>会员价</span>
            <input v-model="editForm.memberPrice" type="number" min="0" step="0.1" />
          </label>

          <label>
            <span>标签</span>
            <input v-model="editForm.tagsText" type="text" />
          </label>

          <label class="checkbox-field">
            <input v-model="editForm.listed" type="checkbox" />
            <span>保持上架</span>
          </label>
        </div>

        <div class="create-actions multi">
          <button
            class="primary-btn"
            :disabled="savingProductId === editingProductId"
            @click="handleSaveEdit(editingProductId)"
          >
            {{ savingProductId === editingProductId ? '保存中...' : '保存修改' }}
          </button>
          <button class="ghost-btn" :disabled="savingProductId === editingProductId" @click="cancelEdit">
            取消编辑
          </button>
        </div>
      </article>
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
        <button :class="{ active: statusFilter === 'listed' }" @click="statusFilter = 'listed'">已上架</button>
        <button :class="{ active: statusFilter === 'unlisted' }" @click="statusFilter = 'unlisted'">已下架</button>
        <button :class="{ active: statusFilter === 'low_stock' }" @click="statusFilter = 'low_stock'">低库存</button>
      </div>
    </div>

    <div v-if="loading" class="loading-text">加载中...</div>

    <div v-else class="table-shell">
      <table class="data-table">
        <thead>
          <tr>
            <th>商品信息</th>
            <th>状态</th>
            <th>分类</th>
            <th>销售价</th>
            <th>会员价</th>
            <th>库存</th>
            <th>今日销量</th>
            <th>累计销量</th>
            <th>最近更新</th>
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
                  <div class="tag-list">
                    <span v-for="tag in product.tags" :key="tag" class="product-tag">{{ tag }}</span>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div class="status-cell">
                <span :class="getListedClass(product.listed)">
                  {{ product.listed ? '已上架' : '已下架' }}
                </span>
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
            <td class="muted-text">{{ formatDateTime(product.updatedAt) }}</td>
            <td>
              <div class="action-column">
                <button
                  class="ghost-btn"
                  :disabled="savingProductId === product.id"
                  @click="editingProductId === product.id ? cancelEdit() : beginEdit(product)"
                >
                  {{ editingProductId === product.id ? '收起编辑' : '编辑商品' }}
                </button>
                <button
                  :class="product.listed ? 'danger-btn' : 'primary-btn'"
                  :disabled="savingProductId === product.id"
                  @click="handleToggleListed(product)"
                >
                  {{ product.listed ? '下架商品' : '重新上架' }}
                </button>
                <div class="action-row">
                  <button
                    class="ghost-btn"
                    :disabled="savingProductId === product.id"
                    @click="handleStockChange(product, 10)"
                  >
                    补货 +10
                  </button>
                  <button
                    class="danger-btn"
                    :disabled="savingProductId === product.id"
                    @click="handleStockChange(product, -1)"
                  >
                    减库存 -1
                  </button>
                </div>
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
}

.stat-card,
.form-panel {
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

.panel-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.panel-grid.single {
  grid-template-columns: 1fr;
}

.form-panel {
  padding: 18px;
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
}

.form-grid textarea {
  resize: vertical;
}

.form-grid input:focus,
.form-grid select:focus,
.form-grid textarea:focus,
.search-box:focus {
  border-color: #7c4dff;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-field input {
  width: 16px;
  height: 16px;
  margin: 0;
}

.create-actions {
  margin-top: 16px;
}

.create-actions.multi {
  display: flex;
  gap: 10px;
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
  padding: 9px 16px;
  background: #7c4dff;
  color: #ffffff;
}

.ghost-btn,
.danger-btn,
.filter-tabs button {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
}

.danger-btn {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fff7f7;
}

.primary-btn:disabled,
.ghost-btn:disabled,
.danger-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.filter-bar {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
}

.search-box {
  width: 320px;
}

.filter-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-tabs button.active {
  background: #7c4dff;
  color: #ffffff;
  border-color: #7c4dff;
}

.info-banner {
  border: 1px solid transparent;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
}

.info-banner.error {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #be123c;
}

.info-banner.success {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}

.loading-text {
  padding: 40px;
  text-align: center;
  color: #64748b;
}

.product-cell {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  min-width: 280px;
}

.product-thumb {
  width: 84px;
  height: 84px;
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

.status-cell {
  min-width: 72px;
}

.listed-tag,
.stock-tag,
.product-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.listed-tag.listed {
  background: #dcfce7;
  color: #166534;
}

.listed-tag.unlisted {
  background: #f3f4f6;
  color: #6b7280;
}

.stock-tag.tag-success {
  background: #dcfce7;
  color: #166534;
}

.stock-tag.tag-warning {
  background: #fef9c3;
  color: #854d0e;
}

.stock-tag.tag-danger {
  background: #fee2e2;
  color: #991b1b;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.product-tag {
  background: #ede9fe;
  color: #5b21b6;
  font-weight: 400;
}

.member-price {
  color: #d97706;
  font-weight: 600;
}

.muted-text {
  color: #64748b;
  min-width: 140px;
}

.action-column {
  display: grid;
  gap: 8px;
  min-width: 120px;
}

.action-row {
  display: flex;
  gap: 8px;
}

@media (max-width: 1080px) {
  .stats-grid,
  .panel-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-grid label.wide {
    grid-column: span 1;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }
}
</style>
