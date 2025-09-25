import { defineStore } from 'pinia'
import { io } from "socket.io-client";
import chat from '@/services/chat';
const baseUrl = import.meta.env.VITE_WS_API_URL;

import emitter from '@/utils/emitter';
import messageFun from '@/services/message';
import i18n from '@/locals';


export const useChatStore = defineStore('chat', {
  state: () => ({
    list: [],
    chat: {},
    messages: [],
    events: [],
    agent: {},
    status: 'done',
    conversationId: null,
    socket: null,
    baseUrl: baseUrl,
    commands: [],
    isScrolledToBottom: true,
    updateTitle: true,
    //停止回放
    stopReplay: false,
    replayStatus: 'done',
    mode: 'task',
    mode_editor: false,
    model_id: '',
    chatInfo: {
      pid: -1,
      msgList: [],
      cursorKey: '',
    }
  }),
  actions: {
    async init(mode = 'task') {
      //初始化 chat list
      this.mode = mode;
      if (this.mode == 'chat') {
        this.agent = {}
      }
      console.log("init", mode)
      const res = await chat.list(mode, this.agent.id)
      //处理一下排序 最近的排在前面
      let data = res || [];
      data.sort((a, b) => {
        return new Date(b.update_at) - new Date(a.update_at);
      });
      this.list = data;
    },
    //选择第一个 
    async selectFirst() {
      if (this.mode == 'task' && this.list.length > 0) {
        console.log(' 默认选择第一个 selectFirst');
        //默认选择第一个
        this.conversationId = this.list[0].conversation_id;
        this.clearMessages();
        this.chat = this.list[0];
        this.initConversation(this.conversationId);

        console.log('this.chat', this.chat);
      } else {
        this.clearMessages();
        this.chat = {};
        this.conversationId = null;
      }
    },
    async handleStop() {
      // 查询并更新 claude 的最新市值数据
      if (this.mode_editor) {
        await chat.stopCoding(this.conversationId)
      } else if (this.mode === 'task') {
        await chat.stop(this.conversationId)
      } else {
        this.chatInfo.cursorKey = '';
        await chat.stopChat(this.conversationId)
      }
      this.list.find(item => item.conversation_id === this.conversationId).status = 'done';
      this.chat.status = 'done'
      this.status = 'done'
    },
    clearMessages() {
      this.messages = [];
      this.isScrolledToBottom = true;
      this.status == "done";
      this.chatInfo.pid = -1;
    },
    clearAgent() {
      this.agent = {};
      this.list = [];
      console.log('clearAgent', this.agent);
    },
    async initConversation(conversationId) {
      console.log('initConversation');
      await this.resetChatInfo()
      let res = await chat.messageList(conversationId);
      this.messages = []
      if (this.mode === 'task') {
        res.forEach(item => {
          if (item.meta && typeof item.meta === 'string') {
            item.meta = JSON.parse(item.meta);
          }
          const { action_type } = item.meta;
          if (action_type == "error" || action_type == "stop") {
            let conversation_id = item.conversation_id
            let chat = this.list.find((c) => c.conversation_id == conversation_id)
            if (chat) {
              chat.status = "done";
            }
          }
          messageFun.handleMessage(item, this.messages);
        });
        const lastItem = res[res.length - 1];
        if (lastItem && lastItem.meta) {
          const { action_type } = lastItem.meta;
          if (action_type === "error" || action_type === "stop") {
            let conversation_id = lastItem.conversation_id;
            let chat = this.list.find((c) => c.conversation_id == conversation_id);
            if (chat) {
              chat.status = "done";
            }
          }
        }
      } else if (this.mode === 'chat') {
        // reset
        this.chatInfo.msgList = res;
        // console.log("当前this.chatInfo.msgList",this.chatInfo.msgList)
      }
      // console.log("this.messages", this.messages)
      this.scrollToBottom();
    },
    //消息回放
    async playback(conversationId, time = 0) { // 确保函数声明时包含 async 关键字
      this.stopReplay = false;
      this.replayStatus = 'running';
      this.messages = [];
      const get_res = await chat.get(conversationId);
      this.chat = get_res;
      let res = await chat.messageList(conversationId);
      for (let item of res) { // 使用 for...of 循环来遍历数组
        //延迟时间
        let delay = 100;
        if (!this.stopReplay) {
          await new Promise(resolve => setTimeout(resolve, time)); // 正确使用 await 来等待 Promise 完成
          delay = 0;
        }
        messageFun.handleMessage(item, this.messages); // 假设 handleMessage 是正确导入或定义的
        setTimeout(() => {
          //判断是否打开预览  emitter.emit('preview',{})
          // 只有PC端才自动打开预览，移动端不自动打开
          const isMobile = window.innerWidth <= 768;
          if (!isMobile) {
            emitter.emit('preview', { message: item });
          }
          //finish_summery
          let meta = JSON.parse(JSON.stringify(item.meta));
          //json
          let file = meta?.json[0] || {};
          console.log('meta.action_type', meta.action_type);
          if (meta.action_type == "finish_summery" && file && !isMobile) {
            emitter.emit('fullPreviewVisable', file)
          }
        }, delay);

        this.isScrolledToBottom = true;
        this.scrollToBottom(0);
      }
      this.replayStatus = 'done';
    },
    async toResult() {
      this.replayStatus = 'done';
      this.stopReplay = true;
    },
    async autoTitle() {
      if (this.updateTitle) {
        // 更新 title
        const update_res = await chat.update(this.conversationId, "");
        console.log('update_res', update_res);
        //调用get 获取最新的会话
        const get_res = await chat.get(this.conversationId);
        this.chat.title = get_res.title;
        this.chat.status = 'running';
        //修改 list
        this.list.find(item => item.conversation_id === this.conversationId).title = get_res.title;
        this.list.find(item => item.conversation_id === this.conversationId).status = 'running';
        console.log('this.list', this.list);
        this.updateTitle = false;
        this.status = 'running';
      }
    },
    async updateConversationTitle(title) {
      const update_res = await chat.update(this.conversationId, title);

      // 更新当前聊天对象
      this.chat.title = title;

      // 更新聊天列表中的对应项
      const listItem = this.list.find(item => item.conversation_id === this.conversationId);
      if (listItem) {
        listItem.title = update_res.title;
      }
    },
    async updateConversationTitleById(title, id) {
      const update_res = await chat.update(id, title);

      // 更新聊天列表中的对应项
      const listItem = this.list.find(item => item.conversation_id === id);
      if (listItem) {
        listItem.title = update_res.title;
      }

      // 如果更新的是当前聊天，也要更新当前聊天对象
      if (id === this.conversationId) {
        this.chat.title = title;
      }
    },
    // 修改当前会话的可见性
    async updateConversationVisibility(is_public) {
      const update_res = await chat.updateVisibility(this.conversationId, is_public);

      // 更新当前聊天对象
      this.chat.is_public = is_public;

      // 更新聊天列表中的对应项
      const listItem = this.list.find(item => item.conversation_id === this.conversationId);
      if (listItem) {
        listItem.is_public = is_public;
      }

      return update_res;
    },
    // 根据ID修改会话的可见性
    async updateConversationVisibilityById(is_public, id) {
      const update_res = await chat.updateVisibility(id, is_public);

      // 更新聊天列表中的对应项
      const listItem = this.list.find(item => item.conversation_id === id);
      if (listItem) {
        listItem.is_public = is_public;
      }

      // 如果更新的是当前聊天，也要更新当前聊天对象
      if (id === this.conversationId) {
        this.chat.is_public = is_public;
      }

      return update_res;
    },
    onMessageEvent(data) {
      // this.socket.emit('oh_event', data);
      const { source, message } = data;
      // console.log('onMessageEvent', data);
    },
    // 创建新会话
    async createConversation(message, mode_type = 'task') {
      console.log('createConversation', this.model_id);
      this.messages = []; // 清空消息
      await this.resetChatInfo()
      this.updateTitle = true;
      const result = await chat.create(message, mode_type, this.agent.id, this.model_id);
      this.chat = result;
      this.conversationId = result.conversation_id;
      if (mode_type == 'task') {
        this.init();
      } else {
        this.init('chat')
      }
      this.autoTitle();
      return result;
    },
    async resetChatInfo() {
      this.chatInfo = {
        pid: -1,
        msgList: []
      }
    },
    // 发送消息
    sendMessage(message) {
    },
    // message
    handleInitMessage(content, files = [], screenshot = '', filepath = '') {
      console.log('handleInitMessage', content);
      this.mode_editor = false;
      let meta = {
        json: files,
        action_type: 'question',
      }
      if (screenshot && filepath) {
        this.mode_editor = true;
        meta.json = { files, screenshot, filepath }
      }
      const message = {
        content: content,
        timestamp: new Date().getTime(),
        meta: meta,
        role: 'user',
        is_temp: true,
      }
      this.messages.push(message);
      const bot_message = {
        content: "",
        role: 'assistant',
        timestamp: new Date().getTime(),
        is_temp: true,
      }
      this.messages.push(bot_message);
      this.isScrolledToBottom = true;
      this.scrollToBottom();
    },
    async removeConversation(conversationId) {
      // if (this.socket) {
      //   this.socket.close();
      // }
      const result = await chat.remove(conversationId);
      let index = this.list.findIndex(item => item.conversation_id === conversationId);
      if (index !== -1) {
        this.list.splice(index, 1);
      }
      return result;
    },
    scrollToBottom(time = 500) {
      setTimeout(() => {
        console.log('scrollToBottom', this.isScrolledToBottom);
        //将消息滚动到最底部
        const messageList = document.querySelector('.chat-messages');
        if (this.isScrolledToBottom) {
          messageList.scrollTop = messageList.scrollHeight - messageList.clientHeight;
          // console.log('scrollToBottom', messageList.scrollTop, messageList.scrollHeight, messageList.clientHeight);
        }
      }, time);
    },
    async favorite() {
      const result = await chat.favorite(this.conversationId);
      this.chat.is_favorite = true;
    },
    async unfavorite() {
      const result = await chat.unfavorite(this.conversationId);
      this.chat.is_favorite = false;
    },
    async convertToTree(messages) {
      console.log("初始化tree", messages)
      // 创建消息映射，便于快速查找
      const messageMap = new Map();
      messages.forEach(msg => {
        const meta = JSON.parse(msg.meta);
        console.log('meta', meta)
        messageMap.set(msg.id, {
          id: msg.id,
          pid: meta.pid,
          role: msg.role,
          content: msg.content,
          children: []
        });
      });

      // 构建树结构
      const tree = [];
      messageMap.forEach(msg => {
        if (msg.pid === '-1') {
          // 根节点直接加入树
          tree.push(msg);
        } else {
          // 非根节点，找到父节点并加入其 children
          const parent = messageMap.get(Number(msg.pid));
          if (parent) {
            parent.children.push(msg);
          }
        }
      });

      // 按 id 排序根节点（可选，根据需要）
      tree.sort((a, b) => a.id - b.id);

      return tree;
    }

  },
  persist: true,
})
