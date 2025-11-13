<template>
    <div style="overflow: auto;width: 100%;min-width: 0;">
        <div class="upload-fileList">
            <div class="upload-fileList-item" v-for="(file, index) in fileList" :key="index">
                <fileSvg :url="file.name" :is-update="true" class="file-icon" />
                <div style="min-width: 0;width: 100%;text-align: left;">
                    <div style="display: flex;width: 100%;    align-items: center;" v-if="!file.uploading">
                        <div class="file-name">{{ file.name }}</div>
                        <div class="delete-button" @click="handleDelete(file)">
                            <deleteFile />
                        </div>
                    </div>
                    <div style="display: flex; width: 100%; align-items: center; color: #34322d;" v-else>
                        <div class="loading-spinner"></div>
                        <div style="margin-left: 8px;">Uploading...</div>
                    </div>
                    <div v-if="!file.uploading">
                        <div class="file-size">{{ formatFileSize(file.size) }}</div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>
<script setup>
import fileSvg from '@/components/fileClass/fileSvg.vue';
import deleteFile from "@/assets/message/deleteFile.svg";
import files from '@/services/files';

const props = defineProps({
    fileList: {
        type: Array,
        default: () => [],
    },
    conversation_id: {
        type: String,
        default: '',
    }
});

const emit = defineEmits(['update:fileList']);
const handleDelete = (file) => {
    console.log('delete file', file);
    files.deleteFile(file.id, props.conversation_id);
    emit('update:fileList', props.fileList.filter(f => f.id !== file.id))
};

const formatFileSize = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

</script>
<style lang="scss" scoped>
.upload-fileList {
    display: flex;
    gap: .75rem;
    ;
}

.upload-fileList-item {
    padding: .5rem;
    border-radius: 10px;
    gap: .375rem;
    cursor: pointer;
    width: 280px;
    min-width: 280px;
    display: flex;
    background-color: #37352f0f;
    font-family: ui-serif;

    .file-icon {
        min-width: 28px;
        min-height: 28px;
    }

    .file-name {
        color: #34322d;
        font-size: .875rem;
        line-height: 1.25rem;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        width: 100%;
    }

    .file-size {
        font-size: .75rem;
        line-height: 1rem;
        color: #858481;

    }

    .delete-button {
        padding: 2px;
        background-color: #858481;
        border-radius: 99999px;
        color: #fff;
        width: fit-content;
        height: fit-content;
        display: none;
    }

    &:hover {
        .delete-button {
            display: flex;
        }
    }
}

.loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #34322d;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>