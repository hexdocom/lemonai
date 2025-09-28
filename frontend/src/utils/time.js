export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
  const day = String(date.getDate()).padStart(2, '0');
  
  // 如果是 NaN 返回 空字符串
  if (isNaN(year)) {
    return '';
  }
  if (year === now.getFullYear()) {
    // 今年内，显示 MM/DD
    return `${month}/${day}`;
  } else {
    // 今年以前，显示 YYYY/MM/DD
    return `${year}/${month}/${day}`;
  }
};

export const formatTimeWithHMS = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份从0开始
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  // 如果是 NaN 返回 空字符串
  if (isNaN(year)) {
    return '';
  }
  if (year === now.getFullYear()) {
    // 今年内，显示 MM/DD HH:mm:ss
    return `${month}/${day} ${hour}:${minute}:${second}`;
  } else {
    // 今年以前，显示 YYYY/MM/DD HH:mm:ss
    return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
  }
};


export default {
    formatTime,
    formatTimeWithHMS
}