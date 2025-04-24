import { initializeContextMenu, handleContextMenuClick } from './contextMenu.js';
import { handleContentRequest, handleSaveSummary, handleFloatingBallRequest } from './messageHandler.js';
import { getSummaryState, clearSummaryState } from './summaryState.js';

// Initialize right-click context menu
initializeContextMenu();

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getContent") {
        // Handle request immediately without needing to keep the message channel open
        handleContentRequest(request);
        sendResponse({ received: true });
        return false;
    }

    if (request.action === "saveSummary") {
        // Handle and return response immediately
        handleSaveSummary(request).then(response => {
            try {
                chrome.runtime.sendMessage({
                    action: 'saveSummaryResponse',
                    response: response
                }).catch(() => {
                    // Ignore error; popup may have been closed
                });
            } catch (error) {
                console.log('Popup might be closed');
            }
        });
        // Send initial response
        sendResponse({ success: true });
        return false;
    }

    if (request.action === "processAndSendContent") {
        // Send immediate response indicating processing
        sendResponse({ processing: true });

        // Asynchronously handle the request
        handleFloatingBallRequest(request).then(response => {
            // Try to update floating ball state
            if (sender.tab && sender.tab.id) {
                try {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: 'updateFloatingBallState',
                        success: response.success,
                        error: response.error
                    }).catch(() => {
                        console.log('Unable to update floating ball state');
                    });
                } catch (error) {
                    console.log('Failed to send state update message');
                }
            }
        }).catch(error => {
            console.error('Failed to process floating ball request:', error);
            // Attempt to update floating ball state with failure
            if (sender.tab && sender.tab.id) {
                try {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: 'updateFloatingBallState',
                        success: false,
                        error: error.message || 'Request processing failed'
                    }).catch(() => {
                        console.log('Unable to update floating ball state');
                    });
                } catch (error) {
                    console.log('Failed to send state update message');
                }
            }
        });

        return true; // Keep message channel open
    }

    if (request.action === "showNotification") {
        // Show a system notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('images/icon128.png'),
            title: request.title || 'Notification',
            message: request.message || '',
            priority: 2
        });
        sendResponse({ received: true });
        return false;
    }

    if (request.action === "getSummaryState") {
        // Send synchronous response with summary state
        sendResponse(getSummaryState());
        return false;
    }

    if (request.action === "clearSummary") {
        // Send response immediately to avoid message channel closure
        clearSummaryState().then(() => {
            try {
                chrome.runtime.sendMessage({
                    action: 'clearSummaryResponse',
                    success: true
                }).catch(() => {
                    // Ignore error; popup may have been closed
                });
            } catch (error) {
                console.log('Popup might be closed');
            }
        });
        sendResponse({ processing: true });
        return false;
    }

    return false;  // By default, do not keep message channel open
});

// Listen for context menu click events
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Listen for notification click events
chrome.notifications.onClicked.addListener(async (notificationId) => {
    try {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            // Set flags on notification click
            await chrome.storage.local.set({
                notificationClicked: true,
                notificationTabId: tab.id
            });
            // Clear the clicked notification
            chrome.notifications.clear(notificationId);
        }
    } catch (error) {
        console.error('Failed to handle notification click:', error);
    }
});
