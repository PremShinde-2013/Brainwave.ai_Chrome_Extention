import { loadSettings, saveSettings, resetSettings, fetchAiConfig } from './settings.js';
import { initializeUIListeners, showStatus, hideStatus } from './ui.js';
import { loadQuickNote, initializeQuickNoteListeners } from './quickNote.js';
import { checkSummaryState, initializeSummaryListeners, handleSummaryResponse } from './summary.js';

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 检查是否是通过通知点击打开的
        const result = await chrome.storage.local.get(['notificationClicked', 'notificationTabId']);
        if (result.notificationClicked) {
            // 检查当前标签页是否匹配
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id === result.notificationTabId) {
                // 清除标记
                await chrome.storage.local.remove(['notificationClicked', 'notificationTabId']);
                // 切换到主页面
                const mainTab = document.querySelector('.tablinks[data-tab="main"]');
                if (mainTab) {
                    mainTab.click();
                }
            }
        }

        // 加载设置
        await loadSettings();
        
        // 检查总结状态
        await checkSummaryState();
        
        // 加载快捷记录内容
        await loadQuickNote();

        // 显示主页面
        document.getElementById('main').style.display = 'block';

        // 初始化所有事件监听器
        initializeUIListeners();
        initializeQuickNoteListeners();
        initializeSummaryListeners();

        // 绑定设置相关事件
        document.getElementById('saveSettings').addEventListener('click', async () => {
            try {
                await saveSettings();
                showStatus('设置已保存', 'success');
                setTimeout(hideStatus, 2000);
            } catch (error) {
                showStatus('保存设置失败: ' + error.message, 'error');
            }
        });

        document.getElementById('resetSettings').addEventListener('click', async () => {
            try {
                await resetSettings();
                showStatus('设置已重置为默认值', 'success');
                setTimeout(hideStatus, 2000);
            } catch (error) {
                showStatus('重置设置失败: ' + error.message, 'error');
            }
        });

        // 绑��获取AI配置按钮事件
        document.getElementById('fetchAiConfig').addEventListener('click', fetchAiConfig);

    } catch (error) {
        console.error('初始化失败:', error);
        showStatus('初始化失败: ' + error.message, 'error');
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
            showStatus('处理成功', 'success');
            setTimeout(hideStatus, 2000);
        } else {
            showStatus('处理失败: ' + request.response.error, 'error');
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
window.addEventListener('unload', () => {
    try {
        chrome.runtime.sendMessage({ action: "popupClosed" }).catch(() => {
            // 忽略错误，popup关闭时可能会出现连接错误
        });
    } catch (error) {
        // 忽略错误
    }
}); 