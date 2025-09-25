import { defineStore } from 'pinia'

export const useEditorStore = defineStore('editor', {
  state: () => ({
    // 编辑器模式
    editorMode: 'preview',
    // 选中元素的信息
    selectedElement: null,
    // 选中元素的截图
    selectedScreenshot: null,
    // 是否显示选中预览
    showSelectionPreview: false,
    // 选中的HTML内容
    selectedHtml: '',
    // 选中元素的路径
    selectedPath: '',
  }),

  actions: {
    // 设置选中元素信息
    setSelectedElement(elementInfo) {
      this.selectedElement = elementInfo;
      if (elementInfo) {
        this.selectedScreenshot = elementInfo.screenshot || null;
        this.selectedHtml = elementInfo.html || '';
        this.selectedPath = elementInfo.path || '';
        this.showSelectionPreview = !!elementInfo.screenshot;
      }
    },

    // 清除选中状态
    clearSelection() {
      this.selectedElement = null;
      this.selectedScreenshot = null;
      this.selectedHtml = '';
      this.selectedPath = '';
      this.showSelectionPreview = false;
    },

    // 设置选中预览显示状态
    setShowSelectionPreview(show) {
      this.showSelectionPreview = show;
    },

    // 设置编辑器模式
    setEditorMode(mode) {
      this.editorMode = mode;
    }
  }
})
