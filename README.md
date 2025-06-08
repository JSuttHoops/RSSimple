# RSSimple

Minimalist Electron RSS reader with glassmorphic design.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the app:
   ```bash
   npm start
   ```

## Features

- Click **Upload OPML** to choose a `feeds.opml` file and import RSS feed URLs. The OPML file is copied to a local `feeds` folder and loaded on start.
- Fetch latest articles for each feed and show preview images when available.
- Simple list view of articles with a modal reader.
- Local JSON storage of feeds and articles so your subscriptions persist between runs.

