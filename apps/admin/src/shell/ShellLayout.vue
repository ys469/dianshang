<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">SM</div>
        <div>
          <h1>智能会员商城</h1>
          <p>运营后台</p>
        </div>
      </div>
      <nav class="nav">
        <RouterLink to="/dashboard">仪表盘</RouterLink>
        <RouterLink to="/products">商品管理</RouterLink>
        <RouterLink to="/orders">订单管理</RouterLink>
        <RouterLink to="/members">会员管理</RouterLink>
      </nav>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <h2>高端会员商城运营中心</h2>
          <p>面向社区团购与会员超市的一体化运营面板</p>
        </div>
      </header>

      <section class="content">
        <RouterView />
      </section>
    </main>
  </div>
</template>
