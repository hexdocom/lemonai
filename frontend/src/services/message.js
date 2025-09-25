import { v4 as uuid } from 'uuid';
import i18n from '@/locals';

let messageStatus = "running";
// 处理消息
function handleMessage(message, messages) {
    if (message.meta && typeof message.meta === 'string') {
        message.meta = JSON.parse(message.meta);
    }

    if(message.meta.action_type == ""){
        return
    }

    if (!message.meta || !message.meta.action_type) {
        return messages.push(message);
    }

    const { action_type } = message.meta;
    console.log("handleMessage", message)
    if (messageStatus == "stop" && action_type != "question" && action_type != "auto_reply") {
        return
    }

    switch (action_type) {
        case "chat":
            return handleChatMessage(message, messages);
        case "auto_reply":
            messageStatus = "running"
            return handleAutoReply(message, messages);
        case "plan":
            return handlePlan(message, messages);
        case "question":
            messageStatus = "running"
            return handleQuestion(message, messages);
        case "finish_summery":
        case 'progress':
        case 'coding':
            return handleFinishSummaryAddId(message, messages);
        case "stop":
            return handleStop(message, messages);
        case "error":
            return handleStop(message, messages);
        case "finish":
            return
        case "task":
            return updateTask(message, messages);

        default:
            // 默认也执行更新任务
            return updateAction(message, messages);
    }
}

function handleStop(message, messages) {
    messages.push(message);
    // messageStatus = "stop";
    console.log('handleStop', messages);
    //找到 meta.action_type 是 plan 的
    //删除 action_type : "update_status"
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].meta?.action_type === "update_status") {
            messages.splice(i, 1); // 原地删除元素
        }
    }
    messages.forEach((message) => {
        if (message.meta?.action_type === 'plan') {
            // // 确保 meta.json 存在且是数组
            if (Array.isArray(message.meta.json)) {
                // 遍历 meta.json
                message.meta.json.forEach((jsonItem) => {
                    if (jsonItem.status == "running") {
                        jsonItem.status = "success"
                    }
                    let actions = jsonItem.actions;
                    if (actions?.length > 0) {
                        actions.forEach(action => {
                            if (action.status == "running") {
                                action.status = "success"
                            }
                        })
                    }
                })
            }
        }
        return message
    })
    return
}
function handleFinishSummaryAddId(message, messages) {
    let fileList = message.meta.json;
    for (let i = 0; i < fileList.length; i++) {
        const element = fileList[i];
        element.id = uuid()
    }
    // console.log('fileList by id',fileList);
    messages.push(message);

}
// 删掉临时message update_status
function deleteTempMessage(messages) {
    //!message.is_temp && message.meta.action_type !== "update_status" 删除
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message?.meta?.action_type == "update_status") {
            messages.splice(i, 1);
        }
    }
}

function handlePlan(message, messages) {
    deleteTempMessage(messages);
    console.log('plan', message);
    //将第一task的任务设置为开始
    // item.is_collapse = true
    message.meta.json.forEach(item => {
        item.is_collapse = true
    });
    message.meta.json[0].status = 'running';
    messages.push(message);
    //update_status
}

//处理自动回复
function handleAutoReply(message, messages) {
    messages.push(message);
    //update_status
    messages.push(
        {
            content: i18n.global.t('lemon.message.botInitialPlan'),
            role: 'assistant',
            is_temp: true,
            meta: {
                action_type: "update_status",
            },
        }
    )
}
function handleChatMessage(message, messages) {
    console.log('handleChatMessage', message);
    messages.push(message);
}

//处理question
function handleQuestion(message, messages) {
    console.log('handleQuestion', message);
    //判断 messages 中 有没有  role: 'user', is_temp: true, 的数据 如果有则替换 如果没有 则添加
    let user_message_index = messages.findLastIndex(messageInfo => messageInfo.role === 'user' && messageInfo.is_temp);
    if (user_message_index !== -1) {
        messages[user_message_index] = message;
        messages[user_message_index].files = message.meta.json;
    } else {
        messages.push(message);
    }
}

//更新任务
function updateTask(message, messages) {
    const task_id = message.meta.task_id;
    //根据 task_id 找到对应的任务
    //第一步 找到 plan_message 
    let plan_message_index = messages.findLastIndex(messageInfo => messageInfo.meta && messageInfo.meta.action_type === 'plan');
    //获取 plan 的 actions
    let plan = messages[plan_message_index];

    //根据plan 的 json 找到当前的task

    let task_index = plan.meta.json.findIndex(task => task.id === task_id);
    // console.log('task_index',task_index);
    if (task_index !== -1) {
        // console.log('plan.meta.json[task_index]',plan.meta.json[task_index]);
        plan.meta.json[task_index].status = message.meta.json.status || message.status;
        plan.meta.json[task_index].meta = message.meta;

        //如果task 的 status 为 failure 则替换
        let status = message.meta.json.status || message.status;
        if (status === 'failure') {
            //将当前task  let actions = plan.meta.json[task_index].actions; 
            let actions = plan.meta.json[task_index].actions || [];
            //删除 状态为 running 的任务
            actions = actions.filter(action => action.status !== 'running');
            plan.meta.json[task_index].actions = actions;
        }
        //只有任务成功了 才执行下一个task 如果失败了 则不执行下一个task
        if (status === 'success' || status === 'completed') {
            //找到下一个task
            if (plan.meta.json[task_index + 1]) {
                plan.meta.json[task_index + 1].status = 'running';
            }
        }
    }
}


// 更新 action
function updateAction(message, messages) {
    const task_id = message.meta.task_id;
    const uuid = message.uuid;

    if (message.meta.action_type === 'terminal_run') {
        message.content = [message.content]
    }

    //第一步 找到 plan_message 
    let plan_message_index = messages.findLastIndex(messageInfo => messageInfo.meta && messageInfo.meta.action_type === 'plan');
    //获取 plan 的 actions
    let plan = messages[plan_message_index];

    //根据plan 的 json 找到当前的task

    let task_index = plan.meta.json.findIndex(task => task.id === task_id);

    //如果task_index 为 -1 则查询当前  status:"pending"
    if (task_index === -1) {
        task_index = plan.meta.json.findIndex(task => task.status === 'running');
        if (task_index === -1) {
            task_index = Math.max(0, plan.meta.json.length - 1);
        }
    }

    if (!plan.meta.json[task_index].actions) {
        plan.meta.json[task_index].actions = [];
    }
    let actions = plan.meta.json[task_index].actions;

    //判断当前uuid 在 actions 中是否存在 如果存在则更新状态 如果不存在则添加
    let action_index = actions.findIndex(action => action.uuid === uuid);
    //  console.log('action_index',action_index);
    if (action_index !== -1) {
        actions[action_index].status = message.status;
        actions[action_index].meta = message.meta;
        console.log('message.action_type', message.meta.action_type)
        if (message.meta.action_type === 'terminal_run') {
            actions[action_index].content = [actions[action_index].content[0], message.content[0]];
        }
        if (message.meta.action_type === 'mcp_tool') {
            actions[action_index].meta.content = message.content
        }
    } else {
        actions.push(message);
    }

}

export default {
    handleMessage
}