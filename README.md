# ISSA — iOS Speak Screen Assistant

A small web app for reading pasted text and Markdown with iOS Speak Screen. Scroll or tap to choose where speech should begin, then use Speak Screen as usual.

**[Open ISSA](https://issa.roman910.dev)**

The selected block has a green marker. Earlier blocks are hidden from view and the accessibility tree, keeping their space in the page so you can scroll back to reveal them.

## Use

1. Enable Speak Screen in your iPhone's accessibility settings.
2. Paste text or Markdown into ISSA and tap **Start reading**.
3. Scroll or tap to select a block.
4. Swipe down with two fingers from the top of the screen to start Speak Screen.

To change your starting point, stop speech, select another block, and start Speak Screen again. **Edit** returns to the source; **Start over** selects the first block and scrolls to the top. ISSA uses the system's voices and speech controls, and attempts to ignore scrolling triggered by speech itself.

## Markdown and storage

Supports headings, emphasis, lists, blockquotes, links, images, dividers, code, and horizontally scrollable tables. Leading frontmatter enclosed by `---` lines appears as literal body text between dividers, preserving line breaks and indentation. Mermaid and syntax highlighting are not supported.

Markdown is rendered with Marked and sanitized with DOMPurify. Selection works on top-level blocks: a list, table, or code block is selected as a whole.

The current source is saved in browser local storage. There is one saved document; reading position is not saved. No backend, account, or document upload is involved, though external images can make network requests. Clearing site data removes saved text and offline caches.

## Offline and Home Screen access

ISSA works offline after its first online visit has cached the app files. You can reopen it, read saved text, and paste or edit text without a connection. External images and linked pages are not cached.

To install it on your iPhone, open [issa.roman910.dev](https://issa.roman910.dev) in Safari and choose **Share → Add to Home Screen**. Open the installed app once while online so it can cache its files for offline use. If text saved in Safari does not appear in the installed app, paste it there too.

## Development

Use Node.js 24 (24.15.0 or later) and pnpm 10.33.2.

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite, or its network URL in Safari on an iPhone connected to the same network.

- `pnpm test` — run Markdown rendering and service worker tests.
- `pnpm build` — build the app and offline cache into `dist/`.
- `pnpm preview` — serve the production build locally.

To deploy your own instance, publish the entire `dist/` directory to an HTTPS static host; no application server or database is required. Offline support is enabled only in production builds. The local-network HTTP development URL does not enable it on an iPhone.

## Device verification

Automated tests cover rendered markup and simulated offline requests. Verify Speak Screen on a physical iPhone: speech should begin at the selected block, speech-driven scrolling should preserve the selection, and scrolling back should reveal earlier blocks. Also check **Edit**, **Start over**, saved text after reopening, and offline startup after installation.
