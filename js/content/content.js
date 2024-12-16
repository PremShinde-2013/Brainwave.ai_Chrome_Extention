// contentExtractor.js 内容
const contentExtractor = {
    // 提取页面内容
    extractPageContent() {
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
    },

    // 获取页面元数据
    getPageMetadata() {
        return {
            url: window.location.href,
            title: document.title
        };
    },

    // 获取选中的文本
    getSelectedText() {
        return window.getSelection().toString();
    },

    // 获取图片信息
    getImageInfo(img) {
        return {
            src: img.src,
            alt: img.alt || '',
            title: img.title || ''
        };
    }
};

// contentMessageHandler.js 内容
function initializeMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // 根据发送者处理不同的消息
        if (sender.id === chrome.runtime.id) {
            if (request.action === "getContent") {
                try {
                    const content = contentExtractor.extractPageContent();
                    const metadata = contentExtractor.getPageMetadata();
                    console.log('提取的内容长度:', content.length);
                    sendResponse({
                        success: true,
                        content: content,
                        url: metadata.url,
                        title: metadata.title
                    });
                } catch (error) {
                    console.error('提取内容时出错:', error);
                    sendResponse({
                        success: false,
                        error: error.message
                    });
                }
            }
        }
        return true; // 保持消息通道开放
    });
}

// 初始化消息监听器
initializeMessageListeners();
console.log('Content script loaded'); 