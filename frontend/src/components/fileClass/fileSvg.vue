<template>
    <img v-if="isImageType" :src="img" alt="" class="file-icon img-file" />
    <component v-else :is="iconComponent" class="file-icon" />
</template>

<script setup>
import { computed, ref } from 'vue'
import PptIcon from '@/assets/fileClass/ppt.svg?component'
import WordIcon from '@/assets/fileClass/word.svg?component'
import ExcelIcon from '@/assets/fileClass/excel.svg?component'
import PdfIcon from '@/assets/fileClass/pdf.svg?component'
import TextIcon from '@/assets/fileClass/txt.svg?component'
import CodeIcon from '@/assets/fileClass/code.svg?component'
import ImageIcon from '@/assets/fileClass/image.svg?component'
import workspaceService from '@/services/workspace'
// import DefaultIcon from '@/assets/fileClass/default.svg?component'
const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'webp']
const props = defineProps({
    url: {
        type: String,
        default: ''
    },
    filepath: {
        type: String,
        default: '',
        required: false
    },
    isUpdate: {
        type: Boolean,
        default: false
    }
})

const fileTypes = {
    ppt: {
        extensions: ['ppt', 'pptx'],
        component: PptIcon
    },
    text: {
        extensions: ['txt', 'md'],
        component: TextIcon
    },
    word: {
        extensions: ['doc', 'docx'],
        component: WordIcon
    },
    excel: {
        extensions: ['xls', 'xlsx'],
        component: ExcelIcon
    },
    pdf: {
        extensions: ['pdf'],
        component: PdfIcon
    },
    code: {
        extensions: ['js', 'ts', 'html', 'css', 'vue','py','rb','go','sql','yaml','yml','php','sh','bash','cs','rs','kt','scala'],
        component: CodeIcon
    },
    image: {
        extensions: imageTypes,
        component: ImageIcon
    }
}



const img = ref('')
// Check if the file type is an image
const isImageType = computed(() => {
    if (props.isUpdate) {
        return false
    }
    if (imageTypes.includes(props.url.split('.').pop().toLowerCase())){
        // console.log("getFile",props.url)
        workspaceService.getFile(props.filepath).then(res => {
            const imageURL = URL.createObjectURL(res); // blob -> url
            img.value = imageURL
        })
        return true
    }
    return false
})

// Determine which icon component to render for non-image files
const iconComponent = computed(() => {
    const extension = props.url.split(".").pop().toLowerCase()
    for (const [_, config] of Object.entries(fileTypes)) {
        if (config.extensions.includes(extension)) {
            return config.component
        }
    }
    // return 返回文本文件图标
    return TextIcon
})
</script>

<style scoped>
.file-icon {
    display: block;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    box-sizing: border-box;
    border: 0 solid #e5e7eb;
    width: 32px; 
    height: 32px;
}
.img-file{
    border-radius: 4px;
}
</style>