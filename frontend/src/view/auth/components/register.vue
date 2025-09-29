<template>
    <div>
      <!-- Register Form -->
      <div class="social-buttons">
        <a-button class="social-button google" @click="handleGoogleRegister" v-if="isAbroad">
          <template #icon>
            <google />
          </template>
          {{ $t('auth.registerWithGoogle') }}
        </a-button>
      </div>
  
      <div class="divider" v-if="isAbroad">
        <span>{{ $t('auth.or') }}</span>
      </div>
  
      <a-form :model="registerForm" name="register-form" @finish="handleRegister" autocomplete="off" layout="vertical">
        <!-- Fullname -->
        <a-form-item name="fullname" :rules="[{ required: true, message: $t('auth.pleaseInputFullname') }]">
          <div class="form-label">
            {{ $t('auth.fullname') }}<span class="required-mark">*</span>
          </div>
          <a-input v-model:value="registerForm.fullname" :placeholder="$t('auth.pleaseInputFullname')" />
        </a-form-item>
  
        <!-- Email (abroad) -->
        <a-form-item v-if="isAbroad" name="email" :rules="[
          { required: true, message: $t('auth.pleaseInputEmail') },
          { type: 'email', message: $t('auth.pleaseInputValidEmail') }
        ]">
          <div class="form-label">
            {{ $t('auth.email') }}<span class="required-mark">*</span>
          </div>
          <a-input v-model:value="registerForm.email" :placeholder="$t('auth.pleaseInputEmail')" />
        </a-form-item>
  
        <!-- Phone (domestic) -->
        <a-form-item v-else name="phone" :rules="[
          { required: true, message: $t('auth.pleaseInputPhone') },
          { pattern: /^1[3-9]\d{9}$/, message: $t('auth.pleaseInputValidPhone') }
        ]">
          <div class="form-label">
            {{ $t('auth.phone') }}<span class="required-mark">*</span>
          </div>
          <a-input v-model:value="registerForm.phone" :placeholder="$t('auth.pleaseInputPhone')" />
        </a-form-item>
  
        <!-- Password -->
        <a-form-item name="password" :rules="[{ required: true, message: $t('auth.pleaseInputPassword') }]">
          <div class="form-label">
            {{ $t('auth.password') }}<span class="required-mark">*</span>
          </div>
          <a-input-password v-model:value="registerForm.password" :placeholder="$t('auth.pleaseInputPassword')" />
        </a-form-item>
  
        <!-- SMS Code (only for domestic users) -->
        <a-form-item v-if="!isAbroad" name="smsCode" :rules="[{ required: true, message: $t('auth.pleaseInputSMSCode') }]">
          <div class="form-label">
            {{ $t('auth.smsCode') }}<span class="required-mark">*</span>
          </div>
          <a-input-group compact>
            <a-input v-model:value="registerForm.smsCode" style="width: 65%;" :placeholder="$t('auth.pleaseInputSMSCode')" />
            <a-button
              style="width: 30%; margin-left: 5%; color:#fff"
              :disabled="smsCountdown > 0"
              @click="sendSMSCode"
            >
              {{ smsCountdown > 0 ? `${smsCountdown}s` : $t('auth.sendCode') }}
            </a-button>
          </a-input-group>
        </a-form-item>
  
        <!-- Submit Button -->
        <a-form-item>
          <a-button type="primary" html-type="submit" block :loading="loading" :disabled="!isRegisterValid">
            {{ $t('auth.register') }}
          </a-button>
        </a-form-item>
  
        <!-- Footer -->
        <div class="auth-footer">
          <span>{{ $t('auth.haveAccount') }}</span>
          <a @click="toLogin">{{ $t('auth.login') }}</a>
        </div>
      </a-form>
    </div>
</template>
<script setup>
import { computed, reactive,ref } from 'vue';
import google from '@/assets/svg/google.svg';
import { message } from 'ant-design-vue';
import { MobileOutlined } from '@ant-design/icons-vue';
//判断是国内还是海外 VITE_REGION
import { useI18n } from 'vue-i18n';
const isAbroad = ref(true)
const { t } = useI18n();
import auth from '@/services/auth';
const emit = defineEmits(['toLogin','handleRegister','handleGoogleRegister']);

// 注册表单

const registerForm = ref({
  fullname: '',
  email: '',
  phone: '',
  password: '',
  smsCode: ''
})
const smsCountdown = ref(0)
let smsTimer = null

const isRegisterValid = computed(() => {
  return registerForm.value.fullname &&
    (isAbroad.value ? registerForm.value.email : registerForm.value.phone) &&
    registerForm.value.password &&
    (!isAbroad.value ? registerForm.value.smsCode : true)
})


const handleGoogleRegister = async () => {
  emit('handleGoogleRegister');
};

const toLogin = () => {
    emit('toLogin');
};

const handleRegister = async (value) => { 
    emit('handleRegister', value);
};


function sendSMSCode() {
  if (!/^1[3-9]\d{9}$/.test(registerForm.value.phone)) {
    message.error(t('auth.pleaseInputValidPhone'))
    return
  }
  auth.sendSmsCode(registerForm.value.phone)
  // 模拟发送验证码
  smsCountdown.value = 60
  smsTimer = setInterval(() => {
    smsCountdown.value--
    if (smsCountdown.value <= 0) {
      clearInterval(smsTimer)
      smsTimer = null
    }
  }, 1000)
}


</script>
<style lang="scss" scoped>
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
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: none;
        background-color: white;
        color: #333;

        img {
            margin-right: 6px;
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

.divider {
    position: relative;
    text-align: center;
    margin: 24px 0;

    &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background-color: #e5e7eb;
        z-index: 0;
    }

    span {
        position: relative;
        background-color: transparent;
        padding: 0 12px;
        color: #6b7280;
        font-size: 14px;
        z-index: 1;
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
</style>