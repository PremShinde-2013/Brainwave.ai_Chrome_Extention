import { extractPageContent, getPageMetadata } from './contentExtractor.js';

// Handle messages from the popup
function handlePopupMessages(request, sender, sendResponse) {
    if (request.action === "getContent") {
        try {
            const content = extractPageContent();
            const metadata = getPageMetadata();
            console.log('Extracted content length:', content.length);
            sendResponse({
                success: true,
                content: content,
                url: metadata.url,
                title: metadata.title
            });
        } catch (error) {
            console.error('Error extracting content:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
}

// Handle messages from the background script
function handleBackgroundMessages(request, sender, sendResponse) {
    // Currently, there are no specific background messages to handle
    // Keep this function for future expansion
}

// Initialize message listeners
function initializeMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Handle different messages based on the sender
        if (sender.id === chrome.runtime.id) {
            if (sender.tab) {
                // Messages from other content scripts
                handleContentScriptMessages(request, sender, sendResponse);
            } else {
                // Messages from the popup or background
                handlePopupMessages(request, sender, sendResponse);
            }
        }
        return true; // Keep the message channel open
    });
}

// Handle messages from other content scripts
function handleContentScriptMessages(request, sender, sendResponse) {
    // Currently, there are no specific content script messages to handle
    // Keep this function for future expansion
}

export {
    initializeMessageListeners,
    handlePopupMessages,
    handleBackgroundMessages,
    handleContentScriptMessages
};
