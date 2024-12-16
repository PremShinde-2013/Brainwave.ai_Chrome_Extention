import { showStatus, clearSummaryPreview, showSummaryPreview } from './ui.js';
import { saveTempSummaryData, clearTempSummaryData, loadTempSummaryData } from './storage.js';

// 获取当前标签页信息
async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

// 处理总结应答
async function handleSummaryResponse(response) {
    try {
        if (!response) {
            throw new Error('无效的响应');
        }

        if (response.success) {
            const settings = await chrome.storage.sync.get('settings');
            let finalSummary = response.summary;

            // 保存临时数据，不在这里添加标签
            await saveTempSummaryData({
                summary: finalSummary,
                url: response.url,
                title: response.title,
                tag: settings.settings?.summaryTag  // 使用可选链操作符
            });

            // 显示预览
            await showSummaryPreview({
                summary: finalSummary,
                url: response.url,
                title: response.title
            });
            showStatus('总结生成成功', 'success');
        } else {
            showStatus('生成总结失败: ' + (response.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('处理总结响应时出错:', error);
        showStatus('处理总结失败: ' + error.message, 'error');
    }
}

// 保存总结内容
async function saveSummary() {
    try {
        const summary = document.getElementById('summaryText').value;
        const tempData = await loadTempSummaryData();
        const settings = await chrome.storage.sync.get('settings');
        
        if (!summary || !tempData) {
            showStatus('没有可保存的内容', 'error');
            return;
        }

        showStatus('正在保存...', 'loading');
        
        // 在这里添加标签到内容中
        let finalContent = summary;
        if (settings.settings?.summaryTag) {
            finalContent = finalContent.trim() + '\n' + settings.settings.summaryTag;
        }
        
        // 使用 Promise 包装消息发送
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'saveSummary',
                content: finalContent,
                url: settings.settings?.includeSummaryUrl ? tempData.url : undefined,
                title: tempData.title
            }, (response) => {
                resolve(response || { success: false, error: '保存失败' });
            });
        });

        if (response.success) {
            showStatus('保存成功', 'success');
            // 清除文本框内容和临时数据
            document.getElementById('summaryText').value = '';
            await clearTempSummaryData();
        } else {
            showStatus('保存失败: ' + (response.error || '未知错误'), 'error');
        }
    } catch (error) {
        console.error('保存总结时出错:', error);
        showStatus('保存失败: ' + error.message, 'error');
    }
}

// 检查后台总结状态
async function checkSummaryState() {
    try {
        // 首先尝试从storage获取保存的总结
        const currentSummary = await chrome.storage.local.get('currentSummary');
        const response = await chrome.runtime.sendMessage({ action: "getSummaryState" });
        
        const summaryPreview = document.getElementById('summaryPreview');
        const summaryText = document.getElementById('summaryText');
        const pageTitle = document.getElementById('pageTitle');
        const pageUrl = document.getElementById('pageUrl');
        const extractBtn = document.getElementById('extract');
        const cancelBtn = document.getElementById('cancelEdit');
        const editSummaryBtn = document.getElementById('editSummary');

        // 确保所有元素都存在
        if (!summaryPreview || !summaryText || !pageTitle || !pageUrl || !extractBtn || !cancelBtn || !editSummaryBtn) {
            console.error('找不到必要的DOM元素');
            return;
        }

        // 如果有已保存的总结，显示它
        if (currentSummary.currentSummary && currentSummary.currentSummary.summary) {
            summaryPreview.style.display = 'block';
            summaryText.value = currentSummary.currentSummary.summary;
            pageTitle.textContent = currentSummary.currentSummary.title || '';
            pageUrl.textContent = currentSummary.currentSummary.url || '';
            extractBtn.textContent = '重新生成';
            extractBtn.disabled = false;
            return;
        }

        // 否则根据状态显示
        if (response) {
            switch (response.status) {
                case 'completed':
                    // 显示已完成的总结
                    summaryPreview.style.display = 'block';
                    summaryText.value = response.summary;
                    pageTitle.textContent = response.title || '';
                    pageUrl.textContent = response.url || '';
                    extractBtn.textContent = '重新生成';
                    extractBtn.disabled = false;
                    break;
                case 'processing':
                    // 显示处理中状态
                    summaryPreview.style.display = 'block';
                    summaryText.value = '正在生成总结，请稍候...';
                    pageTitle.textContent = response.title || '';
                    pageUrl.textContent = response.url || '';
                    extractBtn.textContent = '处理中...';
                    extractBtn.disabled = true;
                    break;
                case 'error':
                    // 显示错误状态
                    showStatus(response.error, 'error');
                    extractBtn.textContent = '重新生成';
                    extractBtn.disabled = false;
                    break;
                case 'none':
                    // 重置为初始状态
                    extractBtn.textContent = '提取并总结页面内容';
                    extractBtn.disabled = false;
                    clearSummaryPreview();
                    break;
            }
        }
    } catch (error) {
        console.error('检查总结状态时出错:', error);
    }
}

// 初始化总结相关的事件监听器
function initializeSummaryListeners() {
    document.getElementById('extract').addEventListener('click', async () => {
        showStatus('正在获取页面内容...', 'loading');
        try {
            const tab = await getCurrentTab();
            if (!tab) {
                throw new Error('无法获取当前标签页');
            }

            // 使用 Promise 包装消息发送
            const response = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { action: 'getContent' }, (response) => {
                    resolve(response || { success: false, error: '获取内容失败' });
                });
            });

            if (response.success) {
                showStatus('正在生成总结...', 'loading');
                // 发送到background进行总结
                chrome.runtime.sendMessage({
                    action: "getContent",
                    content: response.content,
                    url: response.url,
                    title: response.title
                });
            } else {
                showStatus('获取页面内容失败: ' + (response.error || '未知错误'), 'error');
            }
        } catch (error) {
            showStatus('获取页面内容失败: ' + error.message, 'error');
        }
    });

    document.getElementById('editSummary').addEventListener('click', saveSummary);
    document.getElementById('cancelEdit').addEventListener('click', async () => {
        clearSummaryPreview();
        await clearTempSummaryData();
    });
}

export {
    getCurrentTab,
    handleSummaryResponse,
    saveSummary,
    checkSummaryState,
    initializeSummaryListeners
}; 