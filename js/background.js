import { initializeContextMenu, handleContextMenuClick } from './contextMenu.js';
import { handleContentRequest, handleSaveSummary, handleFloatingBallRequest } from './messageHandler.js';
import { getSummaryState, clearSummaryState } from './summaryState.js';

// 初始化右键菜单
initializeContextMenu();

// 监听来自popup和content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContent") {
        handleContentRequest(request);
        return true;  // 保持消息通道开放
    }
    
    if (request.action === "saveSummary") {
        handleSaveSummary(request).then(sendResponse);
        return true;  // 保持消息通道开放
    }

    if (request.action === "processAndSendContent") {
        handleFloatingBallRequest(request).then(sendResponse);
        return true;  // 保持消息通道开放
    }

    if (request.action === "getSummaryState") {
        // 返回全局状态
        sendResponse(getSummaryState());
        return true;
    }

    if (request.action === "clearSummary") {
        clearSummaryState().then(() => {
            sendResponse({ success: true });
        });
        return true;
    }
});

// 监听右键菜单点击
chrome.contextMenus.onClicked.addListener(handleContextMenuClick); 