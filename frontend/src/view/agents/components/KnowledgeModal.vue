<template>
  <a-modal
    v-model:open="visible"
    title="Experience Management"
    width="900px"
    @cancel="onCancel"
    @ok="onOk"
    :footer="null"
    ok-text="Close"
    :cancel-button-props="{ style: { display: 'none' } }"
  >
    <a-tabs v-model:activeKey="activeTab" @change="onTabChange" style="margin-bottom: 16px;">
      <a-tab-pane key="personal" tab="Personal Experience" />
      <a-tab-pane key="system" tab="System Experience" />
    </a-tabs>

    <div class="toolbar">
      <a-input-search
        v-model:value="searchText"
        placeholder="Please enter content or category"
        enter-button
        @search="onSearch"
        style="max-width: 300px"
      />
      <a-button type="primary" @click="showAddModal">Add Experience</a-button>
    </div>

    <div class="table-container">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        :pagination="{ pageSize: 5 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'create_at'">
            {{ dayjs(record[column.dataIndex]).format('YYYY-MM-DD HH:mm') }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="editItem(record)">Edit</a-button>
              <a-popconfirm title="Are you sure to delete?" @confirm="() => deleteItem(record.id)">
                <a-button danger type="link">Delete</a-button>
              </a-popconfirm>
            </a-space>
          </template>
          <template v-else-if="column.key === 'content'">
            <div class="content-ellipsis">{{ record[column.dataIndex] }}</div>
          </template>
          <template v-else>
            {{ record[column.dataIndex] }}
          </template>
        </template>
      </a-table>

      <!-- 蒙版，仅在非会员查看 system 时显示 -->
      <div v-if="showOverlay" class="overlay-mask">
        <div class="overlay-content">
          {{ $t("setting.experience.systemExperienceRequiresUpgrade") }}
          <button @click="goUpgrade" class="upgrade">{{ $t("member.upgrade") }}</button>
        </div>
        
      </div>
    </div>

    <!-- 编辑 / 添加 弹窗 -->
    <a-modal
      v-model:open="editVisible"
      :title="editingItem?.id ? 'Edit Experience' : 'Add Experience'"
      @ok="saveItem"
      @cancel="editVisible = false"
      :width="700"
    >
      <a-form :model="form" layout="vertical">
        <a-form-item label="Content">
          <a-textarea v-model:value="form.content" :rows="12" placeholder="Enter content here" />
        </a-form-item>
        <a-form-item label="Category">
          <a-select v-model:value="form.category" placeholder="Please select category" allow-clear>
            <a-select-option v-for="item in categories" :key="item" :value="item">
              {{ item }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button
          style="background-color: #1a1a19; border-color: #1a1a19; color: #fff;"
          @click="saveItem"
        >
          Save
        </a-button>
        <a-button @click="editVisible = false">Cancel</a-button>
      </template>
    </a-modal>
  </a-modal>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import dayjs from 'dayjs';
import { message } from 'ant-design-vue';
import service from '@/services/knowledge.js';
import { useChatStore } from '@/store/modules/chat';
import { useUserStore } from '@/store/modules/user'; // 确保你有这行
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

const chatStore = useChatStore();
const { agent } = storeToRefs(chatStore);

const userStore = useUserStore();
const { user, membership, points } = storeToRefs(userStore);

const router = useRouter();

const visible = ref(false);
const editVisible = ref(false);
const editingItem = ref(null);
const form = ref({ content: '', category: '' });

const searchText = ref('');
const data = ref([]);
const categories = ref([]);
const activeTab = ref('personal'); // 当前Tab

// agentId prop
const props = defineProps({
  agentId: {
    type: Number,
    default: 0
  }
});

function getAgentId() {
  return props.agentId || agent.value.id;
}

// 会员校验
const isMember = computed(() => !!membership.value?.planName);
const showOverlay = computed(() => activeTab.value === 'system' && !isMember.value);

// 分类列表
const getCategoryList = async () => {
  try {
    const res = await service.getCategoryList();
    categories.value = res || [];
  } catch (err) {
    console.error(err);
  }
};

// 数据列表
const getList = async () => {
  try {
    const res = await service.getList(getAgentId());
    data.value = activeTab.value === 'system' ? (res.system || []) : (res.personal || []);
  } catch (err) {
    console.error(err);
  }
};

// tab 切换
const onTabChange = async (key) => {
  if (key === 'system' && !isMember.value) {
    // message.warning('You need to upgrade to view system experiences.');
  }
  activeTab.value = key;
  await getList();
};

const filteredList = computed(() =>
  data.value.filter(
    (item) =>
      item.content?.includes(searchText.value) ||
      item.category?.includes(searchText.value)
  )
);

const showAddModal = () => {
  editingItem.value = null;
  form.value = { content: '', category: '' };
  editVisible.value = true;
};

const editItem = (record) => {
  editingItem.value = record;
  form.value = { content: record.content, category: record.category };
  editVisible.value = true;
};

const saveItem = async () => {
  if (!form.value.content || !form.value.category) {
    message.error('Please complete content and category.');
    return;
  }
  try {
    if (editingItem.value?.id) {
      await service.update(editingItem.value.id, form.value.content, form.value.category);
      message.success('Updated successfully.');
    } else {
      await service.create(form.value.content, form.value.category, getAgentId());
      message.success('Added successfully.');
    }
    editVisible.value = false;
    getList();
  } catch (e) {
    console.error(e);
    message.error('Operation failed.');
  }
};

const deleteItem = async (id) => {
  try {
    await service.delete(id);
    message.success('Deleted successfully.');
    getList();
  } catch (e) {
    console.error(e);
    message.error('Failed to delete.');
  }
};

const onCancel = () => {
  visible.value = false;
};

const onOk = () => {
  visible.value = false;
};

const onSearch = () => {
  // handled by computed
};

const goUpgrade = () => {
  // 检查用户是否登录
  const accessToken = localStorage.getItem('access_token');
  const hasUserId = user.value && user.value.id;
  
  if (!accessToken || !hasUserId) {
    // 未登录，跳转到登录页面
    router.push({ name: 'login' });
  } else {
    // 已登录，跳转到升级页面
    router.push({ name: 'pricing' });
  }
};

const columns = [
  { title: 'Content', dataIndex: 'content', key: 'content' },
  { title: 'Category', dataIndex: 'category', key: 'category' },
  {
    title: 'Created At',
    dataIndex: 'create_at',
    key: 'create_at',
    width: 200,
  },
  {
    title: 'Actions',
    key: 'action',
    width: 100
  },
];

onMounted(() => {
  getCategoryList();
});

watch(visible, (val) => {
  if (val) {
    getList();
  }
});

defineExpose({ visible });
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}
.content-ellipsis {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
}
.table-container {
  position: relative;
}
.overlay-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.4); /* 半透明白色，可以调 */
    z-index: 10;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;

    /* 关键：模糊滤镜 */
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px); /* Safari 兼容 */
}

.overlay-content {
  color: #000000; /* 改为黑色文字 */
  font-weight: 500;
  font-size: 16px;
  text-align: center;
  padding: 16px 24px;
  background: #f5f5f5; /* 浅灰背景，原来是淡蓝 */
  border: 1px dashed #d9d9d9; /* 灰色边框，替代原来的蓝色 */
  border-radius: 8px;
  /* text-decoration: underline; */
}

.upgrade{
  color: #fff;
  background-color: #1a1a19;
  padding-left: .75rem;
  padding-right: .75rem;
  border-radius: 16px;
  border: 1px solid #1a1a19;
  margin-left: 10px;
  cursor: pointer;
  /* 立体感 */
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}
</style>
