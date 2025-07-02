<template>
  <div class="mcp-server-content" v-if="server">
    <div class="mcp-server-content-header">
      <div style="display: flex; align-items: center">
        <span class="mcp-server-content-header-title">
          {{ server.name }}
        </span>
        <DeleteOutlined class="mcp-server-content-header-delete-button" @click="showDeleteConfirm(server.id)" />
      </div>
      <div style="display: flex; align-items: center">
        <a-switch v-model:checked="server.activate" class="mcp-server-content-header-activate-switch" :loading="loading" @change="handleActivateChange" />
        <div class="mcp-server-content-header-save-button-container">
          <a-button type="primary" @click="$emit('save')" class="mcp-server-content-header-save-button">
            <SaveOutlined />
            {{ $t("setting.mcpService.save") }}
          </a-button>
        </div>
      </div>
    </div>

    <div class="mcp-server-content-main">
      <div class="mcp-server-content-main-name mcp-server-content-main-item">
        <span>{{ $t("setting.mcpService.name") }}</span>
        <a-input v-model:value="server.name" :placeholder="$t('setting.mcpService.namePlaceholder')" class="text-item input" />
      </div>
      <div class="mcp-server-content-main-description mcp-server-content-main-item">
        <span>{{ $t("setting.mcpService.description") }}</span>
        <a-textarea v-model:value="server.description" :rows="4" :placeholder="$t('setting.mcpService.descriptionPlaceholder')" class="text-item" />
      </div>
      <!-- type -->
      <div class="mcp-server-content-main-type mcp-server-content-main-item">
        <span>{{ $t("setting.mcpService.type") }}</span>
        <a-radio-group v-model:value="server.type" name="radioGroup" class="input radio">
          <a-radio value="stdio">
            {{ $t("setting.mcpService.stdio") }}
          </a-radio>
          <a-radio value="sse">
            {{ $t("setting.mcpService.sse") }}
          </a-radio>
          <a-radio value="streamableHttp">
            {{ $t("setting.mcpService.streamableHttp") }}
          </a-radio>
        </a-radio-group>
      </div>
      <div class="mcp-server-content-main-command mcp-server-content-main-item" v-if="server.type === 'stdio'">
        <span>{{ $t("setting.mcpService.command") }}</span>
        <a-input v-model:value="server.command" :placeholder="$t('setting.mcpService.commandPlaceholder')" class="text-item input" />
      </div>
      <div v-if="startsWithNpx || startsWithUvx" class="mcp-server-content-main-source mcp-server-content-main-item">
        <span>{{ $t("setting.mcpService.packageSource") }}</span>
        <a-radio-group v-if="startsWithNpx" v-model:value="server.registryUrl" name="radioGroup" class="input radio">
          <a-radio value="">{{ $t("setting.mcpService.default") }}</a-radio>
          <a-radio value="https://registry.npmmirror.com">
            {{ $t("setting.mcpService.taobaoNpmMirror") }}
          </a-radio>
        </a-radio-group>
        <a-radio-group v-if="startsWithUvx" v-model:value="server.registryUrl" name="radioGroup" class="input radio">
          <a-radio value="">{{ $t("setting.mcpService.default") }}</a-radio>
          <a-radio value="https://pypi.tuna.tsinghua.edu.cn/simple">
            {{ $t("setting.mcpService.tsinghua") }}
          </a-radio>
          <a-radio value="http://mirrors.aliyun.com/pypi/simple/">
            {{ $t("setting.mcpService.aliyun") }}
          </a-radio>
          <a-radio value="https://mirrors.ustc.edu.cn/pypi/simple/">
            {{ $t("setting.mcpService.ustc") }}
          </a-radio>
          <a-radio value="https://repo.huaweicloud.com/repository/pypi/simple/">
            {{ $t("setting.mcpService.huaweiCloud") }}
          </a-radio>
          <a-radio value="https://mirrors.cloud.tencent.com/pypi/simple/">
            {{ $t("setting.mcpService.tencentCloud") }}
          </a-radio>
        </a-radio-group>
      </div>
      <div v-if="server.type === 'sse' || server.type === 'streamableHttp'" class="mcp-server-content-main-url mcp-server-content-main-item">
        <span>URL</span>
        <a-input v-model:value="server.url" :placeholder="$t('setting.mcpService.urlPlaceholder')" class="text-item input" @update:value="handleUpdateServer({ url: $event })" />
      </div>
      <div class="mcp-server-content-main-args mcp-server-content-main-item">
        <span>{{ $t("setting.mcpService.args") }}</span>
        <a-textarea v-model:value="argsText" :rows="4" :placeholder="$t('setting.mcpService.argsPlaceholder')" class="text-item" @update:value="handleArgsChange" />
      </div>
      <div class="mcp-server-content-main-env mcp-server-content-main-item">
        <span>{{ $t("setting.mcpService.env") }}</span>
        <a-textarea v-model:value="envText" :rows="4" :placeholder="$t('setting.mcpService.envPlaceholder')" class="text-item" @update:value="handleEnvChange" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, h } from "vue";
import { SaveOutlined, DeleteOutlined, ExclamationCircleOutlined, LoadingOutlined } from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import mcp_service from "@/services/mcp";

const props = defineProps({
  server: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n();
const emit = defineEmits(["update:server", "save", "delete"]);

const argsText = ref("");
const envText = ref("");
const loading = ref(false);

const startsWithNpx = computed(() => {
  return props.server?.command?.startsWith("npx");
});

const startsWithUvx = computed(() => {
  return props.server?.command?.startsWith("uv");
});

const validateServerConnection = async () => {
  try {
    loading.value = true;
    const r = await mcp_service.connect(props.server);
    return r.ok;
  } catch (error) {
    message.error(error.message);
    return false;
  } finally {
    loading.value = false;
  }
};

const handleActivateChange = async (checked) => {
  if (checked) {
    const isValid = await validateServerConnection();
    if (!isValid) {
      message.error("MCP connection failed");
      emit("update:server", { ...props.server, activate: false });
      return;
    }
  }
  emit("update:server", { ...props.server, activate: checked });
  emit("save");
};

const handleArgsChange = (value) => {
  if (!value) {
    emit("update:server", { ...props.server, args: [] });
    return;
  }
  const args = value.split("\n").filter((arg) => arg.trim() !== "");
  emit("update:server", { ...props.server, args });
};

const handleEnvChange = (value) => {
  if (!value) {
    emit("update:server", { ...props.server, env: {} });
    return;
  }
  const env = {};
  value.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      const [key, ...values] = trimmedLine.split("=");
      const trimmedKey = key.trim();
      const trimmedValue = values.join("=").trim();
      if (trimmedKey && trimmedValue) {
        env[trimmedKey] = trimmedValue;
      }
    }
  });
  emit("update:server", { ...props.server, env });
};

const formatArgsText = (args) => {
  return Array.isArray(args) ? args.join("\n") : "";
};

const formatEnvText = (env) => {
  return Object.entries(env || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
};

const showDeleteConfirm = (serverId) => {
  Modal.confirm({
    title: t("setting.mcpService.deleteConfirmTitle"),
    icon: () => h(ExclamationCircleOutlined, { style: "color: #ff4d4f" }),
    content: t("setting.mcpService.deleteConfirmContent"),
    okText: t("common.ok", "Yes"),
    okType: "danger",
    cancelText: t("common.cancel", "Cancel"),
    onOk() {
      emit("delete", serverId);
    },
    onCancel() {
      console.log("Cancel");
    },
  });
};

const handleUpdateServer = (data) => {
  emit("update:server", { ...props.server, ...data });
};

watch(
  () => props.server,
  (newServer) => {
    if (!newServer) return;
    argsText.value = formatArgsText(newServer.args || []);
    envText.value = formatEnvText(newServer.env || {});
  },
  { immediate: true, deep: true }
);
</script>

<style scoped>
.mcp-server-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.mcp-server-content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
}

.mcp-server-content-header-title {
  font-size: 16px;
  font-weight: 500;
  margin-right: 16px;
}

.mcp-server-content-header-delete-button {
  color: #ff4d4f;
  font-size: 16px;
  cursor: pointer;
  margin-left: 8px;
}

.mcp-server-content-header-save-button-container {
  margin-left: 16px;
}

.mcp-server-content-main {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
}

.mcp-server-content-main-item {
  margin-bottom: 24px;
}

.mcp-server-content-main-item > span {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.text-item {
  width: 100%;
}

.radio {
  display: block;
  line-height: 32px;
}
</style>
