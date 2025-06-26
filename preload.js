// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 发送消息到主进程 (用于单向通信)
  send: (channel, data) => {
    const validSendChannels = ['setup-complete-load-main'];
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  // 监听主进程的消息 (用于主进程 -> 渲染进程通信)
  on: (channel, callback) => {
    const validOnChannels = [
      'from-main',
      'api-response',
      'setup-status',
      'start-setup-process',
      'oauth-code',
      'oauth-login-success',
      'stripe-payment-success',
      'stripe-payment-cancel'
    ];
    if (validOnChannels.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    } else {
      console.warn(`ipcRenderer.on: Channel "${channel}" is not whitelisted.`);
      return () => {};
    }
  },
  // 移除监听器
  removeListener: (channel, callback) => {
    const validOnChannels = [
      'from-main',
      'api-response',
      'setup-status',
      'start-setup-process',
      'oauth-code',
      'oauth-login-success',
      'stripe-payment-success',
      'stripe-payment-cancel'
    ];
    if (validOnChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  // 调用主进程的 handle 方法 (用于双向通信)
  invoke: (channel, ...args) => {
    const validInvokeChannels = ['start-docker-setup','checkSystem','checkDockerInstall','checkDockerRunning','checkDockerEnvironmentReady','attemptStartDocker'];
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    } else {
      console.warn(`ipcRenderer.invoke: Channel "${channel}" is not whitelisted.`);
      return Promise.reject(new Error(`Channel "${channel}" is not allowed.`));
    }
  }
});
