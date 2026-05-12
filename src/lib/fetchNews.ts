import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  customFields: {
    item: ["content:encoded", "description"],
  },
});

interface NewsItem {
  title?: string;
  link?: string;
  content?: string;
  pubDate?: string;
  source?: string;
}

// Stable RSS sources
const RSS_SOURCES = [
  {
    id: "inquirer",
    name: "Inquirer",
    url: "https://www.inquirer.net/feed",
  },
  {
    id: "philstar",
    name: "Philstar",
    url: "https://www.philstar.com/rss/headlines",
  },
  {
    id: "businessworld",
    name: "BusinessWorld",
    url: "https://www.bworldonline.com/feed/",
  },
];

// Dashboard display
export const CONNECTED_SOURCES = [
  {
    id: "inquirer",
    name: "Inquirer",
    status: "connected",
  },
  {
    id: "philstar",
    name: "Philstar",
    status: "connected",
  },
  {
    id: "businessworld",
    name: "BusinessWorld",
    status: "connected",
  },

  // monitored agencies/topics
  {
    id: "doe",
    name: "DOE",
    status: "monitored",
  },
  {
    id: "denr",
    name: "DENR",
    status: "monitored",
  },
  {
    id: "wind",
    name: "Wind Projects",
    status: "monitored",
  },
  {
    id: "water",
    name: "Water Updates",
    status: "monitored",
  },
];

// Keywords for filtering
export const KEYWORDS = [
  // water
  "water",
  "watershed",
  "reservoir",
  "flood",
  "rain",
  "dam",
  "water district",

  // environment
  "environment",
  "climate",
  "denr",

  // energy
  "doe",
  "energy",
  "renewable",
  "renewable energy",
  "electricity",
  "power",
  "grid",

  // wind
  "wind",
  "wind farm",
  "wind turbine",
  "offshore wind",
  "onshore wind",

  // other renewable
  "solar",
  "hydro",
  "geothermal",
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry fetch helper
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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",

          Accept:
            "application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8",

          "Accept-Language": "en-US,en;q=0.9",
        },

        cache: "no-store",
        redirect: "follow",
      });

      console.log(`[${url}] Status: ${res.status}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();

      // Validate RSS/XML
      if (
        !text ||
        text.length < 50 ||
        (!text.includes("<rss") && !text.includes("<feed"))
      ) {
        console.log(`[${url}] Invalid response preview:`, text.slice(0, 200));

        throw new Error("Invalid RSS/XML response");
      }

      return text;
    } catch (err) {
      lastError = err;

      console.warn(`[${url}] Retry ${i + 1} failed:`, err);

      await delay(1000 * (i + 1));
    }
  }

  console.error(`[${url}] Failed after retries:`, lastError);

  return null;
}

// Fetch RSS news
async function fetchRSSNews(
  source: (typeof RSS_SOURCES)[0],
): Promise<NewsItem[]> {
  try {
    const content = await fetchWithRetry(source.url);

    if (!content) {
      return [];
    }

    // Detect blocked HTML pages
    if (
      content.includes("<html") ||
      content.includes("Cloudflare") ||
      content.includes("Access Denied")
    ) {
      console.warn(`[${source.name}] HTML/block response detected`);

      return [];
    }

    const feed = await parser.parseString(content);

    if (!feed?.items?.length) {
      console.warn(`[${source.name}] No items parsed`);

      return [];
    }

    const items: NewsItem[] = feed.items.map((item) => ({
      title: item.title,
      link: item.link,

      content: item.contentSnippet || item.content || item.description,

      pubDate: item.pubDate,
      source: source.name,
    }));

    console.log(`[${source.name}] Added ${items.length} items`);

    return items;
  } catch (err) {
    console.error(`[${source.name}] Parse error:`, err);

    return [];
  }
}

// Keyword matcher
export function matchesKeywords(article: NewsItem): boolean {
  const text = `
    ${article.title || ""}
    ${article.content || ""}
  `.toLowerCase();

  return KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

// Main fetcher
export async function fetchAllNews(): Promise<NewsItem[]> {
  try {
    const results = await Promise.all(
      RSS_SOURCES.map((source) => fetchRSSNews(source)),
    );

    const allResults = results.flat();

    console.log(`[fetchAllNews] Total: ${allResults.length} articles`);

    return allResults;
  } catch (err) {
    console.error("[fetchAllNews] Error:", err);

    return [];
  }
}

// Backward compatibility
export async function fetchNews() {
  return fetchAllNews();
}
