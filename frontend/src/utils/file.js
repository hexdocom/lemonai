

const imgType = ['png','jpg','svg','jpeg','gif','webp','bmp']
const blobTypeDict = ['png','jpg','svg','jpeg','gif','webp','bmp','pdf','docx','doc','xlsx','xls','pptx','ppt']

// 
function getFileReponseTypeByName(filename){
    const fileExtendName = filename.split('.').pop();
    if(blobTypeDict.includes(fileExtendName)){
        return 'blob';
    }else{
        return 'json';
    }
};

async function handleFileDownload(file) {
    try {
      const filePath = file.filepath;
      const fileName = filePath.split("/").pop();
      const fileExt = fileName.split(".").pop().toLowerCase();
  
      // 文件后缀对应 MIME 类型表（可扩展）
      const mimeTypes = {
        txt: "text/plain",
        csv: "text/csv",
        json: "application/json",
        pdf: "application/pdf",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        mp3: "audio/mpeg",
        mp4: "video/mp4",
        zip: "application/zip",
      };
      const mimeType = mimeTypes[fileExt] || "application/octet-stream";
      const accessToken = localStorage.getItem('access_token');
      // 调用后端接口获取文件流
      const response = await fetch('/api/file/read', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' , 
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ path: filePath })
      });
  
      if (!response.ok) {
        throw new Error('Download failed');
      }
  
      // 将返回的流转成 Blob
      const fileContent = await response.blob();
      const blob = new Blob([fileContent], { type: mimeType });
      console.log("=== blob ====",blob)
      const url = window.URL.createObjectURL(blob);
      console.log("=== url ====",url)
      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
  
      console.log('Download successful:', fileName);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }




export default {
    getFileReponseTypeByName,
    handleFileDownload,
    imgType
};