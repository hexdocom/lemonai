<template>
  <a-modal :open="fileExplorerVisible" :footer="null" style="
    width: 600px; background-color: #fff; border-color: hsla(0, 0%, 100%, .05);
    border-width: 1px; border-radius: 20px; overflow: auto;
    flex-direction: column; max-width: 95%; max-height: 95%;
    height: 680px; padding: 0px;" :closable="false" @cancel="handleClose" :centered="true" class="modal">
      <div class="content">
          <div class="classList" v-if="!batchDownload">
              <div class="header">
                  <h1 class="title">{{ $t('lemon.fileExplorer.allFilesInTask') }}</h1>
                  <div class="btns">
                      <div class="svg">
                          <downloadSvg @click="handleBatchDownload"
                              :class="clickDisable ? 'disable' : 'svgDownload'" />
                      </div>
                      <div class="svg" @click="handleClose">
                          <closeSvg class="svgClose" />
                      </div>
                  </div>
              </div>
              <div class="main">
                  <div class="classTitle">
                      <div v-for="type in fileTypes" :key="type" class="classBtn"
                          :class="chooseClassType === type ? 'active' : ''" @click="chooseClassType = type">
                          {{ $t(`lemon.fileExplorer.fileTypes.${type}`) }}
                      </div>
                  </div>
                  <div class="classFiles" v-if="!clickDisable">
                      <div v-for="(group, time) in fileListFilterByTimeAndType" :key="time" class="timeGroup">
                          <h3 class="timeTitle">{{ $t(`lemon.fileExplorer.timeGroups.${time}`) }}</h3>
                          <div class="fileList">
                              <div v-for="file in group" :key="file.id" class="fileItem"
                                  @click="handleOpenFile(file)">
                                  <fileSvg :url="file.filename" :filepath="file.filepath" class="svgItem" />
                                  <div class="fileInfo">
                                      <!-- 文件名 -->
                                      <div class="fileNameContainer">
                                          <div class="fileNameDiv">
                                              <span class="fileNameSpan">{{
                                                      file.filename.split('/').pop().split('\\').pop()
                                              }}</span>
                                          </div>
                                          <span class="time">{{ formatTimeWithHMS(file.timestamp) }}</span>
                                      </div>
                                      <!-- 更多选项 -->
                                      <div class="moreOption" @click.stop>
                                          <a-tooltip placement="bottomRight" :arrow="false" color="#ffffff"
                                              trigger="click" :visible="tooltipVisible[file.id] || false"
                                              @visibleChange="visible => handleTooltipVisibleChange(file.id, visible)">
                                              <template #title>
                                                  <div class="custom-tooltip">
                                                      <div class="svg-tooltip" @click="handlePreview(file)">
                                                          <clickSvg /> {{ $t('lemon.fileExplorer.preview') }}
                                                      </div>
                                                      <div class="svg-tooltip" @click="handleFileDownload(file)">
                                                          <downloadSvgDown /> {{ $t('lemon.fileExplorer.download') }}
                                                      </div>
                                                  </div>
                                              </template>
                                              <moreOptionsSvg @click="toggleTooltip(file.id)" />
                                          </a-tooltip>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div class="empty" v-else-if="clickDisable">
                      <div class="emptyIcon">
                          <fileEmptySvg />
                      </div>
                      <div class="emptyText">
                          <span>{{ $t('lemon.fileExplorer.noContent') }}</span>
                      </div>
                  </div>
              </div>
          </div>
          <!-- Batch download mode -->
          <div class="batchDownloadList" v-else>
              <!-- 全选 + 取消 -->
              <div class="header">
                  <div class="selectAll" @click="selectAll">
                      <a-checkbox v-model:checked="selectedAll" :indeterminate="isIndeterminate" />
                      <span>{{ $t('lemon.fileExplorer.selectAll') }}</span>
                  </div>
                  <span class="cancel" @click="handleCancelBatchDownload">{{ $t('lemon.fileExplorer.cancel') }}</span>
              </div>
              <!-- 文件列表 -->
              <div class="batchMain">
                  <div class="batchMainContent">
                      <div v-for="(group, time) in fileListFilterByTimeAndType" :key="time" class="timeGroup">
                          <h3 class="timeTitle">{{ $t(`lemon.fileExplorer.timeGroups.${time}`) }}</h3>
                          <div class="fileList">
                              <div v-for="file in group" :key="file.id" class="fileItem">
                                  <a-checkbox v-model:checked="file.selected" @change="updateSelectedAll" />
                                  <fileSvg :url="file.filepath" :filepath="file.filepath" class="svgItem" />
                                  <div class="timeContainer">
                                      <span class="fileName">{{
                                                      file.filename.split('/').pop().split('\\').pop()
                                                       }}</span>
                                      <span class="time">{{ formatTimeWithHMS(file.timestamp) }}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              <!-- 底部按钮 批量下载 -->
              <div class="batchFooter">
                  <a-button type="primary" @click="confirmBatchDownload" class="btnDownload"
                      :class="clickDowload ? 'disableDownload' : 'enableDownload'">
                      <downloadSvg class="svg" />
                      <span class="span">{{ $t('lemon.fileExplorer.batchDownload') }}</span>
                  </a-button>
              </div>
          </div>
      </div>
  </a-modal>
  <imgModal :url="imgUrl" :visible="imgVisable" @close="imgVisable = false" />
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import downloadSvg from '@/assets/svg/download.svg'
import closeSvg from '@/assets/filePreview/close.svg'
import emitter from '@/utils/emitter'
import fileSvg from '@/components/fileClass/fileSvg.vue'
import moreOptionsSvg from '@/assets/filePreview/moreOptions.svg'
import fileEmptySvg from '@/assets/fileClass/file.svg'
import clickSvg from '@/assets/fileClass/click.svg'
import downloadSvgDown from '@/assets/fileClass/download.svg'
import { viewList } from '@/utils/viewList'
import { useChatStore } from '@/store/modules/chat'
import { storeToRefs } from 'pinia'
import workspaceService from '@/services/workspace'
import imgModal from '../file/imgModal.vue'
import fileUtil from '@/utils/file'
import { formatTimeWithHMS } from '@/utils/time'

const chatStore = useChatStore()
const { messages } = storeToRefs(chatStore)

const { t } = useI18n()

const batchDownload = ref(false)
const fileExplorerVisible = ref(false)
const chooseClassType = ref('all')
const clickDisable = ref(false)
const tooltipVisible = ref({})
const imgUrl = ref('')
const imgVisable = ref(false)
const clickDowload = ref(false)

// 使用 reactive 存储文件列表
const fileListState = reactive([])

// 同步 fileListState 与 messages
const updateFileList = () => {
const files = viewList.viewLocal(messages.value, false)
const existingFiles = new Map(fileListState.map(file => [file.id, file.selected]))
fileListState.length = 0
files.forEach(file => {
  fileListState.push({
    ...file,
    selected: existingFiles.get(file.id) ?? false
  })
})
}

// 初始加载和监听 messages 变化
updateFileList()
watch(messages, updateFileList, { deep: true })

// 文件类型
const fileTypes = ['all', 'document', 'image', 'codeFile', 'link']

const fileTypeExtensions = {
link: ['com'],
codeFile: ['js', 'css', 'html', 'java', 'c#', 'cpp', 'py', 'go', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'rust'],
image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'tiff', 'webp', 'ico'],
document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 'md']
}

// 过滤文件
const filteredFiles = computed(() => {
console.log('chooseClassType.value', chooseClassType.value)
return chooseClassType.value === 'all'
  ? fileListState
  : fileListState.filter(file => {
      const ext = file.filename.split('.').pop().toLowerCase()
      return fileTypeExtensions[chooseClassType.value]?.includes(ext)
    })
})

// 按时间分组
const fileListFilterByTimeAndType = computed(() => {
return groupFilesByTime(filteredFiles.value)
})

// 全选状态
const selectedAll = ref(false)
const isIndeterminate = computed(() => {
const files = filteredFiles.value
if (files.length === 0) return false
const someSelected = files.some(file => file.selected)
const allSelected = files.every(file => file.selected)
return someSelected && !allSelected
})

// 全选/取消全选
const selectAll = () => {
selectedAll.value = !selectedAll.value
filteredFiles.value.forEach(file => {
  file.selected = selectedAll.value
})
}

// 更新全选状态
const updateSelectedAll = () => {
const files = filteredFiles.value
if (files.length === 0) {
  selectedAll.value = false
  return
}
selectedAll.value = files.every(file => file.selected)
}

// 控制下载按钮禁用状态
const hasSelectedFilesInCurrentGroup = computed(() => {
return Object.values(fileListFilterByTimeAndType.value).some(group =>
  group.some(file => file.selected)
)
})

watch(hasSelectedFilesInCurrentGroup, (hasSelected) => {
clickDowload.value = !hasSelected
}, { immediate: true })

watch(filteredFiles, (newFiles) => {
// clickDisable.value = newFiles.length === 0
updateSelectedAll()
}, { immediate: true })

function groupFilesByTime(files) {
clickDisable.value = files.length == 0;
const today = new Date()
today.setHours(0, 0, 0, 0)
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)

const groups = {
  today: [],
  yesterday: [],
  earlier: []
}
//files 降序排列
files.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
files.forEach(file => {
  const fileDate = new Date(file.timestamp)
  fileDate.setHours(0, 0, 0, 0)
  if (fileDate.getTime() === today.getTime()) {
    groups.today.push(file)
  } else if (fileDate.getTime() === yesterday.getTime()) {
    groups.yesterday.push(file)
  } else {
    groups.earlier.push(file)
  }
})


return Object.fromEntries(
  Object.entries(groups).filter(([_, files]) => files.length > 0)
)
}

const handleClose = () => {
fileExplorerVisible.value = false
}

const handleBatchDownload = () => {
batchDownload.value = true
}

const handleCancelBatchDownload = () => {
batchDownload.value = false
selectedAll.value = false
fileListState.forEach(file => {
  file.selected = false
})
}

async function handleFileDownload(file) {
tooltipVisible.value[file.id] = false
fileUtil.handleFileDownload(file);
}

const handleOpenFile = (file) => {
if (fileUtil.imgType.includes(file.filename.split('.').pop())) {
  workspaceService.getFile(file.filepath).then(res => {
    imgUrl.value = URL.createObjectURL(res)
    imgVisable.value = true
  })
} else {
  emitter.emit('fullPreviewVisable', file)
}
fileExplorerVisible.value = false
}

const handlePreview = (file) => {
if (fileUtil.imgType.includes(file.filename.split('.').pop())) {
  workspaceService.getFile(file.filepath).then(res => {
    imgUrl.value = URL.createObjectURL(res)
    imgVisable.value = true
  })
} else {
  handleOpenFile(file)
}
// tooltipVisible.value = file.id
tooltipVisible.value[file.id] = false
}

const toggleTooltip = (fileId) => {
tooltipVisible.value[fileId] = !tooltipVisible.value[fileId]
}

const handleTooltipVisibleChange = (fileId, visible) => {
tooltipVisible.value[fileId] = visible
}

async function confirmBatchDownload() {
if (clickDowload.value) return

const selectedFiles = Object.values(fileListFilterByTimeAndType.value)
  .flat()
  .filter(file => file.selected)

if (selectedFiles.length === 0) {
  batchDownload.value = false
  return
}
console.log('selectedFiles', selectedFiles)
// 创建 ZIP 文件
const zip = new JSZip()
const promises = selectedFiles.map(async (file) => {
  const fileName = file.filename.split('/').pop()
  const fileContent = await workspaceService.getFile(file.filepath)
  console.log('fileContent', fileContent)
  
  // 根据文件扩展名判断是否为二进制文件
  const ext = fileName.split('.').pop().toLowerCase()
  const isBinaryFile = fileTypeExtensions.image.includes(ext) || 
                      ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'].includes(ext)
  
  // 对于二进制文件，直接使用原始内容；对于文本文件，确保是字符串格式
  let zipContent = fileContent
  if (!isBinaryFile && typeof fileContent !== 'string') {
    // 如果是对象（如JSON），转换为格式化的字符串
    zipContent = typeof fileContent === 'object' ? JSON.stringify(fileContent, null, 2) : String(fileContent)
  }
  
  zip.file(fileName, zipContent, { binary: isBinaryFile })
})
try {
  // 等待所有文件内容加载完成
  await Promise.all(promises)
  // 生成 ZIP 文件
  const content = await zip.generateAsync({ type: 'blob' })
  // 下载 ZIP 文件
  saveAs(content, `files_${new Date().toISOString().slice(0, 10)}.zip`)
} catch (error) {
  console.error('Error creating ZIP file:', error)
  // 可选：显示错误提示给用户
}

// 重置状态
batchDownload.value = false
selectedAll.value = false
fileListState.forEach(file => {
  file.selected = false
})
}

emitter.on('file-explorer-visible', () => {
fileExplorerVisible.value = true
})
</script>

<style lang="scss" scoped>
.content {
  height: 100%;
  width: 100%;
  background-color: #fff;
  border-color: hsla(0, 0%, 100%, .05);

  .classList {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;

      .header {
          display: flex;
          padding: 1.5rem 1.5rem 0.625rem;
          align-items: center;
          flex: 1;

          .title {
              color: #34322d;
              font-weight: 600;
              font-size: 1.125rem;
              margin: 0;
              flex: 1;
          }

          .btns {
              display: flex;
              align-items: center;
              gap: 1rem;

              .svg {
                  border-radius: 0.375rem;
                  justify-content: center;
                  align-items: center;
                  width: 1.75rem;
                  height: 1.75rem;
                  display: flex;
              }

              .svgClose {
                  background-color: #fffffe;
                  cursor: pointer;
              }

              .svgDownload {
                  background-color: #f9fafb;
                  cursor: pointer;
              }
          }
      }

      .main {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;

          .classTitle {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 0.5rem;
              padding: 0.25rem 1.5rem 0;

              .classBtn {
                  font-size: 0.875rem;
                  height: 2.5rem;
                  padding: 0 1rem;
                  border-radius: 20px;
                  box-shadow: none;
                  border: 1px solid #0000001f;
                  line-height: 38px;

                  &.active {
                      background-color: #1a1a19;
                      color: #fff;
                  }
              }
          }

          .classFiles {
              margin-top: 1rem;
              padding: 0.25rem 1.5rem 0;
              overflow: auto;
              box-sizing: border-box;

              .timeGroup {
                  margin-bottom: 1.5rem;

                  .timeTitle {
                      font-size: .75rem;
                      line-height: 1rem;
                      color: #858481;
                      padding-left: .75rem;
                      margin: 0;
                  }

                  .fileList {
                      display: flex;
                      flex-direction: column;

                      .fileItem {
                          display: flex;
                          align-items: center;
                          padding: .625rem .75rem;
                          border-radius: .5rem;
                          gap: 0.85rem;
                          cursor: pointer;

                          .svgItem {
                              display: block;
                              scrollbar-width: thin;
                              scrollbar-color: transparent transparent;
                              box-sizing: border-box;
                              border: 0 solid #e5e7eb;
                          }

                          .fileInfo {
                              display: flex;
                              justify-content: space-between;
                              align-items: center;
                              flex: 9;

                              .fileNameContainer {
                                  display: flex;
                                  flex-direction: column;
                                  flex: 1 1 0%;
                                  min-width: 0;

                                  .time {
                                      font-size: .75rem;
                                      color: #858481;
                                  }

                                  .fileNameDiv {
                                      display: flex;
                                      flex-direction: row;

                                      .fileNameSpan {
                                          color: #34322d;
                                          font-size: .875rem;
                                          line-height: 1.25rem;
                                          text-overflow: ellipsis;
                                          overflow: hidden;
                                          white-space: nowrap;
                                      }
                                  }
                              }

                              .moreOption {
                                  display: flex;
                                  color: #858481;
                                  border-radius: .375rem;
                                  justify-content: center;
                                  align-items: center;
                                  cursor: pointer;
                                  width: 2rem;
                                  height: 2rem;
                              }

                              .moreOption:hover {
                                  background-color: #37352f0a;
                              }
                          }
                      }

                      .fileItem:hover {
                          background-color: #37352f0a;
                      }
                  }
              }
          }

          .classFiles::-webkit-scrollbar {
              width: 6px;
              height: 6px;
          }

          .classFiles::-webkit-scrollbar-thumb {
              background-color: #cfcdcd;
              border-radius: 3px;
          }

          .classFiles::-webkit-scrollbar-track {
              background-color: #f5f5f5;
          }

          .empty {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 1.5rem 1.5rem 0;
              gap: .75rem;
              justify-content: center;
              height: 100%;
              box-sizing: border-box;

              .emptyIcon {
                  color: #858481;
              }

              .emptyText {
                  color: #858481;
                  font-size: 14px;
              }
          }
      }
  }

  .batchDownloadList {
      display: flex;
      flex-direction: column;
      height: 100%;

      .header {
          display: flex;
          align-items: center;
          padding-top: 1.5rem;
          padding-left: 1.5rem;
          padding-right: 1.5rem;
          padding-bottom: 0.625rem;
          justify-content: space-between;

          .selectAll {
              color: #858481;
              font-size: .875rem;
              line-height: 1.25rem;
              gap: .625rem;
              align-items: center;
              display: flex;
              cursor: pointer;
          }

          .cancel {
              color: #858481;
              font-size: .875rem;
              line-height: 1.25rem;
              cursor: pointer;
          }
      }

      .batchMain {
          padding-bottom: 1rem;
          padding-left: .75rem;
          padding-right: .75rem;
          overflow: auto;
          margin-top: 1rem;
          flex: 8;

          .batchMainContent {
              padding-top: 0;
              gap: .25rem;
              display: flex;
              flex-direction: column;

              .timeTitle {
                  font-size: .75rem;
                  line-height: 1rem;
                  color: #858481;
                  padding-left: .75rem;
                  margin: 0;
              }

              .fileList {
                  display: flex;
                  flex-direction: column;

                  .fileItem {
                      display: flex;
                      align-items: center;
                      padding: .625rem .75rem;
                      border-radius: .5rem;
                      gap: 0.85rem;
                      cursor: pointer;

                      .svgItem {
                          display: block;
                          scrollbar-width: thin;
                          scrollbar-color: transparent transparent;
                          box-sizing: border-box;
                          border: 0 solid #e5e7eb;
                      }

                      .timeContainer {
                          display: flex;
                          flex-direction: column;
                          justify-items: start;
                          flex: 1;

                          .fileName {
                              color: #34322d;
                              font-size: .875rem;
                              line-height: 1.25rem;
                              text-overflow: ellipsis;
                              overflow: hidden;
                              white-space: nowrap;
                          }

                          .time {
                              font-size: .75rem;
                              color: #858481;
                          }
                      }
                  }
              }
          }
      }

      .batchMain::-webkit-scrollbar {
          width: 6px;
          height: 6px;
      }

      .batchMain::-webkit-scrollbar-thumb {
          background-color: #cfcdcd;
          border-radius: 3px;
      }

      .batchMain::-webkit-scrollbar-track {
          background-color: #f5f5f5;
      }

      .batchFooter {
          flex: 0.5;
          padding-top: 1rem;
          padding-bottom: 1rem;
          padding-left: 1.25rem;
          padding-right: 1.25rem;
          justify-content: flex-end;
          display: flex;
          align-items: center;
          border-top: #0000000f 1px solid;

          .btnDownload {
              padding-left: .75rem;
              padding-right: .75rem;
              border-radius: 100px;
              gap: .25rem;
              align-items: center;
              height: 2.25rem;
              background-color: #ffffff0f;        box-shadow: none;
      display: flex;
      justify-content: center;
      flex-direction: row;
      border: #0000000f 1px solid;

      .svg {
        display: block;
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
        box-sizing: border-box;
        outline: none;
        border: 0 solid #e5e7eb;
      }

      .span {
        font-size: .875rem;
        line-height: 1.25rem;
      }
    }

    .btnDownload:hover {
      background-color: #37352f0a;
    }

    .disableDownload {
      color: #919191;
    }

    .enableDownload {
      color: #535350;
      cursor: pointer;
    }
  }
}
}

.custom-tooltip {
padding: .25rem;
box-sizing: border-box;
outline: none;
border: 0 solid #e5e7eb;

.svg-tooltip {
  color: #535350;
  font-size: .875rem;
  line-height: 1.25rem;
  padding-top: .5rem;
  padding-bottom: .5rem;
  padding-left: .75rem;
  padding-right: .75rem;
  border-radius: 8px;
  gap: .75rem;
  align-items: center;
  cursor: pointer;
  display: flex;
  width: 100%;
}

.svg-tooltip:hover {
  background-color: #37352f0f;
}
}
</style>

<style>
.modal .ant-modal-content {
padding: 0 !important;
height: 680px;
width: 100%;
}

.modal .ant-modal-content .ant-modal-body {
padding: 0 !important;
height: 680px !important;
width: 100%;
}

.disable {
color: #858481;
cursor: not-allowed;
}

.disableDownload {
cursor: not-allowed !important;
pointer-events: none;
}
</style>
