// 监听来自popup的消息
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

async function handleSaveSummary(request, sendResponse) {
    try {
        // 获取存储的设置
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;
        
        if (!settings) {
            throw new Error('未找到设置信息');
        }

        console.log('handleSaveSummary - 收到的请求:', request);  
        console.log('handleSaveSummary - 当前设置:', settings);

        // 准备最终内容
        let finalContent = request.content;

        // 如果有标签，添加到内容末尾
        if (request.tag) {
            finalContent = finalContent.trim() + '\n' + request.tag;
            console.log('handleSaveSummary - 添加标签后的内容:', finalContent);  
        }

        const response = await sendToTarget(
            finalContent,
            settings,
            request.url,
            0,
            request.title
        );

        if (response.ok) {
            console.log('保存成功完成');
            showSuccessIcon();
            sendResponse({ success: true });
        } else {
            throw new Error(`服务器返回状态码: ${response.status}`);
        }
    } catch (error) {
        console.error('保存过程中出错:', error);
        sendResponse({ 
            success: false, 
            error: error.message 
        });
    }
}

async function handleContentRequest(request, sendResponse) {
    try {
        // 获取存储的设置
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;
        
        if (!settings) {
            throw new Error('未找到设置信息');
        }

        console.log('准备处理内容，当前设置:', settings);
        console.log('includeUrl设置:', settings.includeUrl);
        
        // 准备内容
        let finalContent = request.content;
        
        // 如果设置了包含URL，添加URL信息
        if (settings.includeUrl && request.url) {
            const urlInfo = `\n\n原文链接：[${request.title || request.url}](${request.url})\n\n`;
            finalContent = urlInfo + finalContent;
        }
        
        // 获取摘要
        let summary = await getSummaryFromModel(finalContent, settings);
        
        // 如果有标签，添加到摘要末尾
        if (settings.summaryTag) {
            summary = summary.trim() + '\n' + settings.summaryTag;
            console.log('handleContentRequest - 添加标签后的内容:', summary);
        }
        
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
        title: "保存选中文本到Blinko",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "sendSelectedText") {
        try {
            // 获取存储的设置
            const result = await chrome.storage.sync.get('settings');
            const settings = result.settings;
            
            if (!settings) {
                throw new Error('未找到设置信息');
            }

            // 准备最终内容
            let finalContent = info.selectionText;

            // 添加划词保存标签
            if (settings.selectionTag) {
                finalContent = finalContent.trim() + '\n' + settings.selectionTag;
            }

            const response = await sendToTarget(
                finalContent,
                settings,
                tab.url,
                0,
                tab.title
            );
            
            if (response.ok) {
                console.log('成功发送选中文本');
                showSuccessIcon();
            } else {
                throw new Error(`发送选中文本失败，状态码: ${response.status}`);
            }
        } catch (error) {
            console.error('发送选中文本时出错:', error);
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

async function sendToTarget(content, settings, url, retryCount = 0, title = '') {
    if (!settings.targetUrl) {
        throw new Error('请设置目标URL');
    }

    if (!settings.authKey) {
        throw new Error('请设置认证密钥');
    }

    console.log('sendToTarget - 初始内容:', content);  
    console.log('sendToTarget - URL和标题:', { url, title });  

    try {
        // 根据设置决定是否添加URL
        let finalContent = content;
        if (settings.includeUrl && url) {
            // 检查内容中是否已经包含标签（以#开头的行）
            const lines = finalContent.split('\n');
            const lastLine = lines[lines.length - 1];
            const hasTag = lastLine.trim().startsWith('#');
            
            console.log('sendToTarget - 内容分析:', {  
                lines,
                lastLine,
                hasTag
            });
            
            if (hasTag) {
                // 如果有标签，将URL插入到标签之前
                const tag = lines.pop(); // 移除标签
                finalContent = lines.join('\n'); // 重新组合其他内容
                finalContent = `${finalContent}\n\n原文链接：[${title || url}](${url})\n${tag}`; // 添加URL和标签
            } else {
                // 如果没有标签，直接添加URL
                finalContent = `${finalContent}\n\n原文链接：[${title || url}](${url})`;
            }
            
            console.log('sendToTarget - 添加URL后的内容:', finalContent);  
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
        console.error('发送到目标服务器失败:', error);
        
        if (retryCount < 3) {
            console.log(`重试 (${retryCount + 1}/3)...`);
            return sendToTarget(content, settings, url, retryCount + 1, title);
        }
        
        throw new Error(`发送失败: ${error.message}`);
    }
}