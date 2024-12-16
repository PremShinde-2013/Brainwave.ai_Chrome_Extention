import { getSummaryFromModel, sendToTarget } from './api.js';
import { getSummaryState, updateSummaryState, clearSummaryState, saveSummaryToStorage } from './summaryState.js';

// 处理内容请求
async function handleContentRequest(request) {
    try {
        if (!request || !request.content) {
            throw new Error('无效的请求内容');
        }

        // 更新状态为处理中
        updateSummaryState({
            status: 'processing',
            url: request.url,
            title: request.title
        });

        // 获取存储的设置
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;
        
        if (!settings) {
            throw new Error('未找到设置信息');
        }

        // 检查必要的设置是否存在
        if (!settings.modelUrl || !settings.apiKey || !settings.modelName) {
            throw new Error('请先完成API设置');
        }

        // 生成总结
        const summary = await getSummaryFromModel(request.content, settings);
        
        // 更新状态为完成
        updateSummaryState({
            status: 'completed',
            summary: summary,
            url: request.url,
            title: request.title
        });

        // 保存到storage
        await saveSummaryToStorage(summary, request.url, request.title);

        // 发送总结结果回popup
        try {
            await chrome.runtime.sendMessage({
                action: 'handleSummaryResponse',
                success: true,
                summary: summary,
                url: request.url,
                title: request.title
            }).catch(() => {
                // 忽略错误，popup可能已关闭
            });
        } catch (error) {
            console.log('Popup可能已关闭，发送消息失败');
        }

        // 总是显示通知
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: '总结完成',
            message: `已完成对"${request.title || '页面'}"的内容总结`
        });

    } catch (error) {
        console.error('处理内容请求时出错:', error);
        // 更新状态为错误
        updateSummaryState({
            status: 'error',
            error: error.message,
            url: request.url,
            title: request.title
        });

        // 尝试发送错误消息到popup
        try {
            await chrome.runtime.sendMessage({
                action: 'handleSummaryResponse',
                success: false,
                error: error.message
            }).catch(() => {
                // 忽略错误，popup可能已关闭
            });
        } catch (error) {
            console.log('Popup可能已关闭，发送错误消息失败');
        }

        // 总是显示错误通知
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: '总结失败',
            message: `总结"${request.title || '页面'}"时出错: ${error.message}`
        });
    }
}

// 处理保存总结
async function handleSaveSummary(request) {
    try {
        if (!request || !request.content) {
            throw new Error('无效的请求内容');
        }

        // 获取存储的设置
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;
        
        if (!settings) {
            throw new Error('未找到设置信息');
        }

        let finalContent;
        
        // 如果是快捷记录
        if (request.type === 'quickNote') {
            if (!request.content || !request.content.trim()) {
                throw new Error('请输入笔记内容');
            }
            finalContent = request.content.trim();
        } else {
            // 如果是总结内容
            if (!request.content || !request.content.trim()) {
                throw new Error('没有可保存的内容');
            }
            finalContent = request.content.trim();

            // 添加总结标签
            if (settings.summaryTag) {
                finalContent = `${finalContent}\n\n${settings.summaryTag}`;
            }
        }

        try {
            const response = await sendToTarget(finalContent, settings, request.url, 0, request.title);
            
            if (response.ok) {
                // 如果是总结内容，清除存储
                if (!request.type || request.type !== 'quickNote') {
                    await chrome.storage.local.remove('currentSummary');
                    await clearSummaryState();
                }
                return { success: true };
            } else {
                throw new Error(`保存失败: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`发送内容失败: ${error.message}`);
        }
    } catch (error) {
        console.error('保存内容时出错:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
}

// 处理悬浮球请求
async function handleFloatingBallRequest(request) {
    try {
        // 获取存储的设置
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;
        
        if (!settings) {
            throw new Error('未找到设置信息');
        }

        // 检查必要的设置是否存在
        if (!settings.modelUrl || !settings.apiKey || !settings.modelName) {
            throw new Error('请先完成API设置');
        }

        // 生成总结
        const summary = await getSummaryFromModel(request.content, settings);
        
        // 准备最终内容
        let finalContent = summary;

        // 如果有总结标签，添加到内容末尾
        if (settings.summaryTag) {
            finalContent = `${finalContent}\n\n${settings.summaryTag}`;
        }

        // 直接发送到服务器
        const response = await sendToTarget(finalContent, settings, request.url, 0, request.title, false);
        
        if (response.ok) {
            return { success: true };
        } else {
            throw new Error(`服务器返回状态码: ${response.status}`);
        }
    } catch (error) {
        console.error('处理悬浮球请求时出错:', error);
        return { success: false, error: error.message };
    }
}

export {
    handleContentRequest,
    handleSaveSummary,
    handleFloatingBallRequest
}; 