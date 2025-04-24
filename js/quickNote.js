import { showStatus } from './ui.js';

// Save quick note content
function saveQuickNote() {
    const input = document.getElementById('quickNoteInput');
    if (input && input.value.trim()) {
        chrome.storage.local.set({ 'quickNote': input.value });
    }
}

// Load quick note content
async function loadQuickNote() {
    try {
        // Load text content
        const result = await chrome.storage.local.get(['quickNote', 'quickNoteAttachments']);
        if (result.quickNote) {
            document.getElementById('quickNoteInput').value = result.quickNote;
        }

        // Load and display attachments
        if (result.quickNoteAttachments && result.quickNoteAttachments.length > 0) {
            // For each attachment without a localUrl, create one from originalUrl
            const attachments = await Promise.all(result.quickNoteAttachments.map(async (attachment) => {
                if (!attachment.localUrl && attachment.originalUrl) {
                    try {
                        const response = await fetch(attachment.originalUrl);
                        const blob = await response.blob();
                        attachment.localUrl = URL.createObjectURL(blob);
                    } catch (error) {
                        console.error('Failed to create local URL:', error);
                    }
                }
                return attachment;
            }));

            // Update stored attachment info
            await chrome.storage.local.set({ 'quickNoteAttachments': attachments });

            // Display the attachments
            updateAttachmentList(attachments);
        }
    } catch (error) {
        console.error('Failed to load quick note:', error);
    }
}

// Update the attachment list display
async function updateAttachmentList(attachments) {
    const attachmentItems = document.getElementById('attachmentItems');
    const clearAttachmentsBtn = document.getElementById('clearAttachments');

    // Clear existing content
    attachmentItems.innerHTML = '';

    // Show clear button if there are attachments
    clearAttachmentsBtn.style.display = attachments.length > 0 ? 'block' : 'none';

    // Get settings
    const result = await chrome.storage.sync.get('settings');
    const settings = result.settings;

    if (!settings || !settings.targetUrl) {
        console.error('Settings not found');
        return;
    }

    // Add each attachment item
    attachments.forEach((attachment, index) => {
        const item = document.createElement('div');
        item.className = 'attachment-item';

        // Create image preview
        const img = document.createElement('img');

        // Prefer local image URL, fallback to Blinko URL
        if (attachment.localUrl) {
            img.src = attachment.localUrl;
        } else if (attachment.path) {
            const baseUrl = settings.targetUrl.replace(/\/v1\/*$/, '').replace(/\/+$/, '');
            const path = attachment.path.startsWith('/') ? attachment.path : '/' + attachment.path;
            img.src = baseUrl + path;
        }

        img.alt = attachment.name || 'Attachment image';
        img.onerror = () => {
            // If image load fails, show file name instead
            img.style.display = 'none';
            const textSpan = document.createElement('span');
            textSpan.textContent = attachment.name || 'Image';
            textSpan.style.display = 'block';
            textSpan.style.padding = '8px';
            textSpan.style.textAlign = 'center';
            item.insertBefore(textSpan, img);
        };
        item.appendChild(img);

        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-button';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove attachment';
        removeBtn.onclick = () => removeAttachment(index);
        item.appendChild(removeBtn);

        attachmentItems.appendChild(item);
    });
}

// Clear image cache
function clearImageCache(attachments) {
    if (Array.isArray(attachments)) {
        attachments.forEach(attachment => {
            if (attachment.localUrl) {
                URL.revokeObjectURL(attachment.localUrl);
            }
        });
    }
}

// Clear all attachments
async function clearAttachments() {
    try {
        const result = await chrome.storage.local.get('quickNoteAttachments');
        if (result.quickNoteAttachments) {
            clearImageCache(result.quickNoteAttachments);
        }
        await chrome.storage.local.remove('quickNoteAttachments');
        updateAttachmentList([]);
    } catch (error) {
        console.error('Failed to clear attachments:', error);
        showStatus('Failed to clear attachments: ' + error.message, 'error');
    }
}

// Remove a single attachment
async function removeAttachment(index) {
    try {
        const result = await chrome.storage.local.get('quickNoteAttachments');
        let attachments = result.quickNoteAttachments || [];

        // Revoke image cache
        if (attachments[index] && attachments[index].localUrl) {
            URL.revokeObjectURL(attachments[index].localUrl);
        }

        // Remove the attachment by index
        attachments.splice(index, 1);

        // Save the updated list
        await chrome.storage.local.set({ 'quickNoteAttachments': attachments });

        // Update display
        updateAttachmentList(attachments);
    } catch (error) {
        console.error('Failed to remove attachment:', error);
        showStatus('Failed to remove attachment: ' + error.message, 'error');
    }
}

// Clear quick note content
function clearQuickNote() {
    const input = document.getElementById('quickNoteInput');
    if (input) {
        input.value = '';
        chrome.storage.local.get(['quickNoteAttachments'], result => {
            if (result.quickNoteAttachments) {
                clearImageCache(result.quickNoteAttachments);
            }
            chrome.storage.local.remove(['quickNote', 'quickNoteAttachments']);
            updateAttachmentList([]);
        });
    }
}

// Send quick note
async function sendQuickNote() {
    try {
        const input = document.getElementById('quickNoteInput');
        const content = input.value;
        if (!content.trim()) {
            showStatus('Please enter note content', 'error');
            return;
        }

        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;

        if (!settings) {
            throw new Error('Settings not found');
        }

        showStatus('Sending...', 'loading');

        // Get active tab info
        let url = '';
        let title = '';
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                url = tab.url;
                title = tab.title;
            }
        } catch (error) {
            console.error('Failed to get tab info:', error);
        }

        // Get attachments
        const attachmentsResult = await chrome.storage.local.get(['quickNoteAttachments']);
        const attachments = attachmentsResult.quickNoteAttachments || [];

        // Send message and wait for response
        const responsePromise = new Promise((resolve) => {
            const listener = (message) => {
                if (message.action === 'saveSummaryResponse') {
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve(message.response);
                }
            };
            chrome.runtime.onMessage.addListener(listener);

            // Send request
            chrome.runtime.sendMessage({
                action: 'saveSummary',
                type: 'quickNote',
                content: content.trim(),
                url: url,
                title: title,
                attachments: attachments
            });
        });

        const response = await responsePromise;

        if (response && response.success) {
            showStatus('Sent successfully', 'success');
            clearImageCache(attachments);
            input.value = '';
            await chrome.storage.local.remove(['quickNote', 'quickNoteAttachments']);
            updateAttachmentList([]);
        } else {
            showStatus('Send failed: ' + (response?.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        showStatus('Send failed: ' + error.message, 'error');
    }
}

// Initialize event listeners for quick note
function initializeQuickNoteListeners() {
    document.getElementById('quickNoteInput').addEventListener('input', saveQuickNote);
    document.getElementById('sendQuickNote').addEventListener('click', sendQuickNote);
    document.getElementById('clearQuickNote').addEventListener('click', clearQuickNote);
    document.getElementById('clearAttachments').addEventListener('click', clearAttachments);
}

export {
    saveQuickNote,
    loadQuickNote,
    clearQuickNote,
    sendQuickNote,
    initializeQuickNoteListeners,
    updateAttachmentList,
    clearImageCache
};
