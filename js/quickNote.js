import { QUICK_NOTE_KEY } from './storage.js';
import { showStatus } from './ui.js';

// 保存快捷记录内容
function saveQuickNote() {
    const input = document.getElementById('quickNoteInput');
    if (input && input.value.trim()) {
        chrome.storage.local.set({ [QUICK_NOTE_KEY]: input.value });
    }
}

// 加载快捷记录内容
async function loadQuickNote() {
    try {
        const result = await chrome.storage.local.get(QUICK_NOTE_KEY);
        if (result[QUICK_NOTE_KEY]) {
            document.getElementById('quickNoteInput').value = result[QUICK_NOTE_KEY];
        }
    } catch (error) {
        console.error('加载快捷记录失败:', error);
    }
}

// 清除快捷记录内容
function clearQuickNote() {
    const input = document.getElementById('quickNoteInput');
    if (input) {
        input.value = '';
        // 清除storage中的数据
        chrome.storage.local.remove(QUICK_NOTE_KEY);
    }
}

// 发送快捷记录
async function sendQuickNote() {
    try {
        const content = document.getElementById('quickNoteInput').value;
        if (!content.trim()) {
            showStatus('���输入笔记内容', 'error');
            return;
        }

        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;
        
        if (!settings) {
            throw new Error('未找到设置信息');
        }

        // 发送到background
        chrome.runtime.sendMessage({
            action: 'saveSummary',
            type: 'quickNote',  // 标记这是快捷记录
            content: content.trim()
        }, response => {
            if (response.success) {
                showStatus('发送成功', 'success');
                // 发送成功后清除内容和存储
                clearQuickNote();
            } else {
                showStatus('发送失败: ' + response.error, 'error');
            }
        });
    } catch (error) {
        showStatus('发送失败: ' + error.message, 'error');
    }
}

// 初始化快捷记录相关的事件监听器
function initializeQuickNoteListeners() {
    document.getElementById('quickNoteInput').addEventListener('input', saveQuickNote);
    document.getElementById('sendQuickNote').addEventListener('click', sendQuickNote);
    document.getElementById('clearQuickNote').addEventListener('click', clearQuickNote);
}

export {
    saveQuickNote,
    loadQuickNote,
    clearQuickNote,
    sendQuickNote,
    initializeQuickNoteListeners
}; 