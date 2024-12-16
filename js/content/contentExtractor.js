// 提取页面内容
function extractPageContent() {
    try {
        // 获取正文内容
        const content = document.body.innerText
            .replace(/[\n\r]+/g, '\n') // 将多个换行符替换为单个
            .replace(/\s+/g, ' ') // 将多个空格替换为单个
            .trim(); // 移除首尾空白
        
        return content;
    } catch (error) {
        console.error('提取内容时出错:', error);
        throw error;
    }
}

// 获取页面元数据
function getPageMetadata() {
    return {
        url: window.location.href,
        title: document.title
    };
}

// 获取选中的文本
function getSelectedText() {
    return window.getSelection().toString();
}

// 获取图片信息
function getImageInfo(img) {
    return {
        src: img.src,
        alt: img.alt || '',
        title: img.title || ''
    };
}

export {
    extractPageContent,
    getPageMetadata,
    getSelectedText,
    getImageInfo
}; 