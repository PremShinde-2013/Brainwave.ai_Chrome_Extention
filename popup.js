// 默认设置
const defaultSettings = {
    targetUrl: '',
    authKey: '',
    modelUrl: '',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    promptTemplate: `请你根据提供的网页内容，撰写一份结构清晰、重点突出且不遗漏重要内容的摘要。

要求：
1. **摘要结构：**  
    *   首先，第一行使用'# 标题'格式取一个简要的大标题,然后下一段简要概述网页的主题和目的。
    *   其次，按照网页内容的逻辑顺序，依次总结各个主要部分的核心内容。
    *   在总结每个部分时，请注意突出该部分的重点和关键信息。
    *   如果网页内容包含重要数据、图表或结论，请务必在摘要中体现。
2. **突出重点：**  请识别并突出显示网页中的关键信息、主题、重要论点和结论。
3. **不遗漏重要内容：**  在总结时，请确保覆盖网页的所有重要方面，避免关键信息缺失。
4. **一句话总结：**  在摘要的最后，请提供一个简洁、精炼的概括性语句，准确概括整个网页的核心内容。

请注意：
*   摘要应保持客观中立，避免掺杂个人观点或情感色彩。
*   摘要的语言应简洁明了，避免使用过于专业或晦涩的词汇。
*   摘要的长度应适中，既要全面覆盖重要内容，又要避免冗长啰嗦。

以下是网页内容：{content}`,
    includeUrl: true
};

// 临时存储键
const TEMP_STORAGE_KEY = 'tempSummaryData';

// 加载设置
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get('settings');
        let settings = result.settings;
        
        // 如果没有保存的设置，或者缺少某些设置项，使用默认值
        if (!settings) {
            settings = { ...defaultSettings };
        } else {
            // 确保所有默认设置项都存在
            for (const key in defaultSettings) {
                if (settings[key] === undefined || settings[key] === '') {
                    settings[key] = defaultSettings[key];
                }
            }
        }
        
        // 更新UI
        document.getElementById('targetUrl').value = settings.targetUrl || '';
        document.getElementById('authKey').value = settings.authKey || '';
        document.getElementById('modelUrl').value = settings.modelUrl || '';
        document.getElementById('apiKey').value = settings.apiKey || '';
        document.getElementById('modelName').value = settings.modelName || 'gpt-3.5-turbo';
        document.getElementById('temperature').value = settings.temperature || '0.7';
        document.getElementById('promptTemplate').value = settings.promptTemplate || defaultSettings.promptTemplate;
        document.getElementById('includeUrl').checked = settings.includeUrl !== false;
        
        return settings;
    } catch (error) {
        console.error('加载设置时出错:', error);
        showStatus('加载设置失败: ' + error.message, 'error');
        return defaultSettings;
    }
}

// 保存设置
async function saveSettings() {
    const settings = {
        targetUrl: document.getElementById('targetUrl').value.trim(),
        authKey: document.getElementById('authKey').value.trim(),
        modelUrl: document.getElementById('modelUrl').value.trim(),
        apiKey: document.getElementById('apiKey').value.trim(),
        modelName: document.getElementById('modelName').value.trim(),
        temperature: parseFloat(document.getElementById('temperature').value) || 0.7,
        promptTemplate: document.getElementById('promptTemplate').value.trim() || defaultSettings.promptTemplate,
        includeUrl: document.getElementById('includeUrl').checked
    };

    try {
        await chrome.storage.sync.set({ settings });
        showStatus('设置已保存', 'success');
        return settings;
    } catch (error) {
        console.error('保存设置时出错:', error);
        showStatus('保存设置失败: ' + error.message, 'error');
        throw error;
    }
}

// 重置设置
async function resetSettings() {
    try {
        await chrome.storage.sync.remove('settings');
        const settings = { ...defaultSettings };
        
        // 更新UI
        document.getElementById('targetUrl').value = settings.targetUrl;
        document.getElementById('authKey').value = settings.authKey;
        document.getElementById('modelUrl').value = settings.modelUrl;
        document.getElementById('apiKey').value = settings.apiKey;
        document.getElementById('modelName').value = settings.modelName;
        document.getElementById('temperature').value = settings.temperature;
        document.getElementById('promptTemplate').value = settings.promptTemplate;
        document.getElementById('includeUrl').checked = settings.includeUrl;
        
        showStatus('设置已重置为默认值', 'success');
    } catch (error) {
        console.error('重置设置时出错:', error);
        showStatus('重置设置失败: ' + error.message, 'error');
    }
}

// 处理标签页切换
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// 显示状态信息
function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
}

// 隐藏状态信息
function hideStatus() {
    const statusDiv = document.getElementById('status');
    statusDiv.style.display = 'none';
}

// 保存临时总结数据
function saveTempSummaryData(data) {
    chrome.storage.local.set({
        [TEMP_STORAGE_KEY]: data
    });
}

// 清除临时总结数据
function clearTempSummaryData() {
    chrome.storage.local.remove(TEMP_STORAGE_KEY);
}

// 加载临时总结数据
async function loadTempSummaryData() {
    const data = await chrome.storage.local.get(TEMP_STORAGE_KEY);
    return data[TEMP_STORAGE_KEY];
}

// 显示总结预览
function showSummaryPreview() {
    const tempData = loadTempSummaryData();
    tempData.then(data => {
        if (data) {
            document.getElementById('summaryText').value = data.summary || '';
            document.getElementById('pageUrl').textContent = data.url ? `URL: ${data.url}` : '';
            document.getElementById('pageTitle').textContent = data.title ? `标题: ${data.title}` : '';
            document.getElementById('summaryPreview').style.display = 'block';
        }
    });
}

// 隐藏总结预览
function hideSummaryPreview() {
    document.getElementById('summaryPreview').style.display = 'none';
    document.getElementById('summaryText').value = '';
    document.getElementById('pageUrl').textContent = '';
    document.getElementById('pageTitle').textContent = '';
    clearTempSummaryData();
}

// 处理总结响应
async function handleSummaryResponse(response) {
    if (response.success) {
        const tab = await getCurrentTab();
        
        // 保存临时数据，包括标题
        saveTempSummaryData({
            summary: response.summary,
            url: tab.url,
            title: tab.title || ''
        });
        
        showSummaryPreview();
        showStatus('总结完成', 'success');
    } else {
        showStatus('总结失败: ' + response.error, 'error');
    }
}

// 保存总结内容
async function saveSummary() {
    const summaryText = document.getElementById('summaryText').value;
    const tempData = await loadTempSummaryData();
    
    if (!summaryText || !tempData) {
        showStatus('没有可保存的内容', 'error');
        return;
    }

    chrome.runtime.sendMessage({
        action: 'saveSummary',
        content: summaryText,
        url: tempData.url || '',
        title: tempData.title || ''
    }, response => {
        if (response.success) {
            showStatus('保存成功', 'success');
            clearTempSummaryData();
            hideSummaryPreview();
        } else {
            showStatus('保存失败: ' + response.error, 'error');
        }
    });
}

// 获取当前标签页信息
async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', async function() {
    // 加载设置
    await loadSettings();
    
    // 加载临时总结数据
    loadTempSummaryData().then(data => {
        if (data && data.summary) {
            showSummaryPreview();
        }
    });

    // 显示主页面
    document.getElementById('main').style.display = 'block';

    // 获取当前标签页
    const tab = await getCurrentTab();

    // 保存设置按钮
    document.getElementById('saveSettings').addEventListener('click', saveSettings);

    // 重置设置按钮
    document.getElementById('resetSettings').addEventListener('click', async () => {
        if (confirm('确定要重置所有设置到默认值吗？')) {
            await resetSettings();
        }
    });

    // 提取按钮
    document.getElementById('extract').addEventListener('click', async () => {
        try {
            // 获取当前标签页
            const tab = await getCurrentTab();
            if (!tab) {
                showStatus('无法获取当前标签页', 'error');
                return;
            }

            showStatus('正在提取内容...', 'loading');
            
            // 发送消息到content script获取页面内容
            chrome.tabs.sendMessage(tab.id, { action: "getContent" }, async (response) => {
                if (chrome.runtime.lastError) {
                    showStatus('获取页面内容失败: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }

                if (!response || !response.success) {
                    showStatus('提取内容失败: ' + (response?.error || '未知错误'), 'error');
                    return;
                }

                if (!response.content || response.content.trim().length === 0) {
                    showStatus('页面内容为空', 'error');
                    return;
                }

                showStatus('正在生成总结...', 'loading');
                
                // 发送消息到background script生成总结
                chrome.runtime.sendMessage({
                    action: "getContent",
                    content: response.content,
                    url: tab.url,
                    title: tab.title
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        showStatus('生成总结失败: ' + chrome.runtime.lastError.message, 'error');
                        return;
                    }

                    handleSummaryResponse(response);
                });
            });
        } catch (error) {
            console.error('提取内容时出错:', error);
            showStatus('提取内容失败: ' + error.message, 'error');
        }
    });

    // 修改并保存按钮事件
    document.getElementById('editSummary').addEventListener('click', () => {
        const summary = document.getElementById('summaryText').value;
        const tempData = loadTempSummaryData();
        
        tempData.then(data => {
            if (!summary || !data) {
                showStatus('没有可保存的内容', 'error');
                return;
            }

            chrome.runtime.sendMessage({
                action: 'saveSummary',
                content: summary,
                url: data.url,
                title: data.title
            }, response => {
                if (response.success) {
                    showStatus('保存成功', 'success');
                    clearTempSummaryData();
                    hideSummaryPreview();
                } else {
                    showStatus('保存失败: ' + response.error, 'error');
                }
            });
        });
    });

    // 取消按钮事件
    document.getElementById('cancelEdit').addEventListener('click', () => {
        hideSummaryPreview();
        hideStatus();
    });

    // 添加显示/隐藏按钮的事件监听
    document.querySelectorAll('.toggle-visibility').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.previousElementSibling;
            input.classList.toggle('visible');
        });
    });

    // 标签切换事件
    document.querySelectorAll('.tablinks').forEach(button => {
        button.addEventListener('click', function(event) {
            openTab(event, this.dataset.tab);
        });
    });
});