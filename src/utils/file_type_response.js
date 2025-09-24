

const imgTypeDict = { 'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml' }
const officeTypeDict = { "pdf": "application/pdf", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
function getContentTypeByFileName(/** @type {string} */ fileName) {
    const fileExtendName = fileName.split('.').pop();
    if (imgTypeDict[fileExtendName]) {
        return imgTypeDict[fileExtendName];
    } else if (officeTypeDict[fileExtendName]) {
        return officeTypeDict[fileExtendName];
    } else {
        return 'text/csv; charset=utf-8';
    }
}

module.exports = exports = {
    getContentTypeByFileName
}