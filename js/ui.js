/// Display status message
function showStatus(message, type = 'loading') {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        statusDiv.style.display = 'block';
    }
}

// Hide status message
function hideStatus() {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
}

// Show success icon
async function showSuccessIcon() {
    try {
        await chrome.action.setIcon({
            path: chrome.runtime.getURL("images/icon128_success.png")
        });

        // Restore original icon after 3 seconds
        setTimeout(async () => {
            try {
                await chrome.action.setIcon({
                    path: chrome.runtime.getURL("images/icon128.png")
                });
            } catch (error) {
                console.error('Failed to restore icon:', error);
            }
        }, 3000);
    } catch (error) {
        console.error('Failed to set success icon:', error);
    }
}

// Clear summary preview content
function clearSummaryPreview() {
    const summaryPreview = document.getElementById('summaryPreview');
    const summaryText = document.getElementById('summaryText');
    const pageTitle = document.getElementById('pageTitle');
    const pageUrl = document.getElementById('pageUrl');

    if (summaryPreview) {
        summaryPreview.style.display = 'none';
    }
    if (summaryText) {
        summaryText.value = '';
    }
    if (pageTitle) {
        pageTitle.textContent = '';
    }
    if (pageUrl) {
        pageUrl.textContent = '';
    }
}

// Show summary preview
async function showSummaryPreview(tempData) {
    if (tempData && tempData.summary) {
        document.getElementById('summaryPreview').style.display = 'block';
        document.getElementById('summaryText').value = tempData.summary;
        if (tempData.title) {
            document.getElementById('pageTitle').textContent = tempData.title;
        }
        if (tempData.url) {
            document.getElementById('pageUrl').textContent = tempData.url;
        }
    }
}

// Initialize UI event listeners
function initializeUIListeners() {
    // Tab switching
    document.querySelectorAll('.tablinks').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');

            // Hide all tab contents first
            document.querySelectorAll('.tabcontent').forEach(content => {
                content.style.display = 'none';
            });

            // Remove active class from all tab buttons
            document.querySelectorAll('.tablinks').forEach(btn => {
                btn.classList.remove('active');
            });

            // Show the selected tab content and activate the corresponding tab
            document.getElementById(tabName).style.display = 'block';
            e.target.classList.add('active');
        });
    });

    // Toggle secret key visibility
    document.querySelectorAll('.toggle-visibility').forEach(button => {
        button.addEventListener('click', function () {
            const input = this.previousElementSibling;
            if (input) {
                input.classList.toggle('visible');
                // Update button icon
                this.textContent = input.classList.contains('visible') ? '🔒' : '👁️';
            }
        });
    });
}

export {
    showStatus,
    hideStatus,
    showSuccessIcon,
    clearSummaryPreview,
    showSummaryPreview,
    initializeUIListeners
};
