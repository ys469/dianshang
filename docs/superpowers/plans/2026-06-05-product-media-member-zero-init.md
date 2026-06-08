# Product Media And Member Zero Init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins create products with image links and descriptions, and ensure first-time member profiles start with zeroed account data while existing members keep their saved values.

**Architecture:** Extend the existing runtime product/member records and admin product form rather than introducing new storage layers. Cover both backend behaviors with API regression tests first, then update the admin API typings and product management view to expose and render the new fields.

**Tech Stack:** Vue 3, TypeScript, NestJS, Vitest, Supertest

---

### Task 1: Add failing API regression coverage

**Files:**
- Modify: `apps/api/test/admin-linked-data.e2e.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add one test that creates a product through `POST /admin/products` with `image` and `description`, then asserts both fields are returned from `/admin/products` and `/products/:id`.

Add one test that registers a brand-new user, fetches `/member/profile`, and asserts `balance`, `points`, `coupons`, `growthValue`, `totalOrders`, and `totalSpent` are all `0`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- admin-linked-data.e2e.spec.ts`

Expected: FAIL because product `description` is not yet returned and/or new member bootstrap still starts with non-zero defaults.

- [ ] **Step 3: Commit**

```bash
git add apps/api/test/admin-linked-data.e2e.spec.ts
git commit -m "test: cover product media and new member zero init"
```

### Task 2: Implement backend product media fields

**Files:**
- Modify: `apps/api/src/modules/runtime-data/runtime-data.service.ts`
- Modify: `apps/api/src/modules/admin/admin.controller.ts`

- [ ] **Step 1: Extend runtime product types**

Add `description: string` to `ProductRecord` and `CreateProductInput`, and ensure seed products normalize missing descriptions to `''`.

- [ ] **Step 2: Save and return image/description**

Update `createProduct()` to persist:
- `image`: trimmed input or existing fallback banner image
- `description`: trimmed input or empty string

Update `toProductView()` and the fallback branch in `getProductDetail()` to return `description`.

- [ ] **Step 3: Accept description in admin controller**

Update the `POST /admin/products` request body typing in `apps/api/src/modules/admin/admin.controller.ts` to include `description?: string`.

- [ ] **Step 4: Run test to verify product media passes**

Run: `npm run test --workspace apps/api -- admin-linked-data.e2e.spec.ts`

Expected: the product media assertions pass, while the new-member zero-init assertion may still fail until Task 3 is complete.

### Task 3: Implement zero-initialized new member profiles

**Files:**
- Modify: `apps/api/src/modules/runtime-data/runtime-data.service.ts`

- [ ] **Step 1: Change new profile defaults only**

Update `ensureMemberProfile()` so newly created members start with:
- `balance = 0`
- `points = 0`
- `coupons = 0`
- `growthValue = 0`
- `totalOrders = 0`
- `totalSpent = 0`

Keep the existing “find by authUserId/mobile and return existing record” behavior so old members are not reset.

- [ ] **Step 2: Run test to verify full API spec passes**

Run: `npm run test --workspace apps/api -- admin-linked-data.e2e.spec.ts`

Expected: PASS

### Task 4: Expose new product fields to the admin frontend

**Files:**
- Modify: `apps/admin/src/services/api.ts`

- [ ] **Step 1: Extend frontend types**

Update `AdminProduct` to include:
- `image: string`
- `description: string`

Update `CreateProductInput` to include:
- `image?: string`
- `description?: string`

- [ ] **Step 2: Keep API client wiring unchanged**

No endpoint changes are needed beyond sending the expanded payload through the existing `createProduct()` helper.

### Task 5: Update admin product management UI

**Files:**
- Modify: `apps/admin/src/views/products/ProductListView.vue`

- [ ] **Step 1: Add form fields**

Extend the create form state with:
- `image`
- `description`

Render:
- an image URL input
- a multiline textarea for product description

- [ ] **Step 2: Send new fields on create**

Include `image` and `description` in `apiClient.createProduct(...)`, and clear them after a successful create.

- [ ] **Step 3: Render media and summary in product list**

Update the first table column to show:
- product thumbnail
- product name
- subtitle
- one-line description summary

- [ ] **Step 4: Add scoped styles**

Add compact layout and thumbnail styles that fit the current admin table without changing the page structure.

- [ ] **Step 5: Run admin tests/build**

Run:
- `npm run test --workspace apps/admin`
- `npm run build --workspace apps/admin`

Expected: PASS

### Task 6: Final verification

**Files:**
- None

- [ ] **Step 1: Run full backend verification**

Run: `npm run test --workspace apps/api`

Expected: PASS

- [ ] **Step 2: Run final targeted frontend/backend builds**

Run:
- `npm run build --workspace apps/api`
- `npm run build --workspace apps/admin`

Expected: PASS
