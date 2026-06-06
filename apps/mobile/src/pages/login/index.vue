<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';

type AuthMode = 'login' | 'register' | 'reset';
type MessageType = 'info' | 'success' | 'error';

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
  account: '',
  password: '',
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
    await authStore.sendSmsCode(mobile, scene);

    startCountdown(scene);
    setMessage('success', '验证码已发送，请留意短信');
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
    await authStore.login('user', form.account.trim(), form.password);
    setMessage('success', '登录成功');
    uni.navigateBack();
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : '登录失败';
    setMessage('error', text.includes('401') ? '账号或密码错误' : text);
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
    setMessage('success', '注册成功，已自动登录');
    uni.navigateBack();
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
    form.account = form.resetMobile;
    form.password = '';
    form.resetSmsCode = '';
    form.resetPassword = '';
    form.resetConfirmPassword = '';
    mode.value = 'login';
    setMessage('success', '密码已重置，请使用新密码登录');
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
                : '短信找回密码'
          }}
        </text>
      </view>

      <view v-if="message" :class="['message-box', `message-${messageType}`]">
        <text>{{ message }}</text>
      </view>

      <view v-if="mode === 'login'" class="form">
        <view class="form-item">
          <text class="label">手机号 / 账号</text>
          <input
            v-model="form.account"
            class="input"
            placeholder="请输入手机号或账号"
            type="text"
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
          登录
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
          <text class="label">短信验证码</text>
          <view class="code-row">
            <input
              v-model="form.smsCode"
              class="input code-input"
              placeholder="请输入验证码"
              type="number"
              maxlength="6"
            />
            <button
              class="code-btn"
              :disabled="registerCountdown > 0 || sendingScene === 'register'"
              @tap="handleSendCode('register')"
            >
              {{ registerCountdown > 0 ? `${registerCountdown}s` : '发送验证码' }}
            </button>
          </view>
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
            placeholder="请设置密码，至少 6 位"
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
          注册
        </button>
      </view>

      <view v-else class="form">
        <view class="tip-box">
          <text>重置密码同样需要先验证手机号，只有验证码正确时才允许修改密码。</text>
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
          <text class="label">短信验证码</text>
          <view class="code-row">
            <input
              v-model="form.resetSmsCode"
              class="input code-input"
              placeholder="请输入验证码"
              type="number"
              maxlength="6"
            />
            <button
              class="code-btn"
              :disabled="resetCountdown > 0 || sendingScene === 'reset_password'"
              @tap="handleSendCode('reset_password')"
            >
              {{ resetCountdown > 0 ? `${resetCountdown}s` : '发送验证码' }}
            </button>
          </view>
        </view>
        <view class="form-item">
          <text class="label">新密码</text>
          <input
            v-model="form.resetPassword"
            class="input"
            placeholder="请输入新密码"
            :password="true"
          />
        </view>
        <view class="form-item">
          <text class="label">确认新密码</text>
          <input
            v-model="form.resetConfirmPassword"
            class="input"
            placeholder="请再次输入新密码"
            :password="true"
          />
        </view>
        <button
          class="submit-btn"
          :loading="submitting"
          :disabled="submitting"
          @tap="handleResetPassword"
        >
          重置密码
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
  height: 84rpx;
  padding: 0 24rpx;
  border: 2rpx solid #eaecf0;
  border-radius: 16rpx;
  font-size: 28rpx;
  background: #f9fafb;
}

.code-row {
  display: flex;
  gap: 16rpx;
}

.code-input {
  flex: 1;
}

.code-btn,
.submit-btn {
  border: none;
  border-radius: 16rpx;
}

.code-btn {
  flex-shrink: 0;
  min-width: 210rpx;
  height: 84rpx;
  line-height: 84rpx;
  background: rgba(124, 77, 255, 0.12);
  color: #7c4dff;
  font-size: 26rpx;
  font-weight: 600;
}

.code-btn[disabled] {
  opacity: 0.65;
}

.submit-btn {
  margin-top: 8rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #7c4dff 0%, #5f35db 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
}

.submit-btn[disabled] {
  opacity: 0.7;
}

.auth-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-top: 28rpx;
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
