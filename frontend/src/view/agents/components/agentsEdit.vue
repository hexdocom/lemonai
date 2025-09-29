<template>
    <a-modal :open="visible" :title="modalTitle" width="800px" @cancel="handleCancel" @ok="handleOk">
        <a-form :model="form" layout="vertical">
            <a-form-item label="Name">
                <a-input v-model:value="form.name" placeholder="Please enter name" />
            </a-form-item>

            <a-form-item label="Description">
                <a-textarea v-model:value="form.describe" rows="4" placeholder="Please enter describe" />
            </a-form-item>

            <!-- <a-form-item label="Visibility">
                <a-radio-group style="width: 100%;display: flex;justify-content: space-between;" v-model:value="form.is_public">
                    <a-radio v-for="option in visibilityOptions" :key="option.value" :value="option.value" 
                             :disabled="!option.value && isPersonalDisabled">
                        <span>{{ option.label }}</span>
                        <a-tag v-if="!option.value" size="small" style="margin-left: 4px; background-color: #000; color: #fff; border: none;">Pro+</a-tag>
                        <span style="color: #666; font-size: 12px; margin-left: 8px;">{{ option.desc }}</span>
                    </a-radio>
                </a-radio-group>
                <div v-if="isPersonalDisabled" style="margin-top: 8px; padding: 8px; background-color: #f0f0f0; border: 1px solid #d9d9d9; border-radius: 4px;">
                    <span style="color: #666; font-size: 12px;">
                        Want to {{ isEditMode ? 'set agent as' : 'create' }} private? 
                        <a @click="upgradeToPro()" style="color: #1890ff; text-decoration: underline; cursor: pointer;">Upgrade to Pro+</a>
                    </span>
                </div>
            </a-form-item> -->
            
            <a-collapse>
                <a-collapse-panel key="1" header="Select MCP Services">
                    <a-input-search v-model:value="searchKeyword" placeholder="Search MCP services" allowClear
                        style="margin-bottom: 16px" />
                    <div class="mcp-grid">
                        <div v-for="mcp in mcpServers" :key="mcp.id"
                            :class="['mcp-card', { selected: form.mcpids.includes(mcp.id) }]"
                            @click="toggleMcp(mcp.id)">
                            <div class="checkbox-icon">
                                <a-icon v-if="form.mcpids.includes(mcp.id)" type="check-circle"
                                    style="color: #52c41a; font-size: 20px" />
                            </div>
                            <div class="mcp-content">
                                <div class="mcp-name">{{ mcp.name }}</div>
                                <div class="mcp-desc">{{ mcp.describe }}</div>
                            </div>
                        </div>
                    </div>
                </a-collapse-panel>
            </a-collapse>
        </a-form>
    </a-modal>
</template>
<script setup>
import { ref, reactive, watch, computed } from 'vue'
import mcpService from "@/services/mcp";
import agentService from "@/services/agent";
import emitter from '@/utils/emitter';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/store/modules/user';
import { useChatStore } from '@/store/modules/chat';
const userStore = useUserStore();
const { user,membership, points } = storeToRefs(userStore);

const chatStore = useChatStore();
const { agent } = storeToRefs(chatStore);

const props = defineProps({
    visible: Boolean,
    id: String,
})

const emit = defineEmits(['update:visible', 'updateList'])

const form = reactive({
    name: '',
    describe: '',
    mcpids: [],
    is_public:true
})

const mcpServers = ref([]);
const searchKeyword = ref('');
const loading = ref(false);
const modalTitle = ref('Create Agent');
const showUpgradeModal = ref(false);
const upgradeTitle = ref("Upgrade")

const visibilityOptions = [
    {
        value: true,
        label: 'Public',
        desc: 'Anyone can view and remix',
    },
    {
        value: false,
        label: 'Personal',
        desc: 'Only visible to yourself',
    },
];

const isEditMode = computed(() => !!props.id);

const isPersonalDisabled = computed(() => !membership.value?.planName);


const closeModal = () => {
  showUpgradeModal.value = false;
};
const upgradeToPro = () => {
  showUpgradeModal.value = true;
};
const fetchMcpServers = async () => {
    try {
        const servers = await mcpService.activate_servers();
        mcpServers.value = Array.isArray(servers) ? servers : [];
    } catch (error) {
        console.error("Error fetching MCP servers:", error);
    }
};

const resetForm = () => {
    form.name = '';
    form.describe = '';
    form.mcpids = [];
    form.is_public = true;
    searchKeyword.value = '';
};

const initAgent = async () => {
    console.log('initAgent',props.id);
    resetForm();
    
    // 根据是否为编辑模式设置标题
    modalTitle.value = isEditMode.value ? 'Edit Agent' : 'Create Agent';
    
    if (!isEditMode.value) return;

    loading.value = true;
    try {
        const res = await agentService.getById(props.id);
        console.log('res', res);
        form.name = res.name || '';
        form.describe = res.describe || '';
        form.mcpids = res.mcp_server_ids || [];
        form.is_public = res.is_public;
    } catch (e) {
        console.error('initAgent error', e);
    } finally {
        loading.value = false;
    }
};

watch(() => props.visible, async (val) => {
    if (val) {
        await fetchMcpServers();
        await initAgent();
    }
});

const handleOk = async () => {
    if (isEditMode.value) {
        await agentService.update(props.id, form.name, form.describe, form.mcpids,form.is_public); 
        //agent.value
        if (agent.value && agent.value.id === props.id) {
            agent.value = {
                ...agent.value,
                name: form.name,
                describe: form.describe,
                mcp_server_ids: form.mcpids,
                is_public: form.is_public
            };
        }

        emitter.emit('updateAgentList');
    } else {
        let res = await agentService.create(form.name, form.describe, form.mcpids);
        emitter.emit('addAgent', res);
    }
    emit('update:visible', false);
};

const handleCancel = () => {
    resetForm();
    emit('update:visible', false);
};

const toggleMcp = (id) => {
    const index = form.mcpids.indexOf(id);
    if (index > -1) {
        form.mcpids.splice(index, 1);
    } else {
        form.mcpids.push(id);
    }
};
</script>




<style scoped>
.mcp-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.mcp-card {
    cursor: pointer;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    padding: 12px;
    width: 180px;
    position: relative;
    transition: border-color 0.3s;
    user-select: none;
    background-color: #fff;
    display: flex;
    flex-direction: column;
    min-height: 100px;
}

.mcp-card.selected {
    border-color: #22ce55;
    background-color: #f6ffed;
}

.checkbox-icon {
    position: absolute;
    top: 8px;
    right: 8px;
}

.mcp-name {
    font-weight: 600;
    margin-bottom: 6px;
    font-size: 14px;
}

.mcp-desc {
    font-size: 14px;
    color: #666;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    /* 显示2行 */
    -webkit-box-orient: vertical;
    white-space: normal;
    text-overflow: ellipsis;
}
</style>
