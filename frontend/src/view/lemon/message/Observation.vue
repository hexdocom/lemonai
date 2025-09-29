<template>
  <div>
    <!-- {{ action }} -->
    <div class="think" v-if="action.status == 'running'">
      <LoadingOutlined />
      <span style="margin-left: 5px">{{ command }} {{ information }}</span>
    </div>
    <div class="observation" :class="status" @click="togglePreview" v-else>
      <div class="observation-details" v-if="information">
        <div class="command-output">
          <component :is="iconComponent" />
          <div class="command-output-text">{{ command }} {{ information }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Message from "./Message.vue";
import emitter from "@/utils/emitter";
import Browse from "@/assets/message/browse.svg";
import Edit from "@/assets/message/edit.svg";
import Bash from "@/assets/message/bash.svg";
import Think from "@/assets/message/think.svg";
import Tools from "@/assets/message/tools.svg";
import { LoadingOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";

const { t } = useI18n();

const props = defineProps({
  action: {
    type: Object,
    required: true,
  },
});

const actionTypeDescriptions = {
  terminal_run: t("lemon.message.runCommand"),
  read_code: t("lemon.message.readFile"),
  write_code: t("lemon.message.editFile"),
  browser: t("lemon.message.browsing"),
  web_search: t("lemon.message.searching"),
  read_file: t("lemon.message.readFile"),
  mcp_tool: "MCP",
};
const svgHash = {
  browse: Browse,
  write_code: Edit,
  terminal_run: Bash,
  read_code: Edit,
  read_file: Edit,
  web_search: Browse,
  browser: Browse,
  mcp_tool: Bash,
};

const command = computed(() => {
  const actionType = props.action.meta.action_type;
  return actionTypeDescriptions[actionType] || "";
});

const iconComponent = computed(() => {
  const actionType = props.action.meta.action_type;
  return svgHash[actionType] || Tools; // 使用Tools作为默认的工具调用图标
});

const information = computed(() => {
  if (props.action.meta.action_type == "terminal_run") {
    return props.action.content[0];
  }
  return props.action.content;
});

const togglePreview = () => {
  emitter.emit("preview", { message: props.action });
};
</script>

<style lang="scss" scoped>
.observation {
  max-width: calc(100% - 16px);
  margin: 8px 0;
  padding: 4px 12px;
  cursor: pointer;
  background-color: #37352f0a;
  border: 1px solid #0000000a;
  border-radius: 15px;
  font-size: 14px;

  .observation-header {
    min-width: 200px;
    padding: 8px 12px;
    background-color: #f5f5f5;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &:hover {
      background-color: #eee;
    }
  }

  .command-preview {
    font-family: monospace;
    margin-right: 12px;
  }

  .expand-icon {
    font-size: 12px;
    color: #666;
  }

  .observation-details {
    .command-output {
      margin: 0;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 14px;
      display: flex !important;
    }

    .command-output-text {
      width: calc(100% - 1rem);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}
</style>
