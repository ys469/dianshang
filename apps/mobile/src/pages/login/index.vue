<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';

type AuthMode = 'login' | 'register' | 'reset';
type MessageType = 'info' | 'success' | 'error';

const authStore = useAuthStore();
const mode = ref<AuthMode>('login');
const message = ref('');
const messageType = ref<MessageType>('info');
const submitting = ref(false);

const form = reactive({
  account: '',
  password: '',
  mobile: '',
  email: '',
  nickname: '',
  confirmPassword: '',
  resetMobile: '',
  resetEmail: ''
});

function setMessage(type: MessageType, value: string) {
  messageType.value = type;
  message.value = value;
}

function validateMobile(value: string) {
  return /^1[3-9]\d{9}$/.test(value);
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function switchMode(nextMode: AuthMode) {
  mode.value = nextMode;
  setMessage('info', '');
}

async function handleLogin() {
  setMessage('info', '');

  if (!validateMobile(form.account.trim())) {
    setMessage('error', '请输入已注册手机号');
    return;
  }

  if (!form.password) {
    setMessage('error', '请输入密码');
    return;
  }

  if (form.password.length < 6) {
    setMessage('error', '密码至少 6 位');
    return;
  }

  submitting.value = true;
  try {
    await authStore.login('user', form.account.trim(), form.password);
    form.password = '';
    setMessage('success', '登录成功');
    uni.navigateBack();
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : '登录失败';
    setMessage('error', text.includes('401') ? '手机号或密码错误' : text);
  } finally {
    submitting.value = false;
  }
}

async function handleRegister() {
  setMessage('info', '');

  if (!validateMobile(form.mobile.trim())) {
    setMessage('error', '请输入正确的手机号');
    return;
  }

  if (!validateEmail(form.email.trim())) {
    setMessage('error', '请输入正确的邮箱');
    return;
  }

  if (form.nickname.trim().length < 2) {
    setMessage('error', '昵称至少 2 个字');
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
      form.mobile.trim(),
      form.email.trim(),
      form.nickname.trim(),
      form.password,
      form.confirmPassword
    );
    form.password = '';
    form.confirmPassword = '';
    setMessage('success', '注册成功，已自动登录');
    uni.navigateBack();
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : '注册失败';
    setMessage('error', text.includes('409') ? '该手机号或邮箱已注册' : text);
  } finally {
    submitting.value = false;
  }
}

async function handleResetPassword() {
  setMessage('info', '');

  if (!validateMobile(form.resetMobile.trim())) {
    setMessage('error', '请输入正确的手机号');
    return;
  }

  if (!validateEmail(form.resetEmail.trim())) {
    setMessage('error', '请输入注册邮箱');
    return;
  }

  submitting.value = true;
  try {
    const result = await authStore.resetPassword(
      form.resetMobile.trim(),
      form.resetEmail.trim()
    );
    form.account = form.resetMobile.trim();
    form.password = '';
    mode.value = 'login';
    setMessage(
      'success',
      result.provider === 'mock' && result.debugPassword
        ? `新的临时密码：${result.debugPassword}`
        : '新的临时密码已发送到邮箱，请查收后登录'
    );
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : '重置密码失败';
    setMessage('error', text.includes('404') ? '手机号与邮箱不匹配' : text);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="auth-page">
    <view class="auth-card">
      <view class="auth-header">
        <view class="brand-mark">SM</view>
        <text class="brand-name">智能会员商城</text>
        <text class="brand-sub">
          {{
            mode === 'login'
              ? '会员登录'
              : mode === 'register'
                ? '注册会员账号'
                : '邮箱找回密码'
          }}
        </text>
      </view>

      <view v-if="message" :class="['message-box', `message-${messageType}`]">
        <text>{{ message }}</text>
      </view>

      <view v-if="mode === 'login'" class="form">
        <view class="form-item">
          <text class="label">手机号</text>
          <input
            v-model="form.account"
            class="input"
            placeholder="请输入已注册手机号"
            type="number"
            maxlength="11"
          />
        </view>
        <view class="form-item">
          <text class="label">密码</text>
          <input
            v-model="form.password"
            class="input"
            placeholder="请输入密码"
            :password="true"
          />
        </view>
        <button class="submit-btn" :loading="submitting" :disabled="submitting" @tap="handleLogin">
          进入会员商城
        </button>
        <button class="link-btn align-right" @tap="switchMode('reset')">忘记密码</button>
      </view>

      <view v-else-if="mode === 'register'" class="form">
        <view class="form-item">
          <text class="label">手机号</text>
          <input
            v-model="form.mobile"
            class="input"
            placeholder="请输入手机号"
            type="number"
            maxlength="11"
          />
        </view>
        <view class="form-item">
          <text class="label">邮箱</text>
          <input
            v-model="form.email"
            class="input"
            placeholder="请输入常用邮箱"
            type="text"
          />
        </view>
        <view class="form-item">
          <text class="label">昵称</text>
          <input
            v-model="form.nickname"
            class="input"
            placeholder="请输入昵称"
            type="text"
          />
        </view>
        <view class="form-item">
          <text class="label">密码</text>
          <input
            v-model="form.password"
            class="input"
            placeholder="请设置至少 6 位密码"
            :password="true"
          />
        </view>
        <view class="form-item">
          <text class="label">确认密码</text>
          <input
            v-model="form.confirmPassword"
            class="input"
            placeholder="请再次输入密码"
            :password="true"
          />
        </view>
        <button
          class="submit-btn"
          :loading="submitting"
          :disabled="submitting"
          @tap="handleRegister"
        >
          注册并登录
        </button>
      </view>

      <view v-else class="form">
        <view class="tip-box">
          <text>填写注册手机号和邮箱后，系统会生成新的临时密码并发送到邮箱。</text>
        </view>
        <view class="form-item">
          <text class="label">手机号</text>
          <input
            v-model="form.resetMobile"
            class="input"
            placeholder="请输入注册手机号"
            type="number"
            maxlength="11"
          />
        </view>
        <view class="form-item">
          <text class="label">注册邮箱</text>
          <input
            v-model="form.resetEmail"
            class="input"
            placeholder="请输入注册邮箱"
            type="text"
          />
        </view>
        <button
          class="submit-btn"
          :loading="submitting"
          :disabled="submitting"
          @tap="handleResetPassword"
        >
          发送新密码到邮箱
        </button>
      </view>

      <view class="auth-footer">
        <button v-if="mode !== 'register'" class="link-btn" @tap="switchMode('register')">
          没有账号？注册会员
        </button>
        <button v-if="mode !== 'login'" class="link-btn" @tap="switchMode('login')">
          已有账号？返回登录
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
  padding: 40rpx;
}

.auth-card {
  width: 100%;
  max-width: 680rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(34, 24, 78, 0.18);
}

.auth-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 36rpx;
}

.brand-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92rpx;
  height: 92rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
  color: #ffffff;
  font-size: 36rpx;
  font-weight: 700;
}

.brand-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2937;
}

.brand-sub {
  font-size: 26rpx;
  color: #667085;
}

.message-box,
.tip-box {
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
}

.message-box text,
.tip-box text {
  font-size: 24rpx;
  line-height: 1.6;
}

.message-info {
  background: #f5f7fa;
  border: 1rpx solid #d0d5dd;
}

.message-info text,
.tip-box text {
  color: #475467;
}

.message-success {
  background: #ecfdf3;
  border: 1rpx solid #abefc6;
}

.message-success text {
  color: #027a48;
}

.message-error {
  background: #fef3f2;
  border: 1rpx solid #fecdca;
}

.message-error text {
  color: #b42318;
}

.tip-box {
  background: #f8f5ff;
  border: 1rpx solid rgba(124, 77, 255, 0.18);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.label {
  font-size: 26rpx;
  color: #344054;
  font-weight: 600;
}

.input {
  width: 100%;
  min-height: 88rpx;
  padding: 0 28rpx;
  border-radius: 18rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  font-size: 28rpx;
  color: #111827;
  box-sizing: border-box;
}

.submit-btn {
  margin-top: 8rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  padding: 24rpx 0;
  border: none;
}

.submit-btn[disabled] {
  opacity: 0.72;
}

.auth-footer {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.link-btn {
  border: none;
  background: transparent;
  color: #7c4dff;
  font-size: 26rpx;
  padding: 0;
}

.align-right {
  align-self: flex-end;
}
</style>
