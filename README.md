# ISSA

A small, local reading surface for iOS Speak Screen. Paste text or Markdown, scroll to the block you want to hear, and use the usual two-finger Speak Screen gesture. Tap a block to choose it exactly. Blocks before the selected one become invisible and are hidden from the accessibility tree; scrolling back reveals them.

## Run

```sh
npm run dev
```

Open the printed network URL in Safari on your iPhone while both devices are on the same network. Text is saved in that browser's local storage. There is no server-side text storage.

## iPhone check

1. Turn on Speak Screen in iOS Accessibility settings.
2. Paste several paragraphs and tap **Start reading**.
3. Scroll until a later paragraph has the green marker. Use the two-finger gesture.
4. Confirm that speech begins at the marked block and continues forward.
5. Stop speech, scroll back, and confirm earlier blocks reappear and can be read.

Speak Screen's exact behavior with dynamic web content needs verification on a physical iPhone. Markdown support covers common headings, paragraphs, lists, quotes, fenced code, emphasis, inline code, and HTTP(S) links. Raw HTML is displayed as text.
