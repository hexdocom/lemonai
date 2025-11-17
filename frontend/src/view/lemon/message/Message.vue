<!-- cspell:ignore anticon -->
<template>
  <!-- <div>{{ message }}</div> -->
  <!-- web search -->
  <div v-if="message?.meta?.action_type === 'chat' && searchResults.length > 0" class="web-search-results-compact" @click="openDrawer(message)">
    <div class="search-results-icons">
      <div 
        v-for="(result, index) in searchResults.slice(0, 10)" 
        :key="index" 
        class="result-icon-item"
        :style="{ zIndex: 10 - index }"
        @click.stop="openUrl(result.url)"
        @mouseenter="showTooltip($event, result)"
        @mouseleave="hideTooltip"
      >
        <img 
          :src="getFaviconUrl(result.url)" 
          :alt="formatUrl(result.url)"
          @error="handleImageError"
          class="favicon-img"
        />
      </div>
      <div v-if="searchResults.length > 10" class="more-count">
        +{{ searchResults.length - 10 }}
      </div>
    </div>
    <div class="search-results-info">
      <span class="search-icon">🔍</span>
      <span class="search-text">{{ searchResults.length }} websites found</span>
    </div>
    
    <!-- 自定义悬浮提示框 -->
    <div 
      v-if="tooltip.visible" 
      class="custom-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
      @mouseenter="cancelHideTooltip"
      @mouseleave="hideTooltip"
      @click="openUrl(tooltip.currentUrl)"
    >
      <div class="tooltip-title">{{ tooltip.title }}</div>
      <div class="tooltip-url">{{ tooltip.url }}</div>
    </div>
  </div> 
  
  <!-- document_query -->
  <div v-if="message?.meta?.action_type === 'chat' && documentQueryResult" class="document-query-result" @click="handleDocumentQueryClick(message)">
    <div class="document-query-info">
      <span class="document-icon">📄</span>
      <span class="document-text">Document Query:{{ documentQueryResult.query }}</span>
    </div>
  </div>
   
  <div style="display: flex; align-items: center" v-if="message.role === 'assistant' && message.is_temp && !message.meta">{{ content }} <LoadingDots /></div>
  <div v-else-if="message?.meta?.action_type === 'plan'">
    <Markdown :content="content" />
    <Planing :planing="message?.meta?.json" />
  </div>
  <div v-else-if="message?.meta?.action_type === 'update_status'">
    <LoadingOutlined />
    <span style="margin-left: 5px">{{ content }}</span>
  </div>
  <!-- 代码编辑 -->
  <div v-else-if="message?.meta?.action_type === 'coding'">
    <CodingMessage :message="message" />
  </div>
  <!-- 停止 -->
  <div v-else-if="message?.meta?.action_type === 'stop'" class="stop">
    <Stop /> <span>LemonAI {{ $t("stop_task") }}</span>
  </div>
  <!-- 任务异常 暂无积分-->
  <div v-else-if="message?.meta?.action_type === 'error' && message?.content.includes('Insufficient credits balance')" class="credits">
    <div style="display: flex; align-items: center">
      <ShoppingCartOutlined class="icon" />
      <span>The task has been paused. Please upgrade plan or buy credits to continue.</span>
    </div>
    <a-button type="primary" v-if="route.name != 'share'" @click="handleUpgrade">Upgrade</a-button>
  </div>
  <!-- 任务异常 完成 -->
  <div v-else-if="message?.meta?.action_type === 'error'" class="error">
    <span>Task stopped, Please try another task</span>
  </div>

  <Markdown v-else-if="message.role === 'assistant'" :content="content" />
  <span v-else>{{ content }}</span>
  <!-- <span>{{ message }}</span> -->
  <!-- 文件列表 -->
  <div class="file-list" v-if="showFiles">
    <MessageFileList :message="message" :role="message.role" :action_type="message?.meta?.action_type" />
  </div>

  <!-- 搜索结果抽屉 -->
  <!-- <SearchResultsDrawer 
    :visible="drawerVisible" 
    :searchResults="searchResults" 
    @close="closeDrawer" 
  /> -->
  
  <!-- 打分 -->
  <!-- {{ message }}
  <div v-if="message?.meta?.action_type === 'finish_summery'">
    <MessageRating :message="message" />
  </div>
   -->
</template>

<script setup>
import { computed, ref, onBeforeUnmount } from "vue";
import { useRoute } from "vue-router";
import Markdown from "@/components/markdown/index.vue";
import LoadingDots from "@/view/lemon/components/LoadingDots.vue";
import { LoadingOutlined, ShoppingCartOutlined } from "@ant-design/icons-vue";
import Planing from "@/view/lemon/message/Planing.vue";
//import MessageRating from "@/view/lemon/components/MessageRating.vue";
import CodingMessage from "@/view/lemon/message/CodingMessage.vue";
import MessageFileList from "@/components/MessageFileList/index.vue";
// import SearchResultsDrawer from "@/view/lemon/message/SearchResultsDrawer.vue";
import Stop from "@/assets/message/stop.svg";
import Failure from "@/assets/message/failure.svg";
import emitter from "@/utils/emitter";

const route = useRoute();
const isUnmounted = ref(false);

// 悬浮提示框状态
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  url: '',
  currentUrl: '' // 当前悬停的URL
});

// 抽屉状态
const drawerVisible = ref(false);

let hideTimer = null;


const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
});

const showFiles = computed(() => {
  //, "chat"
  const actions = new Set(["finish_summery", "question", "progress"]);
  return actions.has(props.message?.meta?.action_type);
});

const content = computed(() => {
  return props.message.content;
});

// 解析搜索结果
const searchResults = computed(() => {
  //docset_id
  if (isUnmounted.value) return [];
  console.log("searchResults", props.message);
  
  // 检查是否有meta数据
  if (!props.message?.meta) return [];
  
  // 先解析meta.json数据
  let parsedMeta = null;
  try {
    if (typeof props.message.meta === 'string') {
      parsedMeta = JSON.parse(props.message.meta);
    } else {
      parsedMeta = props.message.meta;
    }
  } catch (error) {
    console.warn('Failed to parse meta:', error);
    return [];
  }
  
  // 检查是否为chat类型且有json数据
  if (parsedMeta?.action_type === 'chat' && parsedMeta?.json) {
    try {
      let jsonData = parsedMeta.json;
      
      // 如果json是字符串，先解析成对象
      if (typeof jsonData === 'string') {
        jsonData = JSON.parse(jsonData);
      }
      
      // 检查解析后的数据是否为数组
      if (Array.isArray(jsonData)) {
        console.log('Parsed JSON:', jsonData);
        // 过滤掉包含 docset_id 的项
        return jsonData.filter(item => !item.hasOwnProperty('docset_id'));
      }
      
      // 如果不是数组，返回空数组
      console.warn('Parsed JSON is not an array:', jsonData);
      return [];
      
    } catch (error) {
      console.warn('Failed to parse search results json:', error);
      return [];
    }
  }
  
  return [];
});

// 解析文档查询结果
const documentQueryResult = computed(() => {
  if (isUnmounted.value) return null;
  
  // 检查是否有meta数据
  if (!props.message?.meta) return null;
  
  // 先解析meta数据
  let parsedMeta = null;
  try {
    if (typeof props.message.meta === 'string') {
      parsedMeta = JSON.parse(props.message.meta);
    } else {
      parsedMeta = props.message.meta;
    }
  } catch (error) {
    console.warn('Failed to parse meta:', error);
    return null;
  }
  
  // 检查是否为chat类型且有json数据
  if (parsedMeta?.action_type === 'chat' && parsedMeta?.json) {
    try {
      let jsonData = parsedMeta.json;
      
      // 如果json是字符串，先解析成对象
      if (typeof jsonData === 'string') {
        jsonData = JSON.parse(jsonData);
      }
      
      // 检查是否为数组并找到document_query类型的项
      if (Array.isArray(jsonData)) {
        const docQueryItem = jsonData.find(item => 
          item.result_type === 'document_query' && item.docset_id
        );
        
        if (docQueryItem) {
          return {
            query: docQueryItem.query
          };
        }
      }
      
    } catch (error) {
      console.warn('Failed to parse document query json:', error);
      return null;
    }
  }
  
  return null;
});

// 格式化URL显示
const formatUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
};


// 获取网站favicon
const getFaviconUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=16`;
  } catch {
    return '';
  }
};

// 处理图片加载错误
const handleImageError = (event) => {
  const img = event.target;
  const fallbackIcon = img.nextElementSibling;
  if (img && fallbackIcon) {
    img.style.display = 'none';
    fallbackIcon.style.display = 'flex';
  }
};

// 显示悬浮提示框
const showTooltip = (event, result) => {
  if (isUnmounted.value) return;
  
  // 清除隐藏定时器
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  
  const rect = event.currentTarget.getBoundingClientRect();
  tooltip.value = {
    visible: true,
    x: rect.left + rect.width / 2,
    y: rect.top - 10,
    title: result.title || 'Unknown Site',
    url: formatUrl(result.url),
    currentUrl: result.url
  };
};

// 隐藏悬浮提示框（延迟执行）
const hideTooltip = () => {
  hideTimer = setTimeout(() => {
    tooltip.value.visible = false;
  }, 100); // 100ms延迟
};

// 取消隐藏悬浮提示框
const cancelHideTooltip = () => {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

// 打开抽屉
const openDrawer = (message) => {
  // if (!isUnmounted.value) {
  //   drawerVisible.value = true;
  // }
  emitter.emit("preview-new",{message});
};

// 关闭抽屉
const closeDrawer = () => {
  drawerVisible.value = false;
};

// 打开URL
const openUrl = (url) => {
  if (url && !isUnmounted.value) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// 生命周期钩子
onBeforeUnmount(() => {
  isUnmounted.value = true;
  tooltip.value.visible = false;
  drawerVisible.value = false;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
});


//升级 emitter
const handleUpgrade = () => {
  emitter.emit("showUpgrade");
};

// 文档查询点击事件
const handleDocumentQueryClick = (message) => {
  emitter.emit("preview-new",{message});
};
</script>

<style lang="scss" scoped>
// code {
//   max-width: 600px;
// }

// Document query result styles
.document-query-result {
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: rgba(55, 53, 47, 0.0392156863);
  border: 1px solid rgba(0, 0, 0, 0.0392156863);
  border-radius: 15px;
  cursor: pointer;
}

.document-query-info {
  display: flex;
  align-items: center;
  gap: 6px;
  
  .document-icon {
    font-size: 14px;
  }
  
  .document-text {
    color: #595959;
    font-size: 13px;
    font-weight: 500;
  }
}

.stop {
  display: flex;
  width: 100%;
  color: #efa201;
  padding-top: 5px;
  padding-bottom: 5px;
  border-radius: 100px;
  gap: 0.375rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  background-color: #efa2011f;
  line-height: 18px;
  font-size: 13px;
  align-items: center;
  svg {
    min-width: 16px;
    min-height: 16px;
  }
}

.file-list {
  line-height: 0px !important;
}

.error {
  display: flex;
  justify-content: center;
  width: 100%;
  color: #666;
  padding-top: 5px;
  padding-bottom: 5px;
  border-radius: 100px;
  gap: 0.5rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  background-color: rgba(55, 53, 47, 0.0392156863);
  line-height: 18px;
  font-size: 13px;
  align-items: center;
}

.credits {
  display: flex;
  align-items: center;
  color: #1a1a19;
  background-color: #fff; /* 更浅的黄色背景 */
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(55, 53, 47, 0.0392156863); /* 添加边框 */
  font-size: 13px;
  line-height: 1.5;
  gap: 8px;
  width: 100%;
  justify-content: space-between;
  // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.icon {
  font-size: 21px;
  color: #1a1a19;
  flex-shrink: 0;
  border-radius: 21px;
  padding: 5px;
}

// Web search results compact styles
.web-search-results-compact {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  cursor: pointer;
  background-color: rgba(55, 53, 47, 0.0392156863);
  border: 1px solid rgba(0, 0, 0, 0.0392156863);
  border-radius: 15px;
}

.search-results-icons {
  display: flex;
  align-items: center;
  position: relative;
  height: 24px;
}

.result-icon-item {
  position: relative;
  width: 20px;
  height: 20px;
  margin-left: -6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  
  &:first-child {
    margin-left: 0;
  }
  
  &:hover {
    transform: translateY(-2px) scale(1.1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  .favicon-img {
    width: 20px;
    height: 20px;
    display: block;
    object-fit: cover;
    border-radius: 50%;
  }
  
  .fallback-icon {
    display: none;
    font-size: 12px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #f0f0f0;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    line-height: 20px;
    text-align: center;
  }
}

.more-count {
  position: relative;
  width: 24px;
  height: 24px;
  margin-left: -6px;
  background: linear-gradient(135deg, #1890ff, #40a9ff);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.search-results-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  
  .search-icon {
    font-size: 14px;
  }
  
  .search-text {
    color: #595959;
    font-size: 13px;
    font-weight: 500;
  }
}

// 自定义悬浮提示框样式
.custom-tooltip {
  position: fixed;
  z-index: 9999;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.0588235294);
  color: #34322d;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  max-width: 280px;
  min-width: 150px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transform: translateX(-50%) translateY(-100%);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.2s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
  }
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tooltip-url {
  color: #34322d;
  /** 下滑线 */
  text-decoration: underline;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tooltip-hint {
  color: #bfbfbf;
  font-size: 11px;
  font-style: italic;
}

</style>
