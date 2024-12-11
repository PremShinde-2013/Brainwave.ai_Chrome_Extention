# Blinko Chrome Extension 🚀

[中文](README_CN.md)

A Chrome extension for Blinko that uses AI to automatically extract and summarize web content. Supports custom summary templates and can save content to a specified Blinko server.

Original Project: [Blinko](https://github.com/blinko-space/blinko) 🔗

## ✨ Features

- 🤖 One-click web content extraction and summarization, save to Blinko
- 🎯 Customizable AI model and parameters
- 📝 Configurable summary prompt templates
- 🔗 Optional inclusion of source URLs
- ✂️ Right-click menu to send selected text to Blinko
- 📌️ Right-click to save web images to Blinko
- 📌 Quick note feature for instant thoughts capture
- 🏷️ Custom tags for summaries, selections, and images
- 💾 Temporary content storage to prevent loss on accidental closure
- 🎨 Modern UI design for smooth operation
- 🔔 Smart notification system for timely processing results

## 🔧 Installation

1. Download the extension source code
2. Open Chrome browser and go to extensions page (chrome://extensions/)
3. Enable "Developer mode" in the top right
4. Click "Load unpacked extension"
5. Select the extension directory

## 📖 User Guide

### ⚙️ Basic Configuration

Before first use, configure the following in the extension settings:

1. **Blinko API Configuration** 🎯
   - API URL: Fill up to /v1 (e.g., https://your-domain/api/v1)
   - Auth Key: Authentication key for accessing Blinko API
   - One-click AI config: Click "Get AI Config from Blinko" to auto-fetch AI settings

2. **AI Model Configuration** 🤖
   - Model URL: AI service API address (fill up to /v1)
   - API Key: Key for accessing AI service
   - Model Name: AI model to use (default: gpt-4o-mini)
   - Temperature: Controls output randomness (default: 0.5)

### 🚀 Usage

#### Summarize Entire Page 📄

1. Click the extension icon on the page you want to summarize
2. Click "Extract and Summarize Page Content"
3. Wait for AI to generate summary
4. Review and edit the summary content
5. Click "Edit and Save" to send to target server
6. You'll receive a system notification when summary is complete

#### Quick Notes ✏️

1. Click the extension icon
2. Enter content in the quick note box
3. Click "Send" to save to Blinko

#### Summarize Selected Text ✂️

1. Select text on the webpage
2. Right-click and choose "Send to Blinko Notes"
3. Content will be automatically sent to target server

#### Save Web Images 🖼️

1. Right-click on any web image
2. Select "Save Image to Blinko"
3. Image link will be saved in Markdown format
4. Option to include original page link

### 🛠️ Custom Settings

#### Prompt Template 📝

Customize summary prompt template using `{content}` as placeholder for web content. Default template provides structured summary format including:
- Title and topic overview
- Core content summary
- Key information extraction
- One-sentence summary

#### Tag Settings 🏷️

- **Summary Tag**: Default tag for page summaries (e.g., #web/summary)
- **Selection Tag**: Default tag for selected text (e.g., #web/excerpt)
- **Image Tag**: Default tag for saved images (e.g., #web/image)

#### URL Include Options 🔗

Configure whether to include source URLs for page summaries, text selections, and image saves. When enabled, links are added in Markdown format.

## ❗ Troubleshooting

1. **Cannot Extract Content** 🚫
   - Ensure page is fully loaded
   - Check for necessary permissions
   - Look for errors in console

2. **AI Service Not Responding** 🤖
   - Verify API key is correct
   - Check model URL accessibility
   - Confirm API usage limits

3. **Save Failed** ❌
   - Confirm target URL is correct
   - Verify auth key is valid
   - Check network connection

## 🔄 Changelog

### v1.5.0
- ✨ Added right-click save web images feature
- 🔔 Enhanced notification system for summary completion
- 💾 Improved content persistence storage
- 🎨 Enhanced UI interaction experience
- 🛠️ Fixed summary content save and cancel functionality
- 🐛 Fixed multiple stability issues

### v1.2.0
- ✨ Optimized URL configuration, now only need to fill up to /v1
- 🔄 Added support for auto-fetching AI config from Blinko
- 🎨 Improved settings interface prompts
- 🛠️ Optimized URL handling logic
- 🐛 Enhanced configuration process UX
- 🎈 Added floating ball feature for one-click web summary upload

### v1.1.0
- ✨ Added quick note feature
- 🔄 Optimized temporary content storage
- 🎨 New modern UI design
- 🏷️ Added custom tag support
- 🐛 Fixed multiple known issues

### v1.0.0
- 🚀 Initial release
- 📄 Web content summarization
- ✂️ Text selection save
- ⚙️ Custom settings support
