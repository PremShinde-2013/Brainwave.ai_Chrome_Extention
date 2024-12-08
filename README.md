# Blinko Chrome Extension 🚀

[中文文档](README_CN.md)

A Chrome extension for Blinko that automatically extracts and summarizes web content using AI. Supports custom summary templates and saves content to specified Blinko servers.

Original Project: [Blinko](https://github.com/blinko-space/blinko) 🔗

## ✨ Features

- 🤖 One-click extraction and summarization of current webpage content to Blinko
- 🎯 Customizable AI models and parameters
- 📝 Configurable summary prompt templates
- 🔗 Optional inclusion of source links
- ✂️ Right-click menu to send selected text to Blinko
- 📌 Quick note feature for instant thoughts
- 🏷️ Custom tags for summaries and selections
- 💾 Temporary content saving to prevent accidental loss
- 🎨 Modern UI design for smooth operation

## 🔧 Installation

1. Download the source code of this extension
2. Open Chrome browser and go to the extensions management page (chrome://extensions/)
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the directory of this extension

## 📖 User Guide

### ⚙️ Basic Configuration

Before first use, configure the following information on the extension's settings page:

1. **Blinko API Configuration** 🎯
   - API URL: Fill in /v1 (e.g., https://your-domain/api/v1)
   - Authentication Key: The key required to access the Blinko API
   - One-click AI Configuration: Click the "Get AI Configuration from Blinko" button to automatically retrieve AI-related settings

2. **AI Model Configuration** 🤖
   - Model URL: The API address of the AI service (fill in /v1)
   - API Key: The key required to access the AI service
   - Model Name: The AI model to use (default: gpt-4o-mini)
   - Temperature Parameter: Controls the randomness of the output (default: 0.5)

### 🚀 Usage

#### Summarize Entire Webpage 📄

1. Click the extension icon on the webpage you want to summarize
2. Click the "Extract" button
3. Wait for the AI to generate the summary
4. Review the summary content and make edits if necessary
5. Click "Save" to send the summary to the target server

#### Quick Note ✏️

1. Click the extension icon
2. Enter content in the quick note box
3. Click "Send" to save to Blinko

#### Summarize Selected Text ✂️

1. Select text on the webpage
2. Right-click and choose "Send to Blinko Note"
3. The content will be automatically sent to the target server

### 🛠️ Custom Settings

#### Prompt Templates 📝

You can customize the summary prompt templates using `{content}` as a placeholder for the webpage content. The default template provides a structured summary format, including:
- Title and theme overview
- Core content summary
- Key information extraction
- One-sentence summary

#### Tag Settings 🏷️

- **Summary Tags**: Add default tags to webpage summaries (e.g., #reading/webpage)
- **Selection Tags**: Add default tags to selected text (e.g., #excerpt)

#### URL Inclusion Options 🔗

You can set whether to include the source link in webpage summaries and selections. When enabled, the link will be added to the content in Markdown format.

## ❗ Troubleshooting

1. **Unable to Extract Content** 🚫
   - Ensure the webpage is fully loaded
   - Check if necessary permissions are granted
   - Look for error messages in the console

2. **AI Service Unresponsive** 🤖
   - Verify the API key is correct
   - Check if the model URL is accessible
   - Confirm if the API usage limit is exceeded

3. **Save Failed** ❌
   - Ensure the target URL is correct
   - Verify the authentication key is valid
   - Check the network connection status

## 🔄 Changelog

### v1.2.0
- ✨ Optimized URL configuration, now only need to fill in /v1
- 🔄 Support for automatically retrieving AI configuration from Blinko
- 🎨 Improved user prompts in the settings interface
- 🛠️ Optimized URL handling logic
- 🐛 Enhanced user experience in the configuration process
- 🎈 Added floating action button for one-click webpage summarization

### v1.1.0
- ✨ Added quick note feature
- 🔄 Optimized temporary saving mechanism for summary content
- 🎨 Brand new modern UI design
- 🏷️ Support for custom tags
- 🐛 Fixed multiple known issues

### v1.0.0
- 🚀 Initial release
- 📄 Support for webpage content summarization
- ✂️ Support for saving selected text
- ⚙️ Support for custom settings