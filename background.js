// 存储全局总结状态
let summaryState = {
    status: 'none',
    summary: null,
    url: null,
    title: null
};

// 监听来自popup和content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContent") {
        handleContentRequest(request, sendResponse);
        return true;  // 保持消息通道开放
    }
    
    if (request.action === "saveSummary") {
        handleSaveSummary(request, sendResponse);
        return true;  // 保持消息通道开放
    }

    if (request.action === "processAndSendContent") {
        handleFloatingBallRequest(request, sendResponse);
        return true;  // 保持消息通道开放
    }

    if (request.action === "getSummaryState") {
        // 返回全局状态
        sendResponse(summaryState);
        return true;
    }

    if (request.action === "clearSummary") {
        summaryState = {
            status: 'none',
            summary: null,
            url: null,
            title: null
        };
        // 同时清除存储的内容
        chrome.storage.local.remove('currentSummary');
        sendResponse({ success: true });
        return true;
    }
});

async function handleContentRequest(request, sendResponse) {
    try {
        // 更新状态为处理中
        summaryState = {
            status: 'processing',
            url: request.url,
            title: request.title
        };

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
        summaryState = {
            status: 'completed',
            summary: summary,
            url: request.url,
            title: request.title
        };

        // 保存到storage
        await chrome.storage.local.set({
            currentSummary: {
                summary: summary,
                url: request.url,
                title: request.title,
                timestamp: Date.now()
            }
        });

        // 发送总结结果回popup
        try {
            await chrome.runtime.sendMessage({
                action: 'handleSummaryResponse',
                success: true,
                summary: summary,
                url: request.url,
                title: request.title
            });
        } catch (error) {
            console.log('Popup可能已关闭，发送消息失败');
        }

        // 总是显示通知
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: '总结完成',
            message: `已完成对"${request.title}"的内容总结`
        });

    } catch (error) {
        console.error('处理内容请求时出错:', error);
        // 更新状态为错误
        summaryState = {
            status: 'error',
            error: error.message,
            url: request.url,
            title: request.title
        };

        // 尝试发送错误消息到popup
        try {
            await chrome.runtime.sendMessage({
                action: 'handleSummaryResponse',
                success: false,
                error: error.message
            });
        } catch (error) {
            console.log('Popup可能已关闭，发送错误消息失败');
        }

        // 总是显示错误通知
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon128.png',
            title: '总结失败',
            message: `总结"${request.title}"时出错: ${error.message}`
        });
    }
}

async function getSummaryFromModel(content, settings) {
    try {
        const prompt = settings.promptTemplate.replace('{content}', content);
        
        // 获取完整的API URL
        const fullUrl = getFullApiUrl(settings.modelUrl, '/chat/completions');
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: settings.temperature
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API请求失败: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('API返回式错误');
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('获取总结时出错:', error);
        throw error;
    }
}

async function handleSaveSummary(request, sendResponse) {
    try {
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
            const currentSummary = await chrome.storage.local.get('currentSummary');
            if (!currentSummary.currentSummary || !currentSummary.currentSummary.summary) {
                throw new Error('没有可保存的内容');
            }
            finalContent = currentSummary.currentSummary.summary;

            // 如果设置中选择包含URL，则添加原网页链接
            if (settings.includeSummaryUrl && currentSummary.currentSummary.url) {
                finalContent = `${finalContent}\n\n原文链接：[${currentSummary.currentSummary.title || currentSummary.currentSummary.url}](${currentSummary.currentSummary.url})`;
            }

            // 添加总结标签
            if (settings.summaryTag) {
                finalContent = `${finalContent}\n\n${settings.summaryTag}`;
            }
        }

        // 获取完整的API URL
        const fullUrl = getFullApiUrl(settings.targetUrl, '/note/upsert');

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': settings.authKey
            },
            body: JSON.stringify({
                content: finalContent
            })
        });

        if (!response.ok) {
            throw new Error(`保存失败: ${response.status}`);
        }

        // 如果是总结内容，清除存储
        if (!request.type || request.type !== 'quickNote') {
            await chrome.storage.local.remove('currentSummary');
            summaryState = {
                status: 'none',
                summary: null,
                url: null,
                title: null
            };
        }

        sendResponse({ success: true });

    } catch (error) {
        console.error('保存内容时出错:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

// 处理悬浮球请求
async function handleFloatingBallRequest(request, sendResponse) {
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
            finalContent = finalContent.trim() + '\n' + settings.summaryTag;
        }

        // 直接发送到服务器
        const response = await sendToTarget(finalContent, settings, request.url, 0, request.title, false);
        
        if (response.ok) {
            // 发送成功响应
            sendResponse({ success: true });
        } else {
            throw new Error(`服务器返回状态码: ${response.status}`);
        }
    } catch (error) {
        console.error('处理悬浮球请求时出错:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 右键菜单
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

// 发送内容到Blinko
async function sendToBlinko(content, url, title) {
    try {
        // 获取设置
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;
        
        if (!settings || !settings.targetUrl || !settings.authKey) {
            throw new Error('请先配置Blinko API URL和认证密钥');
        }

        // 构建请求URL，确保不重复添加v1
        const baseUrl = settings.targetUrl.replace(/\/+$/, ''); // 移除末尾的斜杠
        const requestUrl = `${baseUrl}/note/upsert`;

        // 发送请求
        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': settings.authKey
            },
            body: JSON.stringify({
                content: content
            })
        });

        if (!response.ok) {
            throw new Error(`保存失败: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('发送到Blinko失败:', error);
        return { success: false, error: error.message };
    }
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
                chrome.action.setIcon({
                    path: "images/icon128_success.png"
                });
                setTimeout(() => {
                    chrome.action.setIcon({
                        path: "images/icon128.png"
                    });
                }, 1000);
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
});

// 更新扩展图标为成功状态
function showSuccessIcon() {
    chrome.action.setIcon({
        path: {
            "16": "images/icon16_success.png",
            "32": "images/icon32_success.png",
            "48": "images/icon48_success.png",
            "128": "images/icon128_success.png"
        }
    });

    // 3秒后恢复原始图标
    setTimeout(() => {
        chrome.action.setIcon({
            path: {
                "16": "images/icon16.png",
                "32": "images/icon32.png",
                "48": "images/icon48.png",
                "128": "images/icon128.png"
            }
        });
    }, 3000);
}

// 获取完整的API URL
function getFullApiUrl(baseUrl, endpoint) {
    try {
        const url = new URL(baseUrl);
        const pathParts = url.pathname.split('/');
        const v1Index = pathParts.indexOf('v1');
        if (v1Index === -1) {
            throw new Error('URL格式不正确，需要包含/v1路径');
        }
        return url.origin + pathParts.slice(0, v1Index + 1).join('/') + endpoint;
    } catch (error) {
        console.error('解析URL时出错:', error);
        throw new Error('URL格式不正确: ' + error.message);
    }
}

async function sendToTarget(content, settings, url, retryCount = 0, title = '', isSelection = false) {
    if (!settings.targetUrl) {
        throw new Error('请设置目标URL');
    }

    if (!settings.authKey) {
        throw new Error('请设置认证密钥');
    }

    try {
        let finalContent = content;
        // 根据不同场景和设置决定是否添加URL
        if (url && ((isSelection && settings.includeSelectionUrl) || (!isSelection && settings.includeSummaryUrl))) {
            finalContent = `${finalContent}\n\n原文链接：[${title || url}](${url})`;
        }

        // 获取完整的API URL
        const fullUrl = getFullApiUrl(settings.targetUrl, '/note/upsert');

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': settings.authKey
            },
            body: JSON.stringify({
                content: finalContent
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
    } catch (error) {
        if (retryCount < 3) {
            return sendToTarget(content, settings, url, retryCount + 1, title, isSelection);
        }
        throw new Error(`发送失败: ${error.message}`);
    }
}