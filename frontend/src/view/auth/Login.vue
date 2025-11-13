<template>
  <div class="auth-container">
    <div class="auth-content">
      <!-- Logo -->
      <div class="logo-container">
        <div class="logo">
          <img :src="logo" alt="logo" />
        </div>
      </div>
      <!-- Title -->
      <h2 class="auth-title">{{ pageTitle }}</h2>
      <div v-if="activeKey === 'login'">
        <login @toRegister="handleToRegister" @handleLogin="handleLogin" @toForgot="handleToForgot" @handleGoogleLogin="handleGoogleLogin" @handleSMSLogin="activeKey = 'smsLogin'" />
      </div>
      <div v-if="activeKey === 'smsLogin'">
        <smsLogin @toLogin="activeKey = 'login'" @handleLoginSMSCode="handleLoginSMSCode" />
      </div>
      <div v-if="activeKey === 'register'">
        <!-- Register Form -->
        <register @toLogin="activeKey = 'login'" @handleRegister="handleRegister" @handleGoogleRegister="handleGoogleLogin"/>
      </div>
      <div v-if="activeKey === 'forgot'">
        <forgot @toLogin="activeKey = 'login'" @handleForgotPassword="handleForgotPassword"/>
      </div>
      <div v-if="activeKey === 'verify'">
        <!-- Email Verification Form -->
        <div class="verify-container">
          <p class="verify-text">{{ $t('auth.codeSentTo') }} {{ verifyEmail }}</p>
          <a-form :model="verifyForm" name="verify-form" @finish="handleVerify" autocomplete="off" layout="vertical">
            <a-form-item name="code" :rules="[{ required: true, message: $t('auth.pleaseInput6DigitCode') }]">
              <a-input v-model:value="verifyForm.code" :placeholder="$t('auth.pleaseInput6DigitCode')">
              </a-input>
            </a-form-item>
            <a-form-item>
              <a-button type="primary" html-type="submit" block :loading="loading" :disabled="!verifyForm.code">
                {{ $t('auth.verifyEmailButton') }}
              </a-button>
            </a-form-item>
            <div class="verify-footer">
              <p>{{ $t('auth.notReceivedCode') }} <a @click="resendCode">{{ $t('auth.resendCode') }}</a></p>
            </div>
          </a-form>
        </div>
      </div>
      <div class="auth-footer">
        <span class="auth-footer-keep-offline" @click="toHome">{{ $t('auth.keepOffline') }}</span>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import logo from '@/assets/image/lemon.jpg';
import google from '@/assets/svg/google.svg';

// import apple from '@/assets/svg/apple.svg';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import auth from '@/services/auth';

import login from './components/login.vue'
import register from './components/register.vue'
import forgot from './components/forgot.vue'
import smsLogin from './components/sms-login.vue'

import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/modules/user.js'
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const router = useRouter();
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

// 页面状态
const activeKey = ref('login');
const loading = ref(false);


onMounted(() => {
  const isClient = import.meta.env.VITE_IS_CLIENT === 'true';
  console.log("isClient === ",isClient);
  if(window.electronAPI){
    window.electronAPI.on('oauth-login-success', ({ code, state }) => {
      if  (user.value.id) {
        window.location.href = '/';
      }else{
        window.location.hash = `/auth/google?code=${code}&state=${state}`;
      }
    });
  }
})

//判断是国内还是海外 VITE_REGION
const isAbroad = ref(true)



// 验证相关状态
const verifyEmail = ref('');
const verifyForm = reactive({
  code: ''
});

// 页面标题
const pageTitle = computed(() => {
  switch (activeKey.value) {
    case 'login':
      return t('auth.loginToLemonAI');
    case 'register':
      return t('auth.registerLemonAIAccount');
    case 'verify':
      return t('auth.verifyEmail');
    case 'smsLogin':
      return t('auth.loginToLemonAI');
    default:
      return t('auth.resetPassword');
  }
});

// 处理验证码提交
const handleVerify = async () => {
  try {
    loading.value = true;
    const res = await auth.verifyEmailVerifyCode(verifyEmail.value, verifyForm.code);
    if (res.code === 200) {
      const resRegister = await auth.register(
        registerForm.value.fullname,
        registerForm.value.email,
        registerForm.value.password,
        ''
      );
      if (resRegister.code === 200) {
        message.success(t('auth.registrationSuccessful'));
        activeKey.value = 'login';
      } else {
        message.error(resRegister.message);
      }
    } else {
      message.error(res.message);
    }
  } catch (error) {
    message.error(t('auth.verificationCodeError'));
  } finally {
    loading.value = false;
  }
};

// 重新发送验证码
const resendCode = async () => {
  const now = new Date();
  const lastSendTimeString = localStorage.getItem('lastSendTime');
  if (lastSendTimeString) {
    const lastSendTime = new Date(lastSendTimeString);
    const diff = now - lastSendTime;
    if (diff < 60000) {
      message.error(t('auth.doNotSendFrequently'));
      return;
    }
  }
  localStorage.setItem('lastSendTime', now.toString());
  loading.value = true;
  const res = await auth.sendEmailVerification(verifyEmail.value);
  if (res.code === 200) {
      verifyForm.code = '';
      message.info(t('auth.codeResent'));
      loading.value = false;
  } else {
    message.error(res.message);
    loading.value = false;
  }
};

const toHome = () => {
  router.push('/');
};

// 跳转到线上注册页面
const handleToRegister = () => {
  window.open('https://app.lemonai.ai/auth', '_blank');
};

// 跳转到线上忘记密码页面
const handleToForgot = () => {
  window.open('https://app.lemonai.ai/auth', '_blank');
};

// 处理登录
const handleLogin = async (values) => {
  try {
    loading.value = true;
    const res = await auth.login(values.email, values.password,values.phone);
    console.log('res', res);
    if (res.code === 200) {
      message.success(t('auth.loginSuccessful'));
      router.push({ name: 'lemon' });
    } else {
      message.error(res.message);
    }
  } catch (error) {
    console.log('error', error);
    message.error(t('auth.loginFailed'));
  } finally {
    loading.value = false;
  }
};

//短信验证码登录 
const handleLoginSMSCode = async (values) => { 
  const res = await auth.loginSMSCode(values.phone, values.smsCode);
  if (res.code === 200) {
    message.success(t('auth.loginSuccessful'));
    router.push({ name: 'lemon' });
  }else{
    message.error(res.message);
    return;
  }
};
const registerForm = ref({});
// 处理注册
const handleRegister = async (values) => {
  console.log('handleRegister', values);
  registerForm.value = values;
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(values.email) && isAbroad.value) {
      throw new Error(t('auth.pleaseEnterValidEmail'));
    }
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(values.phone) && !isAbroad.value) {
      throw new Error(t('auth.pleaseInputValidPhone'));
    }
    if (values.password.length < 6) {
      throw new Error(t('auth.passwordTooShort'));
    }
    if(isAbroad.value){
      verifyEmail.value = values.email;
      const res = await auth.sendEmailVerification(values.email);
      if (res.code === 200) {
        message.success(t('auth.codeSent'));
        activeKey.value = 'verify';
      } else {
        message.error(res.message);
      }
    }else{
      //验证短信验证码 values.smsCode
      let smsRes = await auth.verifySmsVerifyCode(values.phone, values.smsCode);
      if (smsRes.code === 200) {
        let res = await auth.register(values.fullname, "", values.password,values.phone);
        if (res.code === 200) {
          message.success(t('auth.registrationSuccessful'));
          activeKey.value = 'login';
        } else {
          message.error(res.message);
        }
      } else {
        message.error(t('auth.verificationCodeError'));
      }
      console.log("smsRes",smsRes);
    
    }

    localStorage.setItem('lastSendTime', new Date().toString());

  } catch (error) {
    message.error(error.message || t('auth.registrationFailed'));
  } finally {
  }
};

// 处理忘记密码
const handleForgotPassword = async (values) => {
  try {
    loading.value = true;
    //第一步 校验验证码
    let codeRes = null;
    if(isAbroad.value){
      codeRes = await auth.verifyEmailVerifyCode(values.email, values.code);
    }else{
      codeRes = await auth.verifySmsVerifyCode(values.phone, values.smsCode);
    }
    if(codeRes.code === 200){
      //重置密码
      let res = await auth.resetPassword(values.email, values.password,values.phone);
      if(res.code === 200){
        message.success(t('auth.passwordResetSuccessful'));
        activeKey.value = 'login';
      }else{
        message.error(t('auth.passwordResetFailed'));
      }
    }else{
      message.error(t('auth.codeError'));
      return;
    }
  } catch (error) {
    message.error(t('auth.passwordResetFailed'));
  } finally {
    loading.value = false;
  }
};

// 社交登录方法
const handleGoogleLogin = () => {
  try {
    loading.value = true;
    const isClient = import.meta.env.VITE_IS_CLIENT === 'true';
    const redirectUri = isClient
      ? import.meta.env.VITE_GOOGLE_REDIRECT_URI_ELECTRON// Electron 主进程处理
      : 'http://localhost:5005/api/users/auth/google'; 
    const clientId = '973572698649-hbp15ju1nhlsja1k2gbqktmrulk0hopp.apps.googleusercontent.com';
    const scope = encodeURIComponent('profile email');
    const responseType = 'code';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=${responseType}&access_type=offline&prompt=consent`;
    window.location.href = googleAuthUrl;
  } catch (error) {
    message.error(t('auth.googleLoginFailed'));
  } finally {
    loading.value = false;
  }
};

const handleAppleLogin = async () => {
  try {
    loading.value = true;
    message.info(t('auth.appleLoginInProgress'));
  } finally {
    loading.value = false;
  }
};


const handleAppleRegister = async () => {
  try {
    loading.value = true;
    message.info(t('auth.appleRegisterInProgress'));
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>


.auth-footer {
    text-align: center;
    margin-top: 16px;
    font-size: 14px;
    color: #6b7280;

    .auth-footer-keep-offline{
        //下划线
        text-decoration: underline;
        // margin-left: 8px;;
        cursor: pointer;
    }
}

.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f8f8f7;

  .auth-content {
    width: 100%;
    max-width: 420px;
    padding: 32px;

    .logo-container {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;

      .logo {
        width: 64px;
        height: 64px;
        color: #333;

        img{
          width: 100%;
          height: 100%;
        }
      }
    }

    .auth-title {
      text-align: center;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 32px;
      color: #111827;
    }

    .social-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
      align-items: center;

      .social-button {
        width: 100%;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: #333;


        img {
          margin-right: 6px;
        }

        &.google {
          border: none;
          background-color: white;
          color: #333;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      }



    }



    .password-label-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;

      .form-label {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.85);
        font-weight: 500;
      }

      .forgot-link {
        font-size: 14px;
        color: #4f46e5;
        cursor: pointer;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    :deep(.ant-form-item-control-input-content) {
      width: 360px;
    }

    :deep(.ant-form-item) {
      width: 100%;
      margin-bottom: 20px;
      display: flex;
      justify-content: center;

      .ant-form-item-control {
        width: 100%;
      }

      .ant-form-item-label>label {
        font-size: 14px;
        font-weight: 500;
        color: #374151;
      }

      .form-label {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.85);
        font-weight: 500;
        margin-bottom: 4px;

        .required-mark {
          color: #ff4d4f;
          margin-left: 2px;
        }
      }

      .ant-input {
        width: 100%;
        height: 40px;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        background-color: #ffffff;

        &:hover,
        &:focus {
          border-color: #4f46e5;
        }
      }

      .ant-input-affix-wrapper {
        width: 100%;
        height: 40px !important;
        border-radius: 8px !important;
        border: 1px solid #d1d5db !important;
        background-color: #ffffff !important;
        box-shadow: none !important;
        padding: 0 11px !important;

        &:hover,
        &:focus,
        &-focused {
          border-color: #4f46e5 !important;
        }



        .ant-input {
          width: 100% !important;
          height: 38px !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          background-color: #ffffff !important;

          &:focus {
            box-shadow: none !important;
          }
        }

        .ant-input-suffix {
          margin-left: 0 !important;
        }
      }

      .ant-btn {
        width: 100%;
        height: 40px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        background-color: #4f46e5;
        border-color: #4f46e5;

        &:hover {
          background-color: #4338ca;
          border-color: #4338ca;
        }

        &[disabled] {
          background-color: #d1d5db;
          border-color: #d1d5db;
          color: white;
          cursor: not-allowed;

          &:hover {
            background-color: #d1d5db;
            border-color: #d1d5db;
          }
        }
      }
    }

    .auth-footer {
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
      color: #6b7280;

      a {
        color: #4f46e5;
        font-weight: 500;
        cursor: pointer;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}

.verify-container {
  text-align: center;
  padding: 24px;

  .verify-icon {
    margin-bottom: 24px;

    svg {
      color: #4f46e5;
    }
  }

  .verify-title {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #111827;
  }

  .verify-text {
    font-size: 16px;
    color: #6b7280;
    margin-bottom: 32px;
  }

  .verify-footer {
    margin-top: 24px;
    font-size: 14px;
    color: #6b7280;

    p {
      margin-bottom: 12px;
    }

    a {
      color: #4f46e5;
      font-weight: 500;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  :deep(.ant-form-item) {
    max-width: 100%;
    margin: 0 auto;

    .ant-input {
      text-align: center;
      letter-spacing: 8px;
      font-size: 18px;
    }
  }
}
</style>