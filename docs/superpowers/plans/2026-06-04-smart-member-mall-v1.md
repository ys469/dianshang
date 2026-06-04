# Smart Member Mall V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable version of the Smart Member Mall monorepo with a NestJS API, a Vue 3 admin console, and a UniApp user client skeleton that share one product and order domain model.

**Architecture:** Use an npm-workspaces monorepo with `apps/api`, `apps/admin`, `apps/mobile`, and `packages/shared`. Keep the first version database-ready but runnable with demo seed data, so the UI and API can start immediately while still exposing MySQL/Redis/JWT integration points.

**Tech Stack:** npm workspaces, TypeScript, NestJS, Vue 3, Vite, UniApp, Pinia, Element Plus, Vitest, Swagger

---

### Task 1: Monorepo Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `README.md`
- Create: `docs/product/prd.md`
- Create: `docs/architecture/page-flow.md`
- Create: `docs/architecture/permission-architecture.md`
- Create: `docs/database/schema-design.md`
- Create: `docs/api/openapi-summary.md`
- Create: `docs/deployment/deployment-plan.md`

- [ ] **Step 1: Write the failing repository smoke test**

```bash
npm test
```

Expected: fail because the workspace and test scripts do not exist yet.

- [ ] **Step 2: Create the workspace root files**

```json
{
  "name": "smart-member-mall",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:api": "npm --workspace apps/api run start:dev",
    "dev:admin": "npm --workspace apps/admin run dev",
    "dev:mobile": "npm --workspace apps/mobile run dev:h5",
    "build": "npm run -ws build",
    "test": "npm run -ws test"
  }
}
```

- [ ] **Step 3: Add base TypeScript config and top-level docs**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@smart-member/shared": ["packages/shared/src"]
    }
  }
}
```

- [ ] **Step 4: Run the root test command again**

```bash
npm test
```

Expected: still fail, but now because child workspaces are not present yet.

- [ ] **Step 5: Commit foundation docs and workspace root**

```bash
git add .
git commit -m "chore: initialize smart member mall workspace"
```

### Task 2: Shared Domain Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/mock-data.ts`
- Create: `packages/shared/src/__tests__/mock-data.test.ts`

- [ ] **Step 1: Write the failing shared data test**

```ts
import { describe, expect, it } from 'vitest';
import { demoCategories, demoProducts } from '../mock-data';

describe('demo product catalog', () => {
  it('exposes at least eight home categories and one featured product', () => {
    expect(demoCategories.length).toBeGreaterThanOrEqual(8);
    expect(demoProducts.some((product) => product.isFeatured)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the shared package test**

```bash
npm --workspace packages/shared test
```

Expected: fail because the package and exports do not exist yet.

- [ ] **Step 3: Implement shared enums, types, and demo data**

```ts
export enum FulfillmentMode {
  Delivery = 'delivery',
  Pickup = 'pickup',
}

export interface DemoProduct {
  id: string;
  name: string;
  price: number;
  memberPrice: number;
  isFeatured: boolean;
}
```

- [ ] **Step 4: Re-run the shared test**

```bash
npm --workspace packages/shared test
```

Expected: pass.

- [ ] **Step 5: Commit shared package**

```bash
git add packages/shared
git commit -m "feat: add shared mall domain package"
```

### Task 3: NestJS API Vertical Slice

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/common/api-response.ts`
- Create: `apps/api/src/modules/home/home.controller.ts`
- Create: `apps/api/src/modules/home/home.service.ts`
- Create: `apps/api/src/modules/products/products.controller.ts`
- Create: `apps/api/src/modules/orders/orders.controller.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/test/home.e2e-spec.ts`

- [ ] **Step 1: Write the failing API home test**

```ts
import request from 'supertest';

describe('/home', () => {
  it('returns configured homepage sections', async () => {
    const response = await request(app.getHttpServer()).get('/home');
    expect(response.status).toBe(200);
    expect(response.body.data.sections.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the API test**

```bash
npm --workspace apps/api test
```

Expected: fail because the NestJS app and route are not present.

- [ ] **Step 3: Build the NestJS app and home/product/order/auth demo endpoints**

```ts
@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  getHome() {
    return ok(this.homeService.getHomePayload());
  }
}
```

- [ ] **Step 4: Re-run the API test and smoke the build**

```bash
npm --workspace apps/api test
npm --workspace apps/api run build
```

Expected: both commands pass.

- [ ] **Step 5: Commit the API vertical slice**

```bash
git add apps/api
git commit -m "feat: add nest api demo vertical slice"
```

### Task 4: Admin Console Vertical Slice

**Files:**
- Create: `apps/admin/package.json`
- Create: `apps/admin/vite.config.ts`
- Create: `apps/admin/src/main.ts`
- Create: `apps/admin/src/App.vue`
- Create: `apps/admin/src/router/index.ts`
- Create: `apps/admin/src/stores/dashboard.ts`
- Create: `apps/admin/src/views/dashboard/DashboardView.vue`
- Create: `apps/admin/src/views/products/ProductListView.vue`
- Create: `apps/admin/src/views/orders/OrderListView.vue`
- Create: `apps/admin/src/views/members/MemberListView.vue`
- Create: `apps/admin/src/services/api.ts`
- Create: `apps/admin/src/__tests__/dashboard.store.test.ts`

- [ ] **Step 1: Write the failing admin store test**

```ts
import { describe, expect, it } from 'vitest';
import { useDashboardStore } from '../stores/dashboard';

describe('dashboard store', () => {
  it('loads sales metrics from the API client', async () => {
    const store = useDashboardStore();
    await store.fetchSummary();
    expect(store.summary.todaySales).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the admin test**

```bash
npm --workspace apps/admin test
```

Expected: fail because the app, store, and test runner do not exist.

- [ ] **Step 3: Implement the admin shell, router, store, and demo pages**

```ts
export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    summary: { todaySales: 0, monthlySales: 0, orders: 0, members: 0 },
  }),
  actions: {
    async fetchSummary() {
      this.summary = await apiClient.getDashboardSummary();
    },
  },
});
```

- [ ] **Step 4: Re-run the admin test and build**

```bash
npm --workspace apps/admin test
npm --workspace apps/admin run build
```

Expected: both commands pass.

- [ ] **Step 5: Commit the admin console slice**

```bash
git add apps/admin
git commit -m "feat: add admin console dashboard and operations pages"
```

### Task 5: UniApp User Client Vertical Slice

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/vite.config.ts`
- Create: `apps/mobile/src/main.ts`
- Create: `apps/mobile/src/App.vue`
- Create: `apps/mobile/src/manifest.json`
- Create: `apps/mobile/src/pages.json`
- Create: `apps/mobile/src/pages/index/index.vue`
- Create: `apps/mobile/src/pages/category/index.vue`
- Create: `apps/mobile/src/pages/cart/index.vue`
- Create: `apps/mobile/src/pages/profile/index.vue`
- Create: `apps/mobile/src/stores/home.ts`
- Create: `apps/mobile/src/services/api.ts`
- Create: `apps/mobile/src/__tests__/home.store.test.ts`

- [ ] **Step 1: Write the failing mobile store test**

```ts
import { describe, expect, it } from 'vitest';
import { useHomeStore } from '../stores/home';

describe('home store', () => {
  it('loads banner and product floors for the homepage', async () => {
    const store = useHomeStore();
    await store.fetchHome();
    expect(store.sections.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the mobile test**

```bash
npm --workspace apps/mobile test
```

Expected: fail because the UniApp app and store do not exist.

- [ ] **Step 3: Implement the UniApp pages, store, and API adapter**

```ts
export const useHomeStore = defineStore('home', {
  state: () => ({
    banners: [],
    sections: [],
  }),
  actions: {
    async fetchHome() {
      const payload = await apiClient.getHome();
      this.banners = payload.banners;
      this.sections = payload.sections;
    },
  },
});
```

- [ ] **Step 4: Re-run the mobile test and build**

```bash
npm --workspace apps/mobile test
npm --workspace apps/mobile run build:h5
```

Expected: both commands pass.

- [ ] **Step 5: Commit the mobile slice**

```bash
git add apps/mobile
git commit -m "feat: add uniapp mobile storefront shell"
```

### Task 6: Local Integration and Delivery

**Files:**
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `apps/api/.env.example`
- Create: `apps/admin/.env.example`
- Create: `apps/mobile/.env.example`

- [ ] **Step 1: Write the failing integration verification**

```bash
npm run build
```

Expected: fail until all workspaces and environment files are in place.

- [ ] **Step 2: Add environment samples and container wiring**

```yaml
services:
  mysql:
    image: mysql:8.0
  redis:
    image: redis:7
  api:
    build: ./apps/api
```

- [ ] **Step 3: Run full verification**

```bash
npm install
npm test
npm run build
```

Expected: pass across all workspaces.

- [ ] **Step 4: Start the local servers**

```bash
npm run dev:api
npm run dev:admin
npm run dev:mobile
```

Expected: API, admin, and mobile H5 preview all start successfully.

- [ ] **Step 5: Commit integration setup**

```bash
git add .
git commit -m "chore: finalize runnable smart member mall skeleton"
```
