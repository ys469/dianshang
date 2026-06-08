<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

type MessageType = 'info' | 'success' | 'error';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const submitting = ref(false);
const message = ref('');
const messageType = ref<MessageType>('info');

const form = reactive({
  account: '',
  password: ''
});

const redirectPath = computed(() => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' && redirect.trim() ? redirect : '/';
});

function setMessage(type: MessageType, value: string) {
  messageType.value = type;
  message.value = value;
}

async function handleLogin() {
  setMessage('info', '');

  if (!form.account.trim() || !form.password) {
    setMessage('error', '请输入管理员账号和密码');
    return;
  }

  if (form.password.length < 6) {
    setMessage('error', '密码至少 6 位');
    return;
  }

  submitting.value = true;
  try {
    const result = await authStore.login('admin', form.account.trim(), form.password);

    if (result.user.role !== 'admin') {
      authStore.logout();
      setMessage('error', '当前账号不是管理员账号');
      return;
    }

    form.password = '';
    router.replace(redirectPath.value);
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : '登录失败';
    if (text.includes('401') || text.includes('Unauthorized')) {
      setMessage('error', '管理员账号或密码错误');
      return;
    }

    setMessage('error', text);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="brand-mark">SM</div>
        <h1>智能会员商城运营后台</h1>
        <p>仅限管理员登录，会员请前往前台商城站点使用独立入口登录。</p>
      </div>

      <div v-if="message" :class="['message-box', `message-${messageType}`]">
        {{ message }}
      </div>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="account">管理员账号</label>
          <input
            id="account"
            v-model="form.account"
            class="form-input"
            placeholder="请输入管理员账号"
            type="text"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="password">密码</label>
          <input
            id="password"
            v-model="form.password"
            class="form-input"
            placeholder="请输入密码"
            type="password"
            autocomplete="current-password"
          />
        </div>

        <button class="submit-btn" type="submit" :disabled="submitting">
          {{ submitting ? '登录中...' : '进入运营后台' }}
        </button>
      </form>

      <div class="helper-box">
        <p>仅支持管理员账号登录。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
}

.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 40px 36px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 64px rgba(34, 24, 78, 0.18);
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.brand-mark {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 14px;
}

.auth-header h1 {
  margin: 0 0 8px;
  font-size: 24px;
  color: #1f2937;
}

.auth-header p {
  margin: 0;
  font-size: 14px;
  color: #667085;
  line-height: 1.6;
}

.message-box,
.helper-box {
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
}

.message-box {
  margin-bottom: 18px;
}

.message-info {
  background: #f5f7fa;
  border: 1px solid #d0d5dd;
  color: #475467;
}

.message-success {
  background: #ecfdf3;
  border: 1px solid #abefc6;
  color: #027a48;
}

.message-error {
  background: #fef3f2;
  border: 1px solid #fecdca;
  color: #b42318;
}

.helper-box {
  margin-top: 18px;
  display: grid;
  gap: 4px;
  background: #f8f5ff;
  border: 1px solid rgba(124, 77, 255, 0.16);
  color: #475467;
}

.helper-box p {
  margin: 0;
}

.auth-form {
  display: grid;
  gap: 18px;
}

.form-group {
  display: grid;
  gap: 6px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #344054;
}

.form-input {
  width: 100%;
  min-width: 0;
  padding: 11px 14px;
  border: 1px solid #d0d5dd;
  border-radius: 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: #7c4dff;
  box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.12);
}

.submit-btn {
  border: none;
  cursor: pointer;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
  color: #ffffff;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
