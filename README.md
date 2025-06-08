# RSSimple
Minimalist Electron RSS reader with glassmorphic design.
Now includes a sidebar feed list with filtering and editable feed names.


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
- Fallback to open-graph images if feeds don't provide one.
- Simple list view of articles with a modal reader.
- Local JSON storage of feeds and articles so your subscriptions persist between runs.
- Sidebar with feed filtering.
- Edit feed titles inline.
- Dark mode that follows system preference.
- Weighted feed sorting based on how often you open a feed.
- "All Recent" tab aggregates articles from the past week.
- On startup, feeds are prefetched concurrently and "All Recent" loads by default.
- Reader mode with adjustable font and background color.
- Settings modal for customisation.
