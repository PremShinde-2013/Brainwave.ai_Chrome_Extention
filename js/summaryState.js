/// Store global summary state
let summaryState = {
    status: 'none',
    summary: null,
    url: null,
    title: null
};

// Get the current summary state
function getSummaryState() {
    return summaryState;
}

// Update the summary state
function updateSummaryState(newState) {
    summaryState = { ...summaryState, ...newState };
    return summaryState;
}

// Clear the summary state
async function clearSummaryState() {
    summaryState = {
        status: 'none',
        summary: null,
        url: null,
        title: null
    };
    // Also clear the stored content
    await chrome.storage.local.remove('currentSummary');
    return summaryState;
}

// Save the summary to local storage
async function saveSummaryToStorage(summary, url, title) {
    await chrome.storage.local.set({
        currentSummary: {
            summary,
            url,
            title,
            timestamp: Date.now()
        }
    });
}

// Load the summary from local storage
async function loadSummaryFromStorage() {
    const result = await chrome.storage.local.get('currentSummary');
    return result.currentSummary;
}

export {
    getSummaryState,
    updateSummaryState,
    clearSummaryState,
    saveSummaryToStorage,
    loadSummaryFromStorage
};
