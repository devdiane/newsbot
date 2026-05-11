import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: ["content:encoded", "description"],
  },
});

// Multi-source RSS feeds with fallback
// Using more reliable Philippine news RSS sources
const SOURCES = [
  "https://www.inquirer.net/feed",
  "https://news.abs-cbn.com/rss/icons/feedTopStories.xml",
  "https://mb.com.ph/feed/rss.xml",
];

// Track connected sources for dashboard display
export const CONNECTED_SOURCES = [
  { id: "inquirer", name: "Inquirer", status: "connected" },
  { id: "abs-cbn", name: "ABS-CBN", status: "connected" },
  { id: "mb", name: "Manila Bulletin", status: "connected" },
  { id: "doe", name: "DOE", status: "target" },
  { id: "denr", name: "DENR", status: "target" },
];

interface RSSItem {
  title?: string;
  link?: string;
  content?: string;
  pubDate?: string;
}

async function fetchWithRetry(
  url: string,
  retries = 3,
): Promise<string | null> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept:
            "application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      console.log(`[${url}] Status:`, res.status);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();

      if (text && text.trim().length > 100) {
        return text;
      }

      throw new Error("Empty RSS response");
    } catch (err) {
      lastError = err;
      console.warn(`[${url}] Retry ${i + 1} failed:`, err);
    }
  }

  console.error(`[${url}] Failed after retries:`, lastError);
  return null;
}

// Fetch news from a single source
async function fetchNewsFrom(url: string): Promise<RSSItem[]> {
  const content = await fetchWithRetry(url, 3);

  if (!content) {
    return [];
  }

  // HTML guard (block pages, login pages, errors)
  if (
    content.includes("<html") ||
    content.includes("<!DOCTYPE html") ||
    content.includes("Access Denied")
  ) {
    console.warn(`[${url}] Returned HTML instead of XML`);
    return [];
  }

  // Parse RSS
  const feed = await parser.parseString(content);

  if (!feed?.items?.length) {
    console.warn(`[${url}] No items parsed`);
    return [];
  }

  console.log(`[${url}] Fetched ${feed.items.length} items`);
  return feed.items as RSSItem[];
}

// Fetch from all sources with fallback
export async function fetchAllNews(): Promise<RSSItem[]> {
  const allResults: RSSItem[] = [];

  for (const url of SOURCES) {
    try {
      const items = await fetchNewsFrom(url);
      if (items.length > 0) {
        allResults.push(...items);
        console.log(`[${url}] Added ${items.length} items`);
      }
    } catch (e) {
      console.log(`[${url}] Skipped due to error:`);
    }
  }

  console.log(
    `[fetchAllNews] Total: ${allResults.length} articles from ${SOURCES.length} sources`,
  );
  return allResults;
}

// Keep backward compatibility
export async function fetchNews() {
  return fetchAllNews();
}
