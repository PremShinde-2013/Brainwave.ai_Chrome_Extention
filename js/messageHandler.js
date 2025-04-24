import { getSummaryFromModel, sendToBlinko } from './api.js';
import { getWebContent } from './jinaReader.js';
import { getSummaryState, updateSummaryState, clearSummaryState, saveSummaryToStorage } from './summaryState.js';

// Handle content request
async function handleContentRequest(request) {
    try {
        if (!request || !request.content) {
            throw new Error('Invalid request content');
        }

        // Update status to 'processing'
        updateSummaryState({
            status: 'processing',
            url: request.url,
            title: request.title
        });

        // Get stored settings
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;

        if (!settings) {
            throw new Error('Settings not found');
        }

        let summary;
        if (request.isExtractOnly) {
            // Use Jina Reader API to extract content
            const response = await getWebContent(request.url, settings);
            if (!response.success) {
                throw new Error(response.error);
            }
            // Remove the original link if it exists
            summary = response.content.replace(/Original link：\[.*?\]\(.*?\)/g, '').trim();
        } else {
            // Check if necessary settings exist
            if (!settings.modelUrl || !settings.apiKey || !settings.modelName) {
                throw new Error('Please complete API settings first');
            }
            // Generate summary
            summary = await getSummaryFromModel(request.content, settings);
        }

        // If it's direct save mode
        if (request.directSave) {
            // Directly send to Blinko
            const response = await sendToBlinko(
                summary,
                request.url,
                request.title,
                null,
                request.isExtractOnly ? 'extract' : 'summary'
            );

            if (response.success) {
                // Show success notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('images/icon128.png'),
                    title: chrome.i18n.getMessage(request.isExtractOnly ? "notificationExtractSuccessTitle" : "notificationSummarySuccessTitle"),
                    message: chrome.i18n.getMessage(request.isExtractOnly ? "notificationExtractSuccessMessage" : "notificationSummarySuccessMessage", [request.title || chrome.i18n.getMessage("defaultPage")]),
                    priority: 2
                });
            } else {
                throw new Error(response.error || 'Save failed');
            }
        } else {
            // Existing logic to save to storage and send to popup
            // Update status to 'completed'
            updateSummaryState({
                status: 'completed',
                summary: summary,
                url: request.url,
                title: request.title,
                isExtractOnly: request.isExtractOnly
            });

            // Save to storage
            await saveSummaryToStorage(summary, request.url, request.title);

            // Also save to temporary storage for popup access
            await chrome.storage.local.set({
                currentSummary: {
                    summary: summary,
                    url: request.url,
                    title: request.title,
                    timestamp: Date.now(),
                    isExtractOnly: request.isExtractOnly
                }
            });

            // Send summary result back to popup
            try {
                await chrome.runtime.sendMessage({
                    action: 'handleSummaryResponse',
                    success: true,
                    summary: summary,
                    url: request.url,
                    title: request.title,
                    isExtractOnly: request.isExtractOnly
                }).catch(() => {
                    // Ignore error, popup may have been closed
                    // If the popup is closed, show a system notification
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: chrome.runtime.getURL('images/icon128.png'),
                        title: chrome.i18n.getMessage(request.isExtractOnly ? "notificationExtractSuccessTitle" : "notificationSummarySuccessTitle"),
                        message: chrome.i18n.getMessage(request.isExtractOnly ? "notificationExtractSuccessMessagePopup" : "notificationSummarySuccessMessagePopup", [request.title || chrome.i18n.getMessage("defaultPage")]),
                        priority: 2
                    });
                });
            } catch (error) {
                console.log('Popup may have been closed, failed to send message');
                // Show system notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('images/icon128.png'),
                    title: chrome.i18n.getMessage(request.isExtractOnly ? "notificationExtractSuccessTitle" : "notificationSummarySuccessTitle"),
                    message: chrome.i18n.getMessage(request.isExtractOnly ? "notificationExtractSuccessMessagePopup" : "notificationSummarySuccessMessagePopup", [request.title || chrome.i18n.getMessage("defaultPage")]),
                    priority: 2
                });
            }
        }

    } catch (error) {
        console.error('Error processing content request:', error);

        // Update status to 'error'
        updateSummaryState({
            status: 'error',
            error: error.message,
            url: request.url,
            title: request.title
        });

        // Try to send error message to popup
        try {
            await chrome.runtime.sendMessage({
                action: 'handleSummaryResponse',
                success: false,
                error: error.message,
                isExtractOnly: request.isExtractOnly
            }).catch(() => {
                // Ignore error, popup may have been closed
            });
        } catch (error) {
            console.log('Popup may have been closed, failed to send error message');
        }

        // Always show error notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('images/icon128.png'),
            title: chrome.i18n.getMessage(request.isExtractOnly ? "notificationExtractErrorTitle" : "notificationSummaryErrorTitle"),
            message: chrome.i18n.getMessage("notificationErrorMessage", [
                request.isExtractOnly ? chrome.i18n.getMessage("extractAction") : chrome.i18n.getMessage("summaryAction"),
                request.title || chrome.i18n.getMessage("defaultPage"),
                error.message
            ])
        });
    }
}
// Handle saving summary
async function handleSaveSummary(request) {
    try {
        if (!request || !request.content) {
            throw new Error('Invalid request content');
        }

        // Get the stored settings
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;

        if (!settings) {
            throw new Error('Settings information not found');
        }

        let finalContent;
        let url = request.url;
        let title = request.title;

        // If it's a quick note
        if (request.type === 'quickNote') {
            if (!request.content || !request.content.trim()) {
                throw new Error('Please enter note content');
            }
            finalContent = request.content.trim();

            try {
                const response = await sendToBlinko(
                    finalContent,
                    url,
                    title,
                    request.attachments,  // Pass the attachment list
                    request.type || 'summary'
                );

                if (response.success) {
                    // If it's a summary content, clear the storage
                    if (!request.type || request.type !== 'quickNote') {
                        await chrome.storage.local.remove('currentSummary');
                        await clearSummaryState();
                    }
                    return { success: true };
                } else {
                    throw new Error(`Save failed: ${response.status}`);
                }
            } catch (error) {
                throw new Error(`Failed to send content: ${error.message}`);
            }
        } else {
            // If it's summary or extracted content
            if (!request.content || !request.content.trim()) {
                throw new Error('No content to save');
            }
            finalContent = request.content.trim();

            // If URL and title are not provided, try to get from currentSummary
            if (!url || !title) {
                const currentSummary = await chrome.storage.local.get('currentSummary');
                if (currentSummary.currentSummary) {
                    url = url || currentSummary.currentSummary.url;
                    title = title || currentSummary.currentSummary.title;
                }
            }
        }

        try {
            const response = await sendToBlinko(
                finalContent,
                url,
                title,
                null,
                request.type || 'summary'
            );

            if (response.success) {
                // If it's summary content, clear the storage
                if (!request.type || request.type !== 'quickNote') {
                    await chrome.storage.local.remove('currentSummary');
                    await clearSummaryState();
                }
                return { success: true };
            } else {
                throw new Error(`Save failed: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Failed to send content: ${error.message}`);
        }
    } catch (error) {
        console.error('Error occurred while saving content:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Handle floating ball request
async function handleFloatingBallRequest(request) {
    try {
        if (!request || !request.content) {
            throw new Error('Invalid request content');
        }

        // Update status to processing
        updateSummaryState({
            status: 'processing',
            url: request.url,
            title: request.title
        });

        // Get the stored settings
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;

        if (!settings) {
            throw new Error('Settings information not found');
        }

        let summary;
        if (request.isExtractOnly) {
            // Use Jina Reader API to extract content
            const response = await getWebContent(request.url, settings);
            if (!response.success) {
                throw new Error(response.error);
            }
            // Remove any existing original link
            summary = response.content.replace(/Original article link：\[.*?\]\(.*?\)/g, '').trim();
        } else {
            // Check if necessary settings exist
            if (!settings.modelUrl || !settings.apiKey || !settings.modelName) {
                throw new Error('Please complete API setup first');
            }
            // Generate summary
            summary = await getSummaryFromModel(request.content, settings);
        }

        // Prepare final content
        let finalContent = summary;

        // Send to server (using existing retry mechanism)
        const response = await sendToBlinko(
            finalContent,
            request.url,
            request.title,
            null,
            request.isExtractOnly ? 'extract' : 'summary'
        );

        if (response.success) {
            // Update status to completed
            updateSummaryState({
                status: 'completed',
                summary: summary,
                url: request.url,
                title: request.title
            });

            // Save to storage
            await saveSummaryToStorage(summary, request.url, request.title);

            // Send success response
            try {
                await chrome.runtime.sendMessage({
                    action: 'floatingBallResponse',
                    response: {
                        success: true,
                        isExtractOnly: request.isExtractOnly
                    }
                });
            } catch (error) {
                console.log('Failed to send response, content script may have been closed');
            }

            return { success: true };
        } else {
            throw new Error(`Server returned status code: ${response.status}`);
        }
    } catch (error) {
        console.error('Error occurred while processing floating ball request:', error);

        // Update status to error
        updateSummaryState({
            status: 'error',
            error: error.message,
            url: request.url,
            title: request.title
        });

        // Send error response
        try {
            await chrome.runtime.sendMessage({
                action: 'floatingBallResponse',
                response: {
                    success: false,
                    error: error.message,
                    isExtractOnly: request.isExtractOnly
                }
            });
        } catch (error) {
            console.log('Failed to send error response, content script may have been closed');
        }

        return {
            success: false,
            error: error.message
        };
    }
}

export {
    handleContentRequest,
    handleSaveSummary,
    handleFloatingBallRequest
};
