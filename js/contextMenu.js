import { sendToBlinko, sendToTarget } from './api.js';
import { showSuccessIcon } from './ui.js';

// 初始化右键菜单
function initializeContextMenu() {
    chrome.runtime.onInstalled.addListener(() => {
        chrome.contextMenus.create({
            id: "sendSelectedText",
            title: "发送到Blinko笔记",
            contexts: ["selection"]
        });

        // 创建图片右键菜单
        chrome.contextMenus.create({
            id: 'saveImageToBlinko',
            title: '保存图片到Blinko',
            contexts: ['image']
        });
    });
}

// 处理右键菜单点击
async function handleContextMenuClick(info, tab) {
    if (info.menuItemId === "sendSelectedText") {
        try {
            const result = await chrome.storage.sync.get('settings');
            const settings = result.settings;
            
            if (!settings) {
                throw new Error('未找到设置信息');
            }

            // 准备最终内容
            let finalContent = info.selectionText;
            if (settings.selectionTag) {
                finalContent = finalContent.trim() + '\n' + settings.selectionTag;
            }

            const response = await sendToTarget(
                finalContent,
                settings,
                tab.url,
                0,
                tab.title,
                true  // 这是划词场景
            );
            
            if (response.ok) {
                showSuccessIcon();
            } else {
                throw new Error(`发送选中文本失败，状态码: ${response.status}`);
            }
        } catch (error) {
            console.error('发送选中文本失败:', error);
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: '发送失败',
                message: error.message
            });
        }
    }

    if (info.menuItemId === 'saveImageToBlinko') {
        try {
            // 获取设置
            const result = await chrome.storage.sync.get('settings');
            const settings = result.settings;
            
            if (!settings) {
                throw new Error('未找到设置信息');
            }

            // 构建Markdown格式的图片链接
            let content = `![${tab.title || '图片'}](${info.srcUrl})`;
            
            // 如果设置中选择包含URL，则添加原网页链接
            if (settings.includeImageUrl) {
                content += `\n\n> 来源：[${tab.title}](${tab.url})`;
            }

            // 添加图片标签，确保前面有换行符
            if (settings.imageTag) {
                content += `\n\n${settings.imageTag}`;
            }

            // 发送到Blinko
            const response = await sendToBlinko(content);
            
            if (response.success) {
                // 通知用户保存成功
                showSuccessIcon();
            } else {
                throw new Error(response.error || '保存失败');
            }
        } catch (error) {
            console.error('保存图片失败:', error);
            // 可以考虑添加一个通知来显示错误信息
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: '保存失败',
                message: error.message
            });
        }
    }
}

export {
    initializeContextMenu,
    handleContextMenuClick
}; 