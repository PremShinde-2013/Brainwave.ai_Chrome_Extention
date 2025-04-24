import { loadSettings, saveSettings, resetSettings, fetchAiConfig } from './settings.js';
import { initializeUIListeners, showStatus, hideStatus } from './ui.js';
import { loadQuickNote, initializeQuickNoteListeners } from './quickNote.js';
import { checkSummaryState, initializeSummaryListeners, handleSummaryResponse } from './summary.js';

// Initialize internationalization
function initializeI18n() {
    // Replace all text with __MSG_ prefix
    document.querySelectorAll('*').forEach(element => {
        // Handle inner text
        if (element.childNodes && element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
            const text = element.textContent;
            if (text.includes('__MSG_')) {
                const msgName = text.match(/__MSG_(\w+)__/)[1];
                element.textContent = chrome.i18n.getMessage(msgName);
            }
        }

        // Handle placeholder attribute
        if (element.hasAttribute('placeholder')) {
            const placeholder = element.getAttribute('placeholder');
            if (placeholder.includes('__MSG_')) {
                const msgName = placeholder.match(/__MSG_(\w+)__/)[1];
                element.setAttribute('placeholder', chrome.i18n.getMessage(msgName));
            }
        }

        // Handle title attribute
        if (element.hasAttribute('title')) {
            const title = element.getAttribute('title');
            if (title.includes('__MSG_')) {
                const msgName = title.match(/__MSG_(\w+)__/)[1];
                element.setAttribute('title', chrome.i18n.getMessage(msgName));
            }
        }
    });
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', async function () {
    try {
        initializeI18n(); // Load translated text

        // Check if opened by notification click
        const result = await chrome.storage.local.get(['notificationClicked', 'notificationTabId', 'quickNote', 'quickNoteAttachments']);

        await loadSettings();           // Load user settings
        await checkSummaryState();      // Check summary state
        await loadQuickNote();          // Load quick note content

        // Determine which tab to show
        let defaultTab = 'common';
        if (result.notificationClicked) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id === result.notificationTabId) {
                await chrome.storage.local.remove(['notificationClicked', 'notificationTabId']);
                defaultTab = 'quicknote';
            }
        } else if ((result.quickNote && result.quickNote.trim()) ||
            (result.quickNoteAttachments && result.quickNoteAttachments.length > 0)) {
            defaultTab = 'quicknote';
        }

        // Hide all tab content
        document.querySelectorAll('.tabcontent').forEach(content => {
            content.style.display = 'none';
        });

        // Remove active class from all tabs
        document.querySelectorAll('.tablinks').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show the default tab and mark it active
        document.getElementById(defaultTab).style.display = 'block';
        document.querySelector(`.tablinks[data-tab="${defaultTab}"]`).classList.add('active');

        // Initialize all listeners
        initializeUIListeners();
        initializeQuickNoteListeners();
        initializeSummaryListeners();

        // Handle content extraction button
        document.getElementById('extractContent').addEventListener('click', async () => {
            try {
                showStatus(chrome.i18n.getMessage('extractingContent'), 'loading');
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) throw new Error(chrome.i18n.getMessage('cannotGetTab'));

                const response = await chrome.tabs.sendMessage(tab.id, { action: 'getContent' });

                if (!response || !response.success) {
                    throw new Error(response.error || 'Failed to get content');
                }

                await chrome.runtime.sendMessage({
                    action: 'getContent',
                    content: response.content,
                    url: response.url,
                    title: response.title,
                    isExtractOnly: true
                });

            } catch (error) {
                console.error('Failed to extract content:', error);
                showStatus(chrome.i18n.getMessage('settingsSaveError', [error.message]), 'error');
            }
        });

        // Handle save settings button
        document.getElementById('saveSettings').addEventListener('click', async () => {
            try {
                await saveSettings();
                showStatus(chrome.i18n.getMessage('settingsSaved'), 'success');
                setTimeout(hideStatus, 2000);
            } catch (error) {
                showStatus(chrome.i18n.getMessage('settingsSaveError', [error.message]), 'error');
            }
        });

        // Handle reset settings button
        document.getElementById('resetSettings').addEventListener('click', async () => {
            try {
                await resetSettings();
                showStatus(chrome.i18n.getMessage('settingsReset'), 'success');
                setTimeout(hideStatus, 2000);
            } catch (error) {
                showStatus(chrome.i18n.getMessage('settingsResetError', [error.message]), 'error');
            }
        });

        // Fetch AI config
        document.getElementById('fetchAiConfig').addEventListener('click', fetchAiConfig);

    } catch (error) {
        console.error('Initialization failed:', error);
        showStatus(chrome.i18n.getMessage('initializationError', [error.message]), 'error');
    }
});

// Listen to messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request && request.action === 'handleSummaryResponse') {
        handleSummaryResponse(request);
        sendResponse({ received: true });
    } else if (request && request.action === 'saveSummaryResponse') {
        if (request.response.success) {
            showStatus('Saved successfully', 'success');
            setTimeout(hideStatus, 2000);
        } else {
            showStatus('Save failed: ' + request.response.error, 'error');
        }
        sendResponse({ received: true });
    } else if (request && request.action === 'floatingBallResponse') {
        if (request.response.success) {
            showStatus(request.response.isExtractOnly ? 'Extraction successful' : 'Summary successful', 'success');
            setTimeout(hideStatus, 2000);
        } else {
            showStatus((request.response.isExtractOnly ? 'Extraction' : 'Summary') + ' failed: ' + request.response.error, 'error');
        }
        sendResponse({ received: true });
    } else if (request && request.action === 'clearSummaryResponse') {
        if (request.success) {
            showStatus('Cleared successfully', 'success');
            setTimeout(hideStatus, 2000);
        }
        sendResponse({ received: true });
    }
    return false; // Don't keep message channel open
});

// Notify background when popup is closed
window.addEventListener('unload', async () => {
    try {
        const summaryPreview = document.getElementById('summaryPreview');
        if (summaryPreview && summaryPreview.style.display === 'none') {
            await chrome.storage.local.remove('currentSummary');
        }

        chrome.runtime.sendMessage({ action: "popupClosed" }).catch(() => {
            // Ignore errors if popup already closed
        });
    } catch (error) {
        // Silently ignore
    }
});
