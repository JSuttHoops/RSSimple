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
- Categorize feeds with custom tags.
- Feed names wrap automatically so long titles aren't cut off.
- Delete feeds with the ✖ button.
- Add new feeds manually.
- Dropdown to quickly switch between feeds.
- Dark mode that follows system preference.
- Weighted feed sorting based on how often you open a feed.
- "All Recent" tab aggregates articles from the past week.
- On startup, feeds are prefetched concurrently and "All Recent" loads by default.
- Reader mode with adjustable font and background color.
- Improved reader formatting and responsive layout.
- Hidden scrollbars for a cleaner look.
- Settings modal for customisation.
- Graceful error handling when feeds fail to load.
- Mark articles as favorites with the ★ button and view them in a Favorites tab.
- Quick search box with date filtering for recent articles.
- Choose between sidebar, bottom bar or gallery layouts in settings.
- Subscribe to podcasts and browse them in the Podcast Library.
- Episode lists show cover art with Play and Download options.
- Transcripts are stored when available so episodes appear in search results.
- Organise feeds visually in the News Library with custom logos.
- AI Search powered by local Ollama models.

## AI Search Setup

1. Install [Ollama](https://ollama.ai) and make sure it is running:
   ```bash
   ollama serve
   ```
2. Pull a model with good context length. Lightweight options like `phi3` or `llama3` work well:
   ```bash
   ollama pull phi3
   ```
3. Run RSSimple with `npm start`.
4. Click the **AI Search** button next to the regular search box.
5. Pick a model from the dropdown, type your question and hit **Search**.

The app sends each article's headline and publication date along with its feed name and any categories to your selected model. The model replies with the numbers of the most relevant articles so you can open them in reader or normal view.
