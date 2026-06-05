<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';

type AuthMode = 'login' | 'register' | 'reset';
type MessageType = 'info' | 'success' | 'error';

const router = useRouter();
const authStore = useAuthStore();

const mode = ref<AuthMode>('login');
const message = ref('');
const messageType = ref<MessageType>('info');
const submitting = ref(false);
const sendingScene = ref<'register' | 'reset_password' | null>(null);
const registerCountdown = ref(0);
const resetCountdown = ref(0);

let registerTimer: ReturnType<typeof setInterval> | null = null;
let resetTimer: ReturnType<typeof setInterval> | null = null;

const form = reactive({
  role: 'admin' as 'admin' | 'user',
  account: 'admin',
  password: 'admin123',
  mobile: '',
  nickname: '',
  smsCode: '',
  confirmPassword: '',
  resetMobile: '',
  resetSmsCode: '',
  resetPassword: '',
  resetConfirmPassword: ''
});

function setMessage(type: MessageType, value: string) {
  messageType.value = type;
  message.value = value;
}

function validateMobile(value: string) {
  return /^1[3-9]\d{9}$/.test(value);
}

function clearRegisterTimer() {
  if (registerTimer) {
    clearInterval(registerTimer);
    registerTimer = null;
  }
}

function clearResetTimer() {
  if (resetTimer) {
    clearInterval(resetTimer);
    resetTimer = null;
  }
}

function startCountdown(scene: 'register' | 'reset_password', seconds = 60) {
  if (scene === 'register') {
    clearRegisterTimer();
    registerCountdown.value = seconds;
    registerTimer = setInterval(() => {
      registerCountdown.value -= 1;
      if (registerCountdown.value <= 0) {
        clearRegisterTimer();
      }
    }, 1000);
    return;
  }

  clearResetTimer();
  resetCountdown.value = seconds;
  resetTimer = setInterval(() => {
    resetCountdown.value -= 1;
    if (resetCountdown.value <= 0) {
      clearResetTimer();
    }
  }, 1000);
}

async function handleSendCode(scene: 'register' | 'reset_password') {
  const mobile = scene === 'register' ? form.mobile : form.resetMobile;

  if (!validateMobile(mobile)) {
    setMessage('error', '请输入正确的手机号');
    return;
  }

  sendingScene.value = scene;
  try {
    const result = await authStore.sendSmsCode(mobile, scene);
    if (scene === 'register' && result.debugCode) {
      form.smsCode = result.debugCode;
    }
    if (scene === 'reset_password' && result.debugCode) {
      form.resetSmsCode = result.debugCode;
    }

    startCountdown(scene);
    setMessage(
      'success',
      result.debugCode
        ? `验证码已发送，当前开发验证码为 ${result.debugCode}`
        : '验证码已发送，请留意短信'
    );
  } catch (error: unknown) {
    setMessage('error', error instanceof Error ? error.message : '验证码发送失败');
  } finally {
    sendingScene.value = null;
  }
}

async function handleLogin() {
  setMessage('info', '');

  if (!form.account || !form.password) {
    setMessage('error', '请填写账号和密码');
    return;
  }

  if (form.password.length < 6) {
    setMessage('error', '密码至少 6 位');
    return;
  }

  submitting.value = true;
  try {
    await authStore.login(form.role, form.account.trim(), form.password);

    if (form.role === 'admin') {
      router.replace('/');
      return;
    }

    authStore.logout();
    setMessage('success', '会员账号校验成功，请在商城前台登录该账号');
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : '登录失败';
    if (text.includes('401') || text.includes('Unauthorized')) {
      setMessage('error', form.role === 'admin' ? '管理员账号或密码错误' : '会员账号或密码错误');
    } else {
      setMessage('error', text);
    }
  } finally {
    submitting.value = false;
  }
}

async function handleRegister() {
  setMessage('info', '');

  if (!validateMobile(form.mobile)) {
    setMessage('error', '请输入正确的手机号');
    return;
  }

  if (!form.smsCode.trim()) {
    setMessage('error', '请输入短信验证码');
    return;
  }

  if (form.nickname.trim().length < 2) {
    setMessage('error', '昵称至少 2 个字符');
    return;
  }

  if (form.password.length < 6) {
    setMessage('error', '密码至少 6 位');
    return;
  }

  if (form.password !== form.confirmPassword) {
    setMessage('error', '两次输入的密码不一致');
    return;
  }

  submitting.value = true;
  try {
    await authStore.register(
      form.mobile,
      form.nickname.trim(),
      form.password,
      form.confirmPassword,
      form.smsCode.trim()
    );
    authStore.logout();
    form.role = 'user';
    form.account = form.mobile;
    form.password = '';
    form.mobile = '';
    form.nickname = '';
    form.smsCode = '';
    form.confirmPassword = '';
    mode.value = 'login';
    setMessage('success', '会员账号注册成功，请前往商城前台登录');
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : '注册失败';
    setMessage('error', text.includes('409') ? '该手机号已注册' : text);
  } finally {
    submitting.value = false;
  }
}

async function handleResetPassword() {
  setMessage('info', '');

  if (!validateMobile(form.resetMobile)) {
    setMessage('error', '请输入正确的手机号');
    return;
  }

  if (!form.resetSmsCode.trim()) {
    setMessage('error', '请输入短信验证码');
    return;
  }

  if (form.resetPassword.length < 6) {
    setMessage('error', '新密码至少 6 位');
    return;
  }

  if (form.resetPassword !== form.resetConfirmPassword) {
    setMessage('error', '两次输入的新密码不一致');
    return;
  }

  submitting.value = true;
  try {
    await authStore.resetPassword(
      form.resetMobile,
      form.resetPassword,
      form.resetConfirmPassword,
      form.resetSmsCode.trim()
    );
    form.role = 'user';
    form.account = form.resetMobile;
    form.password = '';
    form.resetSmsCode = '';
    form.resetPassword = '';
    form.resetConfirmPassword = '';
    mode.value = 'login';
    setMessage('success', '密码已重置，请在会员端使用新密码登录');
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : '重置密码失败';
    setMessage('error', text.includes('404') ? '该手机号还没有注册' : text);
  } finally {
    submitting.value = false;
  }
}

function switchMode(nextMode: AuthMode) {
  mode.value = nextMode;
  setMessage('info', '');
}

onUnmounted(() => {
  clearRegisterTimer();
  clearResetTimer();
});
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="brand-mark">SM</div>
        <h1>智能会员商城系统</h1>
        <p>
          {{
            mode === 'login'
              ? '管理员后台登录与会员账号区分管理'
              : mode === 'register'
                ? '注册会员账号'
                : '短信找回会员密码'
          }}
        </p>
      </div>

      <div v-if="message" :class="['message-box', `message-${messageType}`]">
        {{ message }}
      </div>

      <form v-if="mode === 'login'" class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">角色</label>
          <div class="role-toggle">
            <button
              type="button"
              :class="['role-btn', { active: form.role === 'admin' }]"
              @click="form.role = 'admin'"
            >
              管理员
            </button>
            <button
              type="button"
              :class="['role-btn', { active: form.role === 'user' }]"
              @click="form.role = 'user'"
            >
              会员校验
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="account">
            {{ form.role === 'admin' ? '管理员账号' : '会员手机号 / 账号' }}
          </label>
          <input
            id="account"
            v-model="form.account"
            class="form-input"
            :placeholder="form.role === 'admin' ? '请输入管理员账号' : '请输入会员手机号或账号'"
            type="text"
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
          />
        </div>

        <button class="submit-btn" type="submit" :disabled="submitting">
          {{ submitting ? '提交中...' : form.role === 'admin' ? '进入管理后台' : '验证会员账号' }}
        </button>

        <button
          v-if="form.role === 'user'"
          type="button"
          class="link-btn align-right"
          @click="switchMode('reset')"
        >
          忘记密码
        </button>
      </form>

      <form v-else-if="mode === 'register'" class="auth-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label" for="register-mobile">手机号</label>
          <input
            id="register-mobile"
            v-model="form.mobile"
            class="form-input"
            placeholder="请输入手机号"
            type="text"
            maxlength="11"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="register-code">短信验证码</label>
          <div class="code-row">
            <input
              id="register-code"
              v-model="form.smsCode"
              class="form-input"
              placeholder="请输入验证码"
              type="text"
              maxlength="6"
            />
            <button
              type="button"
              class="code-btn"
              :disabled="registerCountdown > 0 || sendingScene === 'register'"
              @click="handleSendCode('register')"
            >
              {{ registerCountdown > 0 ? `${registerCountdown}s` : '发送验证码' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="register-nickname">昵称</label>
          <input
            id="register-nickname"
            v-model="form.nickname"
            class="form-input"
            placeholder="请输入昵称"
            type="text"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="register-password">密码</label>
          <input
            id="register-password"
            v-model="form.password"
            class="form-input"
            placeholder="请设置密码，至少 6 位"
            type="password"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="register-confirm">确认密码</label>
          <input
            id="register-confirm"
            v-model="form.confirmPassword"
            class="form-input"
            placeholder="请再次输入密码"
            type="password"
          />
        </div>

        <button class="submit-btn" type="submit" :disabled="submitting">
          {{ submitting ? '提交中...' : '注册会员账号' }}
        </button>
      </form>

      <form v-else class="auth-form" @submit.prevent="handleResetPassword">
        <div class="reset-tip">
          这里只支持会员账号短信找回密码。管理员账号请由超级管理员在后台统一维护。
        </div>

        <div class="form-group">
          <label class="form-label" for="reset-mobile">手机号</label>
          <input
            id="reset-mobile"
            v-model="form.resetMobile"
            class="form-input"
            placeholder="请输入注册手机号"
            type="text"
            maxlength="11"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reset-code">短信验证码</label>
          <div class="code-row">
            <input
              id="reset-code"
              v-model="form.resetSmsCode"
              class="form-input"
              placeholder="请输入验证码"
              type="text"
              maxlength="6"
            />
            <button
              type="button"
              class="code-btn"
              :disabled="resetCountdown > 0 || sendingScene === 'reset_password'"
              @click="handleSendCode('reset_password')"
            >
              {{ resetCountdown > 0 ? `${resetCountdown}s` : '发送验证码' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="reset-password">新密码</label>
          <input
            id="reset-password"
            v-model="form.resetPassword"
            class="form-input"
            placeholder="请输入新密码"
            type="password"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="reset-confirm">确认新密码</label>
          <input
            id="reset-confirm"
            v-model="form.resetConfirmPassword"
            class="form-input"
            placeholder="请再次输入新密码"
            type="password"
          />
        </div>

        <button class="submit-btn" type="submit" :disabled="submitting">
          {{ submitting ? '提交中...' : '重置密码' }}
        </button>
      </form>

      <div class="helper-box">
        <p>管理员测试账号：admin / admin123</p>
        <p>会员测试账号：13800138000 / member123</p>
      </div>

      <div class="auth-footer">
        <button v-if="mode !== 'register'" type="button" class="link-btn" @click="switchMode('register')">
          注册会员账号
        </button>
        <button v-if="mode !== 'login'" type="button" class="link-btn" @click="switchMode('login')">
          返回登录
        </button>
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
}

.message-box,
.reset-tip,
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

.reset-tip,
.helper-box {
  background: #f8f5ff;
  border: 1px solid rgba(124, 77, 255, 0.16);
  color: #475467;
}

.helper-box {
  margin-top: 18px;
  display: grid;
  gap: 4px;
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

.code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 10px;
}

.role-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.role-btn,
.submit-btn,
.code-btn,
.link-btn {
  border: none;
  cursor: pointer;
}

.role-btn,
.code-btn {
  padding: 11px 14px;
  border-radius: 10px;
  background: #f7f5ff;
  color: #7c4dff;
  font-size: 14px;
  font-weight: 600;
}

.role-btn.active,
.submit-btn {
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
  color: #ffffff;
}

.submit-btn {
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
}

.submit-btn:disabled,
.code-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.auth-footer {
  margin-top: 18px;
  display: grid;
  gap: 8px;
  text-align: center;
}

.link-btn {
  padding: 0;
  background: transparent;
  color: #7c4dff;
  font-size: 14px;
}

.align-right {
  justify-self: end;
}
</style>
