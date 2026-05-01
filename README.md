# Gmail Sender Search Chrome Extension

A Chrome extension that adds a one-click search button next to sender email addresses in Gmail, allowing you to quickly search for all emails from that sender in your inbox.

## Features

- 🔍 One-click search for emails from any sender
- Automatically detects sender email addresses in Gmail
- Searches with the query: `from:email@example.com in:inbox`
- Works with Gmail's dynamic content loading
- Clean, unobtrusive UI that matches Gmail's design
- Dark theme support

## Installation

### Method 1: Load as Unpacked Extension (Recommended for development)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension should now appear in your extensions list

### Method 2: Install from Chrome Web Store (Coming Soon)

_This extension will be published to the Chrome Web Store soon._

## Usage

1. Open Gmail in your browser
2. Look for the 🔍 search button that appears next to sender email addresses
3. Click the search button to instantly search for all emails from that sender in your inbox
4. The search will use Gmail's built-in search with the query: `from:sender@email.com in:inbox`

## How It Works

The extension:

- Injects a content script into Gmail pages
- Detects sender email addresses in various Gmail UI elements
- Adds a small search button next to each detected email address
- When clicked, the button triggers a Gmail search with the appropriate `from:` query

## Files

- `manifest.json` - Extension configuration
- `content.js` - Main content script that adds search functionality
- `styles.css` - Styling for the search buttons
- `icon*.png` - Extension icons (16x16, 48x48, 128x128)

## Development

To modify or extend this extension:

1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Test your changes in Gmail

## Browser Compatibility

- Chrome (Manifest V3)
- Edge (Chromium-based)
- Other Chromium-based browsers

## Privacy

This extension:

- Only runs on Gmail pages
- Does not collect or transmit any data
- All functionality is performed locally in your browser
- No external servers or APIs are used

## License

MIT License - feel free to modify and distribute as needed.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
