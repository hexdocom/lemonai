import { reactive, computed } from 'vue'
import { useNotification } from './useNotification'
import editorService from '@/services/editor'

export function useVersionManager() {
  const { showNotification } = useNotification()

  // 版本管理状态
  const versionState = reactive({
    versions: [],
    currentVersionId: null,
    currentContent: null,
    isLoading: false,
    isModified: false,
    conversation_id: null,
    filepath: null
  })

  // 计算属性
  const hasVersions = computed(() => versionState.versions.length > 0)
  const currentVersion = computed(() =>
    versionState.versions.find(v => v.id === versionState.currentVersionId) || null
  )
  const versionCount = computed(() => versionState.versions.length)
  const hasUnsavedChanges = computed(() => versionState.isModified)

  // 初始化版本管理器
  const initialize = async (conversation_id, filepath, initialContent = null) => {
    versionState.conversation_id = conversation_id
    versionState.filepath = filepath
    versionState.currentContent = initialContent
    versionState.isModified = false

    // 如果提供了conversation_id和filepath，加载版本历史
    if (conversation_id && filepath) {
      await loadVersions()
    }
  }

  // 加载版本列表
  const loadVersions = async () => {
    if (!versionState.conversation_id || !versionState.filepath) {
      console.warn('缺少conversation_id或filepath，无法加载版本')
      return
    }

    versionState.isLoading = true
    try {
      const versions = await editorService.getVersions({
        conversation_id: versionState.conversation_id,
        filepath: versionState.filepath
      })
      versionState.versions = versions || []

      const activeVersion = versionState.versions.find(v => v.active)
      // 如果有版本，选择激活版本
      if (activeVersion) {
        versionState.currentVersionId = activeVersion.id
      }
    } catch (error) {
      console.error('加载版本列表失败:', error)
      showNotification('加载版本列表失败: ' + error.message, 'error')
      versionState.versions = []
    } finally {
      versionState.isLoading = false
    }
  }

  // 切换到指定版本
  const switchToVersion = async (versionId) => {
    if (!versionId) {
      console.warn('版本ID无效')
      return null
    }

    if (versionId === versionState.currentVersionId) {
      console.log('已经是当前版本')
      return versionState.currentContent
    }

    if (!versionState.conversation_id || !versionState.filepath) {
      console.warn('缺少必要参数，无法切换版本')
      return null
    }

    versionState.isLoading = true
    try {
      // 调用切换版本接口
      const result = await editorService.switchVersion({
        version_id: versionId,
        conversation_id: versionState.conversation_id,
        filepath: versionState.filepath
      })

      // 更新本地状态
      versionState.currentVersionId = versionId
      versionState.currentContent = result.content
      versionState.isModified = false

      // 重新加载版本列表以更新 active 状态
      await loadVersions()

      const version = versionState.versions.find(v => v.id === versionId)
      showNotification(`Switched to version v${version?.version || versionId}`, 'success')

      return result.content
    } catch (error) {
      console.error('切换版本失败:', error)
      showNotification('Switch to version failed: ' + (error.message || 'Unknown error'), 'error')
      return null
    } finally {
      versionState.isLoading = false
    }
  }

  // 保存当前内容为新版本
  const saveCurrentVersion = async (content) => {
    if (!versionState.conversation_id || !versionState.filepath) {
      showNotification('缺少必要参数，无法保存', 'error')
      return false
    }

    versionState.isLoading = true
    try {
      await editorService.saveFile({
        path: versionState.filepath,
        content,
        conversation_id: versionState.conversation_id
      })

      // http.js 已经处理了响应
      versionState.currentContent = content
      versionState.isModified = false

      // 重新加载版本列表以获取最新版本
      await loadVersions()

      showNotification('Version saved successfully', 'success')
      return true
    } catch (error) {
      console.error('保存失败:', error)
      showNotification('Save failed: ' + (error.message || 'Unknown error'), 'error')
      return false
    } finally {
      versionState.isLoading = false
    }
  }

  // 标记内容已修改
  const markAsModified = (content) => {
    versionState.currentContent = content
    versionState.isModified = true
  }

  // 刷新版本列表
  const refreshVersions = async () => {
    await loadVersions()
  }

  // 获取版本历史（格式化后的）
  const getVersionHistory = () => {
    return versionState.versions.map((version, index) => ({
      ...version,
      index,
      isCurrent: version.id === versionState.currentVersionId,
      displayName: `Version ${version.version}`,
      displayTime: formatTime(version.create_at)
    }))
  }

  // 比较两个版本
  const compareVersions = async (versionId1, versionId2) => {
    try {
      const [version1Data, version2Data] = await Promise.all([
        editorService.getVersionContent(versionId1),
        editorService.getVersionContent(versionId2)
      ])

      const version1 = versionState.versions.find(v => v.id === versionId1)
      const version2 = versionState.versions.find(v => v.id === versionId2)

      return {
        version1: {
          ...version1,
          content: version1Data.content
        },
        version2: {
          ...version2,
          content: version2Data.content
        },
        contentDiff: calculateDifference(version1Data.content, version2Data.content)
      }
    } catch (error) {
      showNotification('比较版本失败: ' + error.message, 'error')
      return null
    }
  }

  // 导出版本历史
  const exportVersionHistory = async () => {
    if (versionState.versions.length === 0) {
      showNotification('没有版本历史可导出', 'warning')
      return
    }

    try {
      // 获取所有版本的详细内容
      const versionsWithContent = await Promise.all(
        versionState.versions.map(async (version) => {
          const versionData = await editorService.getVersionContent(version.id)
          return {
            ...version,
            content: versionData.content
          }
        })
      )

      const exportData = {
        exportTime: new Date().toISOString(),
        conversation_id: versionState.conversation_id,
        filepath: versionState.filepath,
        currentVersionId: versionState.currentVersionId,
        versions: versionsWithContent
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `editor-history-${versionState.filepath.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      link.click()

      URL.revokeObjectURL(url)
      showNotification('版本历史已导出', 'success')
    } catch (error) {
      showNotification('导出失败: ' + error.message, 'error')
    }
  }

  // 获取版本统计信息
  const getVersionStats = () => {
    const stats = {
      totalVersions: versionState.versions.length,
      currentVersionId: versionState.currentVersionId,
      hasUnsavedChanges: hasUnsavedChanges.value,
      oldestVersion: versionState.versions[versionState.versions.length - 1]?.create_at,
      newestVersion: versionState.versions[0]?.create_at,
      filepath: versionState.filepath,
      conversation_id: versionState.conversation_id
    }

    return stats
  }

  // 辅助函数
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateDifference = (content1, content2) => {
    const lines1 = content1.split('\n')
    const lines2 = content2.split('\n')

    return {
      addedLines: Math.max(0, lines2.length - lines1.length),
      removedLines: Math.max(0, lines1.length - lines2.length),
      totalLines1: lines1.length,
      totalLines2: lines2.length,
      similarity: calculateSimilarity(content1, content2)
    }
  }

  const calculateSimilarity = (str1, str2) => {
    if (str1 === str2) return 1.0
    if (str1.length === 0 || str2.length === 0) return 0.0

    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    const editDistance = levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  const levenshteinDistance = (str1, str2) => {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  // 清理版本管理器状态
  const cleanup = () => {
    versionState.versions = []
    versionState.currentVersionId = null
    versionState.currentContent = null
    versionState.isModified = false
    versionState.conversation_id = null
    versionState.filepath = null
  }

  return {
    // 状态
    versionState,

    // 计算属性
    hasVersions,
    currentVersion,
    versionCount,
    hasUnsavedChanges,

    // 核心方法
    initialize,
    loadVersions,
    switchToVersion,
    saveCurrentVersion,
    markAsModified,
    refreshVersions,

    // 历史管理
    getVersionHistory,
    compareVersions,

    // 导入导出
    exportVersionHistory,

    // 统计信息
    getVersionStats,

    // 清理
    cleanup
  }
}