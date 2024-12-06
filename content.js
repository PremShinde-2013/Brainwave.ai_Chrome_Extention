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

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContent") {
        try {
            const content = extractPageContent();
            console.log('提取的内容长度:', content.length);
            chrome.runtime.sendMessage({
                action: "getContent",
                content: content,
                url: window.location.href,
                title: document.title
            });
        } catch (error) {
            console.error('提取内容时出错:', error);
            chrome.runtime.sendMessage({
                action: "getContent",
                success: false,
                error: error.message
            });
        }
    }
    return true;
});