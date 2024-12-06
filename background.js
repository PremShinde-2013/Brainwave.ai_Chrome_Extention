// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContent") {
        handleContentRequest(request, sendResponse);
        return true;  // 保持消息通道开放
    }
    
    if (request.action === "saveSummary") {
        chrome.storage.sync.get(null, async (settings) => {
            try {
                console.log('保存总结内容...');
                const response = await sendToTarget(request.content, settings, request.url, 0, request.title);
                console.log('目标服务器响应状态:', response.status);
                
                if (response.status === 200) {
                    console.log('保存成功完成');
                    sendResponse({ success: true });
                } else {
                    console.error('目标服务器返回非200状态码');
                    sendResponse({ 
                        success: false, 
                        error: `服务器返回状态码: ${response.status}` 
                    });
                }
            } catch (error) {
                console.error('保存过程中出错:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            }
        });
        return true;
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
        
        // 准备内容
        let finalContent = request.content;
        
        // 如果设置了包含URL，添加URL信息
        if (settings.includeUrl && request.url) {
            const urlInfo = `\n\n原文链接：[${request.title || request.url}](${request.url})\n\n`;
            finalContent = urlInfo + finalContent;
        }
        
        // 获取摘要
        const summary = await getSummaryFromModel(finalContent, settings);
        
        sendResponse({
            success: true,
            summary: summary
        });
    } catch (error) {
        console.error('处理内容请求时出错:', error);
        sendResponse({
            success: false,
            error: error.message
        });
    }
}

async function getSummaryFromModel(content, settings) {
    if (!content || !settings) {
        throw new Error('缺少必要的内容或设置');
    }
    
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
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: parseFloat(settings.temperature) || 0.7
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API错误: ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('调用API时出错:', error);
        throw new Error(`调用AI模型失败: ${error.message}`);
    }
}

// 右键菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "sendSelectedText",
        title: "保存选中文本",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "sendSelectedText") {
        chrome.storage.sync.get(null, async (settings) => {
            try {
                const response = await sendToTarget(info.selectionText, settings, tab.url, 0, tab.title);
                
                if (response.status === 200) {
                    console.log('成功发送选中文本');
                } else {
                    console.error(`发送选中文本失败，状态码: ${response.status}`);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
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

async function sendToTarget(content, settings, url, type = 0, title = '') {
    let finalContent = content;
    
    // 根据设置决定是否添加链接
    if (settings.includeUrl) {
        const urlReference = `[${title || '未知标题'}](${url})`;
        finalContent = `${content}\n\n> 来源: ${urlReference}`;
    }
    
    const response = await fetch(settings.targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.authKey}`
        },
        body: JSON.stringify({
            content: finalContent,
            url: url,
            type: type
        })
    });

    if (response.status === 200) {
        showSuccessIcon();
    }
    
    return response;
}