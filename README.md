# Gmail Sender Search Chrome Extension

A Chrome extension that adds search and filter shortcuts next to senders in the Gmail message list.

## Features

- One-click inbox search in the current Gmail account
- Open Gmail's filter criteria with the sender already filled in
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
2. Click the magnifying glass next to a sender to search your inbox with `from:sender@email.com in:inbox`.
3. Click the funnel (**Create Filter for Sender**) to open Gmail's search options with **From** filled in. Review the criteria, then use Gmail's **Create filter** buttons to choose actions and save the filter.

For a conversation that lists multiple senders, the shortcuts use the first sender address in the row.

## How It Works

The extension:

- Injects a content script into Gmail pages
- Validates sender addresses from the message list
- Reuses the same controls when Gmail updates a conversation row
- Opens Gmail's native search and filter controls in the current account

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

Run the regression tests with Node.js 22.13 or later. The test dependencies are only needed for development.

```sh
npm ci
npm test
```

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
