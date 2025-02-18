import { loadSettings, saveSettings, resetSettings, fetchAiConfig } from './settings.js';
import { initializeUIListeners, showStatus, hideStatus } from './ui.js';
import { loadQuickNote, initializeQuickNoteListeners } from './quickNote.js';
import { checkSummaryState, initializeSummaryListeners, handleSummaryResponse } from './summary.js';

// 初始化国际化文本
function initializeI18n() {
    // 替换所有带有 __MSG_ 前缀的文本
    document.querySelectorAll('*').forEach(element => {
        // 处理文本内容
        if (element.childNodes && element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
            const text = element.textContent;
            if (text.includes('__MSG_')) {
                const msgName = text.match(/__MSG_(\w+)__/)[1];
                element.textContent = chrome.i18n.getMessage(msgName);
            }
        }
        
        // 处理 placeholder 属性
        if (element.hasAttribute('placeholder')) {
            const placeholder = element.getAttribute('placeholder');
            if (placeholder.includes('__MSG_')) {
                const msgName = placeholder.match(/__MSG_(\w+)__/)[1];
                element.setAttribute('placeholder', chrome.i18n.getMessage(msgName));
            }
        }
        
        // 处理 title 属性
        if (element.hasAttribute('title')) {
            const title = element.getAttribute('title');
            if (title.includes('__MSG_')) {
                const msgName = title.match(/__MSG_(\w+)__/)[1];
                element.setAttribute('title', chrome.i18n.getMessage(msgName));
            }
        }
    });
}

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 初始化国际化文本
        initializeI18n();

        // 检查是否是通过通知点击打开的
        const result = await chrome.storage.local.get(['notificationClicked', 'notificationTabId', 'quickNote', 'quickNoteAttachments']);
        
        // 加载设置
        await loadSettings();
        
        // 检查总结状态
        await checkSummaryState();
        
        // 加载快捷记录内容
        await loadQuickNote();

        // 决定显示哪个标签页
        let defaultTab = 'common';
        if (result.notificationClicked) {
            // 检查当前标签页是否匹配
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id === result.notificationTabId) {
                // 清除标记
                await chrome.storage.local.remove(['notificationClicked', 'notificationTabId']);
                defaultTab = 'quicknote';
            }
        } else if ((result.quickNote && result.quickNote.trim()) || 
                  (result.quickNoteAttachments && result.quickNoteAttachments.length > 0)) {
            // 如果快捷记录有内容或有附件，显示快捷记录标签页
            defaultTab = 'quicknote';
        }

        // 隐藏所有标签页内容
        document.querySelectorAll('.tabcontent').forEach(content => {
            content.style.display = 'none';
        });

        // 移除所有标签的激活状态
        document.querySelectorAll('.tablinks').forEach(btn => {
            btn.classList.remove('active');
        });

        // 显示默认标签页并激活对应的标签
        document.getElementById(defaultTab).style.display = 'block';
        document.querySelector(`.tablinks[data-tab="${defaultTab}"]`).classList.add('active');

        // 初始化所有事件监听器
        initializeUIListeners();
        initializeQuickNoteListeners();
        initializeSummaryListeners();

        // 绑定提取网页正文按钮事件
        document.getElementById('extractContent').addEventListener('click', async () => {
            try {
                showStatus(chrome.i18n.getMessage('extractingContent'), 'loading');
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) {
                    throw new Error(chrome.i18n.getMessage('cannotGetTab'));
                }

                // 发送消息到content script获取内容
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getContent'
                });

                if (!response || !response.success) {
                    throw new Error(response.error || '获取内容失败');
                }

                // 发送到background处理
                await chrome.runtime.sendMessage({
                    action: 'getContent',
                    content: response.content,
                    url: response.url,
                    title: response.title,
                    isExtractOnly: true
                });

            } catch (error) {
                console.error('提取网页内容失败:', error);
                showStatus(chrome.i18n.getMessage('settingsSaveError', [error.message]), 'error');
            }
        });

        // 绑定设置相关事件
        document.getElementById('saveSettings').addEventListener('click', async () => {
            try {
                await saveSettings();
                showStatus(chrome.i18n.getMessage('settingsSaved'), 'success');
                setTimeout(hideStatus, 2000);
            } catch (error) {
                showStatus(chrome.i18n.getMessage('settingsSaveError', [error.message]), 'error');
            }
        });

        document.getElementById('resetSettings').addEventListener('click', async () => {
            try {
                await resetSettings();
                showStatus(chrome.i18n.getMessage('settingsReset'), 'success');
                setTimeout(hideStatus, 2000);
            } catch (error) {
                showStatus(chrome.i18n.getMessage('settingsResetError', [error.message]), 'error');
            }
        });

        // 绑定获取AI配置按钮事件
        document.getElementById('fetchAiConfig').addEventListener('click', fetchAiConfig);

    } catch (error) {
        console.error('初始化失败:', error);
        showStatus(chrome.i18n.getMessage('initializationError', [error.message]), 'error');
    }
});

// 监听来自background的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'handleSummaryResponse') {
        handleSummaryResponse(request);
        sendResponse({ received: true });
    } else if (request && request.action === 'saveSummaryResponse') {
        if (request.response.success) {
            showStatus('保存成功', 'success');
            setTimeout(hideStatus, 2000);
        } else {
            showStatus('保存失败: ' + request.response.error, 'error');
        }
        sendResponse({ received: true });
    } else if (request && request.action === 'floatingBallResponse') {
        if (request.response.success) {
            showStatus(request.response.isExtractOnly ? '提取成功' : '总结成功', 'success');
            setTimeout(hideStatus, 2000);
        } else {
            showStatus((request.response.isExtractOnly ? '提取' : '总结') + '失败: ' + request.response.error, 'error');
        }
        sendResponse({ received: true });
    } else if (request && request.action === 'clearSummaryResponse') {
        if (request.success) {
            showStatus('清除成功', 'success');
            setTimeout(hideStatus, 2000);
        }
        sendResponse({ received: true });
    }
    return false;  // 不保持消息通道开放
});

// 在popup关闭时通知background
window.addEventListener('unload', async () => {
    try {
        // 如果summaryPreview是隐藏的，说明用户已经取消或保存了内容，这时我们需要清理存储
        const summaryPreview = document.getElementById('summaryPreview');
        if (summaryPreview && summaryPreview.style.display === 'none') {
            await chrome.storage.local.remove('currentSummary');
        }
        
        chrome.runtime.sendMessage({ action: "popupClosed" }).catch(() => {
            // 忽略错误，popup关闭时可能会出现连接错误
        });
    } catch (error) {
        // 忽略错误
    }
}); 