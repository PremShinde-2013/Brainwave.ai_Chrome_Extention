// Get the full API URL
function getFullApiUrl(baseUrl, endpoint, provider = 'openai') {
    try {
        const url = new URL(baseUrl);

        if (provider === 'openai') {
            if (baseUrl.includes('/v1/chat/completions')) return baseUrl;
            if (baseUrl.includes('/v1')) return baseUrl.split('/v1')[0] + '/v1' + endpoint;
            return baseUrl.replace(/\/+$/, '') + '/v1' + endpoint;
        } else if (provider === 'openrouter' || provider === 'deepseek') {
            if (baseUrl.includes('/v1/chat/completions')) return baseUrl;
            return baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
        } else {
            throw new Error(`Unknown provider: ${provider}`);
        }
    } catch (error) {
        console.error('Error parsing URL:', error);
        throw new Error('Invalid URL format: ' + error.message);
    }
}

// Get summary from model
async function getSummaryFromModel(content, settings) {
    try {
        const prompt = settings.promptTemplate.replace('{content}', content);
        const provider = settings.provider || 'openai';
        const fullUrl = getFullApiUrl(settings.modelUrl, '/chat/completions', provider);

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
        };

        if (provider === 'openrouter' || provider === 'deepseek') {
            if (settings.referer) headers['HTTP-Referer'] = settings.referer;
            if (settings.title) headers['X-Title'] = settings.title;
        }

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: settings.modelName, // e.g., "deepseek/deepseek-r1:free"
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: settings.temperature
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API request failed: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('API returned an invalid response');
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error getting summary:', error);
        throw error;
    }
}

// Upload image file to Blinko
async function uploadFile(file, settings) {
    try {
        if (!settings.targetUrl || !settings.authKey) {
            throw new Error('Please configure Blinko API URL and authentication key first');
        }

        const baseUrl = settings.targetUrl.replace(/\/v1\/*$/, '');
        const uploadUrl = `${baseUrl}/file/upload`;

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': settings.authKey
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Image upload failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.status !== 200 || !data.filePath) {
            throw new Error('Image upload response format error');
        }

        return {
            name: data.fileName,
            path: data.filePath,
            size: data.size,
            type: data.type
        };
    } catch (error) {
        console.error('Image upload failed:', error);
        throw error;
    }
}

// Send content to Blinko
async function sendToBlinko(content, url, title, imageAttachment = null, type = 'summary') {
    try {
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings;

        if (!settings || !settings.targetUrl || !settings.authKey) {
            throw new Error('Please configure Blinko API URL and authentication key first');
        }

        const baseUrl = settings.targetUrl.replace(/\/+$/, '');
        const requestUrl = `${baseUrl}/note/upsert`;

        let finalContent = content;

        if (url && (
            (type === 'summary' && settings.includeSummaryUrl) ||
            (type === 'extract' && settings.includeSelectionUrl) ||
            (type === 'image' && settings.includeImageUrl) ||
            (type === 'quickNote' && settings.includeQuickNoteUrl &&
                !finalContent.includes(`Original link: [${title || url}](${url})`))
        )) {
            if (type === 'image') {
                finalContent = finalContent || '';
                finalContent = `${finalContent}${finalContent ? '\n\n' : ''}> Source: [${title || url}](${url})`;
            } else {
                finalContent = `${finalContent}\n\nOriginal link: [${title || url}](${url})`;
            }
        }

        if (type === 'summary' && settings.summaryTag) {
            finalContent = `${finalContent}\n\n${settings.summaryTag}`;
        } else if (type === 'extract' && settings.extractTag) {
            finalContent = `${finalContent}\n\n${settings.extractTag}`;
        } else if (type === 'image' && settings.imageTag) {
            finalContent = finalContent ? `${finalContent}\n\n${settings.imageTag}` : settings.imageTag;
        }

        const requestBody = {
            content: finalContent,
            type: 0
        };

        if (Array.isArray(imageAttachment)) {
            requestBody.attachments = imageAttachment;
        } else if (imageAttachment) {
            requestBody.attachments = [imageAttachment];
        }

        const response = await fetch(requestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': settings.authKey
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${data.message || response.statusText}`);
        }

        return { success: true, data };
    } catch (error) {
        console.error('Failed to send to Blinko:', error);
        return { success: false, error: error.message };
    }
}

export {
    getFullApiUrl,
    getSummaryFromModel,
    sendToBlinko,
    uploadFile
};
