// Extract page content
function extractPageContent() {
    try {
        // Get the body text
        const content = document.body.innerText
            .replace(/[\n\r]+/g, '\n') // Replace multiple newline characters with a single one
            .replace(/\s+/g, ' ') // Replace multiple spaces with a single one
            .replace(/Original article link：\[.*?\]\(.*?\)/g, '') // Remove any existing original article links
            .trim(); // Remove leading and trailing whitespace

        return content;
    } catch (error) {
        console.error('Error extracting content:', error);
        throw error;
    }
}

// Get page metadata
function getPageMetadata() {
    return {
        url: window.location.href,
        title: document.title
    };
}

// Get selected text
function getSelectedText() {
    return window.getSelection().toString();
}

// Get image information
function getImageInfo(img) {
    return {
        src: img.src,
        alt: img.alt || '',
        title: img.title || ''
    };
}

// Expose functions to the global scope
window.extractPageContent = extractPageContent;
window.getPageMetadata = getPageMetadata;
window.getSelectedText = getSelectedText;
window.getImageInfo = getImageInfo;
