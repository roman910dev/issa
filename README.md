# ISSA

A small, local reading surface for iOS Speak Screen. Paste text or Markdown, scroll to the block you want to hear, and use the usual two-finger Speak Screen gesture. Tap a block to choose it exactly. Blocks before the selected one become invisible and are hidden from the accessibility tree; scrolling back reveals them.

## Run

```sh
pnpm install
pnpm dev
```

Open the printed network URL in Safari on your iPhone while both devices are on the same network. Text is saved in that browser's local storage. There is no server-side text storage.

## Install on iPhone and use offline

Run `pnpm build` and publish the `dist/` folder on an HTTPS static host. In Safari on your iPhone, open that URL, then choose **Share → Add to Home Screen → Open as Web App → Add**. Open ISSA once while online so it can cache its pages, scripts, styles, and icons. After that, it can open without a connection.

The local-network HTTP development URL does not enable the offline service worker on an iPhone; service workers require HTTPS, except on the device's own `localhost`. The installed Home Screen app has separate browser storage from Safari, so text pasted into Safari may need to be pasted again in the installed app.

## iPhone check

1. Turn on Speak Screen in iOS Accessibility settings.
2. Paste several paragraphs and tap **Start reading**.
3. Scroll until a later paragraph has the green marker. Use the two-finger gesture.
4. Confirm that speech begins at the marked block and continues forward.
5. Stop speech, scroll back, and confirm earlier blocks reappear and can be read.

Speak Screen's exact behavior with dynamic web content needs verification on a physical iPhone. Markdown is rendered with Marked and sanitized with DOMPurify, including tables, links, lists, and fenced code. Mermaid and syntax highlighting are not included yet. The app bundles its libraries locally, with no CDN dependency.
