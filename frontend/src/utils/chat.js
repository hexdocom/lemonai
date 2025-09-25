function convertToTree(messages) {
  // 创建消息映射，便于快速查找
  console.log("convertToTree",messages)
  const messageMap = new Map();
  messages.forEach(msg => {
    console.log("msg",msg)
    //判断 msg.meta 是string 还是object
    let meta = msg.meta;
    if (typeof meta === 'string') {
      meta = JSON.parse(meta);
    }
    messageMap.set(msg.id, {
      id: msg.id,
      pid: meta.pid,
      role: msg.role,
      content: msg.content,
      is_active: meta.is_active,
      children: []
    });
  });
  console.log("messageMap",messageMap)
  // 构建树结构
  const tree = [];
  messageMap.forEach(msg => {
    if (msg.pid === -1) {
      // 根节点直接加入树
      tree.push(msg);
    } else {
      // 非根节点，找到父节点并加入其 children
      const parent = messageMap.get(msg.pid);
      if (parent) {
        parent.children.push(msg);
      }
    }
  });

  // 按 id 排序根节点（可选，根据需要）
  tree.sort((a, b) => a.id - b.id);

  return tree;
}




export default {
  convertToTree,
};