<template>
    <a-upload :file-list="fileList" :before-upload="beforeUpload" :show-upload-list="false" :disabled="uploadDisabled">
        <a-button type="text" class="upload-button" @click="handleUploadClick">
            <template #icon>
                <PaperClipIcon />
            </template>
        </a-button>
    </a-upload>
</template>
<script setup>
import { ref } from 'vue';
import { Modal } from 'ant-design-vue';
import PaperClipIcon from '@/assets/svg/paperclip-icon.svg';
import files from '@/services/files';
import { useChatStore } from '@/store/modules/chat';
import { storeToRefs } from 'pinia';

const props = defineProps({
    fileList: {
        type: Array,
        default: () => []
    },
    conversation_id: {
        type: String,
        default: ''
    },
    isPublic: {
        type: Boolean,
        default: false
    }
})

// 从浏览器缓存中获取是否已经显示过公开提示
const getHasShownPublicWarning = () => {
    return localStorage.getItem('hasShownPublicWarning') === 'true';
};

// 设置已显示过公开提示到浏览器缓存
const setHasShownPublicWarning = (value) => {
    localStorage.setItem('hasShownPublicWarning', value.toString());
};

const hasShownPublicWarning = ref(getHasShownPublicWarning());
const uploadDisabled = ref(false); // 控制上传组件是否可用

const chatStore = useChatStore();
const { chat } = storeToRefs(chatStore);

const emit = defineEmits(['update:fileList']);

// 处理上传按钮点击事件
const handleUploadClick = async (e) => {
    // 如果是公开模式且是首次上传，显示警告
    if (props.isPublic && !hasShownPublicWarning.value) {
        e.stopPropagation(); // 阻止默认的文件选择行为
        
        const confirmed = await new Promise((resolve) => {
            Modal.confirm({
                title: 'Public File Upload Warning',
                content: 'You have selected public mode. The uploaded files will be made public. Please confirm to continue?',
                okText: 'Continue',
                cancelText: 'Cancel',
                centered: true,
                onOk: () => {
                    hasShownPublicWarning.value = true;
                    setHasShownPublicWarning(true); // 保存到浏览器缓存
                    resolve(true);
                },
                onCancel: () => {
                    resolve(false);
                }
            });
        });
        
        // 如果用户确认，触发文件选择
        if (confirmed) {
            // 手动触发文件选择
            const input = e.target.closest('.ant-upload').querySelector('input[type="file"]');
            if (input) {
                input.click();
            }
        }
        return;
    }
    // 如果不需要警告，让默认行为继续
};
const beforeUpload = async (file) => {
    // 给每个文件生成一个唯一标识，方便后续替换状态
    file.uid = Date.now() + Math.random();

    // 在文件列表里加入"上传中"状态的临时文件
    const uploadingFile = {
        uid: file.uid,
        name: file.name,
        size: file.size,
        uploading: true,
        error: false,
    };

    // 先更新列表，添加上传中条目
    emit('update:fileList', [...props.fileList, uploadingFile]);
    
    try {
        // 上传到 agent conversation（当前 conversation_id）
        const agentFormData = new FormData();
        agentFormData.append('conversation_id', props.conversation_id || '');
        agentFormData.append('files', file);

        const agentResult = await files.uploadFile(agentFormData);
        let agentUpload = agentResult[0];

        // 上传成功，替换列表中对应的临时文件（使用 agent 的上传结果）
        const newFileList = props.fileList
            .filter((f) => f.uid !== file.uid) // 先移除临时文件
            .concat({
                name: agentUpload.name,
                size: file.size,
                url: agentUpload.url,
                id: agentUpload.id,
                workspace_dir: agentUpload.workspace_dir,
                uploading: false,
                error: false,
            });
        console.log('newFileList', newFileList);
        emit('update:fileList', newFileList);
    } catch (e) {
        // 上传失败，更新对应文件状态
        console.log('上传失败，更新对应文件状态', e);
        const newFileList = props.fileList.map((f) => {
            if (f.uid === file.uid) {
                return { ...f, uploading: false, error: true };
            }
            return f;
        });
        emit('update:fileList', newFileList);
    }
    return false; // 阻止默认上传
};
</script>
<style scoped>
    .upload-button {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .upload-button :deep(.anticon) {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .upload-button :deep(svg) {
        width: 24px;
        height: 24px;
        display: block;
    }

    @media (max-width: 768px) {
        .upload-button {
            font-size: 11px!important;
            height: 24px!important;
            width: 100%!important;
            padding: 0 4px!important;
        }
    }
</style>