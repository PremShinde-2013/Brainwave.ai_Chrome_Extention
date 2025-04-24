import { showStatus } from './ui.js';

// Default settings
const defaultSettings = {
    targetUrl: '',
    authKey: '',
    modelUrl: '',
    apiKey: '',
    modelName: 'gpt-4o-mini',
    temperature: 0.5,
    promptTemplate: `Please summarize the content of the provided web page with a clear structure, emphasizing key points without missing any important information.

Requirements:
1. **Summary Structure:**
    *   First line: use '# Title' format for a concise main heading.
    *   One-line summary: Provide a short, precise sentence that captures the core idea of the page.
    *   Summarize the main sections in the order they appear on the page.

2. **Highlight Key Points:** Identify and highlight the critical information, topics, main arguments, and conclusions. Include important data or findings if present.

3. **Don't Miss Anything Important:** Ensure that all crucial aspects of the content are covered.

Note:
*   The summary should be neutral and objective without personal opinions or emotions.
*   Use concise and clear language. Avoid overly technical or obscure words. Write the summary in English.
*   Keep the summary appropriately sized—comprehensive but not overly lengthy.
*   Do not add another summary at the end—use the one-line summary as the ending.

Web page content: {content}`,
    includeSummaryUrl: true,     // Include URL in summary notes
    includeSelectionUrl: true,   // Include URL in selected text saving
    includeImageUrl: true,       // Include URL in image saving
    includeQuickNoteUrl: false,  // Include URL in quick notes
    summaryTag: '#Web/Summary',  // Tag for webpage summaries
    selectionTag: '#Web/Excerpt',// Tag for selected text
    imageTag: '#Web/Image',      // Tag for saved images
    extractTag: '#Web/Clipping', // Tag for clipped content
    enableFloatingBall: true,    // Enable floating button
    jinaApiKey: '',              // Jina Reader API Key
    useJinaApiKey: false,        // Use Jina API Key for acceleration
    saveWebImages: false         // Save image links from web pages
};

// Load saved settings
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get('settings');
        let settings = result.settings;

        // If no saved settings, use defaults
        if (!settings) {
            settings = { ...defaultSettings };
        } else {
            // Apply default values for missing required fields only
            settings.modelName = settings.modelName || defaultSettings.modelName;
            settings.temperature = settings.temperature || defaultSettings.temperature;
            settings.promptTemplate = settings.promptTemplate || defaultSettings.promptTemplate;
            settings.includeSummaryUrl = settings.includeSummaryUrl !== undefined ? settings.includeSummaryUrl : defaultSettings.includeSummaryUrl;
            settings.includeSelectionUrl = settings.includeSelectionUrl !== undefined ? settings.includeSelectionUrl : defaultSettings.includeSelectionUrl;
            settings.includeImageUrl = settings.includeImageUrl !== undefined ? settings.includeImageUrl : defaultSettings.includeImageUrl;
            settings.includeQuickNoteUrl = settings.includeQuickNoteUrl !== undefined ? settings.includeQuickNoteUrl : defaultSettings.includeQuickNoteUrl;
            settings.enableFloatingBall = settings.enableFloatingBall !== undefined ? settings.enableFloatingBall : defaultSettings.enableFloatingBall;
            settings.jinaApiKey = settings.jinaApiKey || defaultSettings.jinaApiKey;
            settings.useJinaApiKey = settings.useJinaApiKey !== undefined ? settings.useJinaApiKey : defaultSettings.useJinaApiKey;
            settings.saveWebImages = settings.saveWebImages !== undefined ? settings.saveWebImages : defaultSettings.saveWebImages;
            settings.extractTag = settings.extractTag !== undefined ? settings.extractTag : defaultSettings.extractTag;
        }

        console.log('Loaded settings:', settings);

        // Update the UI accordingly
        const elements = {
            'targetUrl': settings.targetUrl || '',
            'authKey': settings.authKey || '',
            'modelUrl': settings.modelUrl || '',
            'apiKey': settings.apiKey || '',
            'modelName': settings.modelName || '',
            'temperature': settings.temperature || '0.7',
            'promptTemplate': settings.promptTemplate || '',
            'includeSummaryUrl': settings.includeSummaryUrl !== false,
            'includeSelectionUrl': settings.includeSelectionUrl !== false,
            'includeImageUrl': settings.includeImageUrl !== false,
            'includeQuickNoteUrl': settings.includeQuickNoteUrl !== false,
            'summaryTag': settings.summaryTag || '',
            'selectionTag': settings.selectionTag || '',
            'imageTag': settings.imageTag || '',
            'enableFloatingBall': settings.enableFloatingBall !== false,
            'jinaApiKey': settings.jinaApiKey || '',
            'useJinaApiKey': settings.useJinaApiKey !== false,
            'saveWebImages': settings.saveWebImages !== false,
            'extractTag': settings.extractTag || ''
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        return settings;
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatus('Failed to load settings: ' + error.message, 'error');
        return defaultSettings;
    }
}

// Save settings
async function saveSettings() {
    try {
        const settings = {
            targetUrl: document.getElementById('targetUrl').value.trim(),
            authKey: document.getElementById('authKey').value.trim(),
            modelUrl: document.getElementById('modelUrl').value.trim(),
            apiKey: document.getElementById('apiKey').value.trim(),
            modelName: document.getElementById('modelName').value.trim() || defaultSettings.modelName,
            temperature: parseFloat(document.getElementById('temperature').value) || defaultSettings.temperature,
            promptTemplate: document.getElementById('promptTemplate').value || defaultSettings.promptTemplate,
            includeSummaryUrl: document.getElementById('includeSummaryUrl').checked,
            includeSelectionUrl: document.getElementById('includeSelectionUrl').checked,
            includeImageUrl: document.getElementById('includeImageUrl').checked,
            includeQuickNoteUrl: document.getElementById('includeQuickNoteUrl').checked,
            summaryTag: document.getElementById('summaryTag').value,
            selectionTag: document.getElementById('selectionTag').value,
            imageTag: document.getElementById('imageTag').value,
            enableFloatingBall: document.getElementById('enableFloatingBall').checked,
            jinaApiKey: document.getElementById('jinaApiKey').value.trim(),
            useJinaApiKey: document.getElementById('useJinaApiKey').checked,
            saveWebImages: document.getElementById('saveWebImages').checked,
            extractTag: document.getElementById('extractTag').value
        };

        await chrome.storage.sync.set({ settings });

        // Notify all open tabs to update floating ball state
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'updateFloatingBallState',
                    enabled: settings.enableFloatingBall
                });
            } catch (error) {
                console.log('Tab not ready:', tab.id);
            }
        }

        console.log('Settings saved:', settings);
        showStatus('Settings saved successfully', 'success');
        return settings;
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Failed to save settings: ' + error.message, 'error');
        throw error;
    }
}

// Reset settings to default
async function resetSettings() {
    try {
        await chrome.storage.sync.remove('settings');
        const settings = { ...defaultSettings };

        document.getElementById('targetUrl').value = settings.targetUrl;
        document.getElementById('authKey').value = settings.authKey;
        document.getElementById('modelUrl').value = settings.modelUrl;
        document.getElementById('apiKey').value = settings.apiKey;
        document.getElementById('modelName').value = settings.modelName;
        document.getElementById('temperature').value = settings.temperature;
        document.getElementById('promptTemplate').value = settings.promptTemplate;
        document.getElementById('includeSummaryUrl').checked = settings.includeSummaryUrl;
        document.getElementById('includeSelectionUrl').checked = settings.includeSelectionUrl;
        document.getElementById('includeImageUrl').checked = settings.includeImageUrl;
        document.getElementById('summaryTag').value = settings.summaryTag;
        document.getElementById('selectionTag').value = settings.selectionTag;
        document.getElementById('imageTag').value = settings.imageTag;
        document.getElementById('enableFloatingBall').checked = settings.enableFloatingBall;
        document.getElementById('jinaApiKey').value = settings.jinaApiKey;
        document.getElementById('useJinaApiKey').checked = settings.useJinaApiKey;
        document.getElementById('saveWebImages').checked = settings.saveWebImages;
        document.getElementById('extractTag').value = settings.extractTag;

        console.log('Settings reset to default:', settings);
        showStatus('Settings reset to default', 'success');
    } catch (error) {
        console.error('Error resetting settings:', error);
        showStatus('Failed to reset settings: ' + error.message, 'error');
    }
}
// Fetch AI configuration from Blinko
async function fetchAiConfig() {
    try {
        const targetUrl = document.getElementById('targetUrl').value.trim();
        const authKey = document.getElementById('authKey').value.trim();

        if (!targetUrl || !authKey) {
            showStatus('Please enter the Blinko API URL and authentication key first', 'error');
            return;
        }

        // Build request URL, make sure not to add 'v1' repeatedly
        const baseUrl = targetUrl.replace(/\/+$/, ''); // Remove trailing slashes
        const configUrl = `${baseUrl}/config/list`;

        showStatus('Fetching configuration...', 'loading');

        const response = await fetch(configUrl, {
            method: 'GET',
            headers: {
                'Authorization': authKey
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch configuration: ${response.status}`);
        }

        const config = await response.json();

        if (config.aiModelProvider === 'OpenAI') {
            // Update the UI
            document.getElementById('modelUrl').value = config.aiApiEndpoint || '';
            document.getElementById('apiKey').value = config.aiApiKey || '';
            document.getElementById('modelName').value = config.aiModel || '';

            showStatus('AI configuration fetched successfully', 'success');
        } else {
            showStatus('Unsupported AI provider: ' + config.aiModelProvider, 'error');
        }
    } catch (error) {
        console.error('Error while fetching AI configuration:', error);
        showStatus('Failed to fetch AI configuration: ' + error.message, 'error');
    }
}

export {
    defaultSettings,
    loadSettings,
    saveSettings,
    resetSettings,
    fetchAiConfig
};
