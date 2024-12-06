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
});

async function handleContentRequest(request, sendResponse) {
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
        
        // 发送总结结果回popup
        chrome.runtime.sendMessage({
            action: 'handleSummaryResponse',
            success: true,
            summary: summary,
            url: request.url,
            title: request.title
        });
    } catch (error) {
        console.error('处理内容请求时出错:', error);
        chrome.runtime.sendMessage({
            action: 'handleSummaryResponse',
            success: false,
            error: error.message
        });
    }
}

async function getSummaryFromModel(content, settings) {
    try {
        const prompt = settings.promptTemplate.replace('{content}', content);
        
        const response = await fetch(settings.modelUrl, {
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
            throw new Error('API返回格式错误');
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

        // 准备最终内容
        let finalContent = request.content;

        // 如果有标签，添加到内容末尾
        if (request.tag) {
            finalContent = finalContent.trim() + '\n' + request.tag;
        }

        const response = await sendToTarget(
            finalContent,
            settings,
            request.url,
            0,
            request.title,
            false  // 这是总结笔记场景
        );

        if (response.ok) {
            showSuccessIcon();
            sendResponse({ success: true });
        } else {
            throw new Error(`服务器返回状态码: ${response.status}`);
        }
    } catch (error) {
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

// 右键菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "sendSelectedText",
        title: "发送到Blinko笔记",
        contexts: ["selection"]
    });
});

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

        const response = await fetch(settings.targetUrl, {
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