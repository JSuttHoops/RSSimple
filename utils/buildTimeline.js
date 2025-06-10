function buildTimeline(feeds, fetchFn, opts = {}) {
  return Promise.allSettled(feeds.map(f => fetchFn(f.url || f))).then(results => {
    const timeline = [];
    const perFeed = {};
    for (let i = 0; i < results.length; i++) {
      const feed = feeds[i];
      const url = feed.url || feed;
      const res = results[i];
      if (res.status === 'fulfilled' && !res.value.error) {
        const { feedTitle, items, image } = res.value;
        if (feedTitle && !feed.title) feed.title = feedTitle;
        if (image && !feed.image) feed.image = image;
        perFeed[url] = { items, image };
        for (const item of items) {
          if (feedTitle) item.feedTitle = feedTitle;
          timeline.push(item);
        }
      }
    }
    const seen = new Set();
    const dedup = [];
    for (const item of timeline) {
      const id = item.guid || item.link;
      if (seen.has(id)) continue;
      seen.add(id);
      dedup.push(item);
    }
    dedup.sort((a, b) => {
      if (opts.weighted) {
        if (!!b.image - !!a.image) return !!b.image - !!a.image;
      }
      return new Date(b.isoDate || b.pubDate || 0) - new Date(a.isoDate || a.pubDate || 0);
    });
    return { timeline: dedup, perFeed };
  });
}

if (typeof module !== 'undefined') module.exports = buildTimeline;
if (typeof window !== 'undefined') window.buildTimeline = buildTimeline;
