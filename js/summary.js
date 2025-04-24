import { showStatus, hideStatus, showSummaryPreview, clearSummaryPreview } from './ui.js';
import { saveTempSummaryData, clearTempSummaryData } from './storage.js';

// Check summary state
async function checkSummaryState() {
    try {
        const currentSummary = await chrome.storage.local.get('currentSummary');
        if (currentSummary.currentSummary) {
            await showSummaryPreview(currentSummary.currentSummary);
        }
    } catch (error) {
        console.error('Failed to check summary state:', error);
    }
}

// Handle summary response
function handleSummaryResponse(response) {
    if (response.success) {
        showStatus(response.isExtractOnly ? 'Extraction successful' : 'Summary generated successfully', 'success');
        setTimeout(hideStatus, 2000);
        showSummaryPreview({
            summary: response.summary,
            title: response.title,
            url: response.url
        });
    } else {
        showStatus((response.isExtractOnly ? 'Extraction' : 'Summary') + ' failed: ' + response.error, 'error');
    }
}

// Initialize summary-related event listeners
function initializeSummaryListeners() {
    // Bind extract button event
    document.getElementById('extract').addEventListener('click', async () => {
        try {
            showStatus('Generating summary...', 'loading');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                throw new Error('Unable to get current tab');
            }

            // Send message to content script to get page content
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getContent'
            });

            if (!response || !response.success) {
                throw new Error(response.error || 'Failed to retrieve content');
            }

            // Send to background script for processing
            await chrome.runtime.sendMessage({
                action: 'getContent',
                content: response.content,
                url: response.url,
                title: response.title,
                isExtractOnly: false
            });

        } catch (error) {
            console.error('Failed to generate summary:', error);
            showStatus('Summary failed: ' + error.message, 'error');
        }
    });

    // Bind cancel button event
    document.getElementById('cancelEdit').addEventListener('click', async () => {
        try {
            await clearTempSummaryData();
            await chrome.storage.local.remove('currentSummary');
            clearSummaryPreview();
            showStatus('Cancelled', 'success');
            setTimeout(hideStatus, 2000);
        } catch (error) {
            console.error('Failed to cancel edit:', error);
            showStatus('Cancel failed: ' + error.message, 'error');
        }
    });

    // Bind save button event
    document.getElementById('editSummary').addEventListener('click', async () => {
        try {
            const summaryText = document.getElementById('summaryText').value;
            if (!summaryText.trim()) {
                throw new Error('Content cannot be empty');
            }

            // Get current summary data to determine if it's an extract scenario
            const currentSummary = await chrome.storage.local.get('currentSummary');
            const isExtractOnly = currentSummary.currentSummary?.isExtractOnly;
            const url = currentSummary.currentSummary?.url;
            const title = currentSummary.currentSummary?.title;

            // Send to background script for processing
            const response = await chrome.runtime.sendMessage({
                action: 'saveSummary',
                content: summaryText,
                type: isExtractOnly ? 'extract' : 'summary',
                url: url,
                title: title
            });

            if (response && response.success) {
                clearSummaryPreview();
                showStatus('Saved successfully', 'success');
                setTimeout(hideStatus, 2000);
            } else {
                throw new Error(response.error || 'Save failed');
            }
        } catch (error) {
            console.error('Failed to save summary:', error);
            showStatus('Save failed: ' + error.message, 'error');
        }
    });
}

export {
    checkSummaryState,
    handleSummaryResponse,
    initializeSummaryListeners
};
