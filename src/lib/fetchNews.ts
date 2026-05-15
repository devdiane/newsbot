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
  { id: "inquirer", name: "Inquirer", status: "connected" },
  { id: "philstar", name: "Philstar", status: "connected" },
  { id: "businessworld", name: "BusinessWorld", status: "connected" },

  { id: "doe", name: "DOE", status: "monitored" },
  { id: "denr", name: "DENR", status: "monitored" },
  { id: "wind", name: "Wind Projects", status: "monitored" },
  { id: "water", name: "Water Updates", status: "monitored" },
];

// ----------------------------
// WATER keywords
// ----------------------------
const WATER_KEYWORDS = [
  "water",
  "watershed",
  "reservoir",
  "flood",
  "rain",
  "dam",
  "water district",
];

// ----------------------------
// WIND ENERGY (PROJECT ONLY)
// ----------------------------
const WIND_PROJECT_KEYWORDS = [
  "wind farm",
  "wind energy",
  "wind power",
  "wind project",
  "wind turbine",
  "offshore wind",
  "onshore wind",
];

// ----------------------------
// GENERAL FILTER KEYWORDS
// (NO "wind" here anymore)
// ----------------------------
export const KEYWORDS = [
  // water
  ...WATER_KEYWORDS,

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

  // other renewables
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
          "User-Agent": "Mozilla/5.0",
          Accept:
            "application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cache: "no-store",
        redirect: "follow",
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();

      if (
        !text ||
        text.length < 50 ||
        (!text.includes("<rss") && !text.includes("<feed"))
      ) {
        throw new Error("Invalid RSS/XML response");
      }

      return text;
    } catch (err) {
      lastError = err;
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
    if (!content) return [];

    if (
      content.includes("<html") ||
      content.includes("Cloudflare") ||
      content.includes("Access Denied")
    ) {
      return [];
    }

    const feed = await parser.parseString(content);

    if (!feed?.items?.length) return [];

    return feed.items.map((item) => ({
      title: item.title,
      link: item.link,
      content: item.contentSnippet || item.content || item.description,
      pubDate: item.pubDate,
      source: source.name,
    }));
  } catch {
    return [];
  }
}

// Keyword matcher (GENERAL)
export function matchesKeywords(article: NewsItem): boolean {
  const text = `${article.title || ""} ${article.content || ""}`.toLowerCase();

  return KEYWORDS.some((k) => text.includes(k));
}

// WIND classification (STRICT PROJECT ONLY)
export function isWindProject(article: NewsItem): boolean {
  const text = `${article.title || ""} ${article.content || ""}`.toLowerCase();

  return WIND_PROJECT_KEYWORDS.some((k) => text.includes(k));
}

// WATER classification
export function isWater(article: NewsItem): boolean {
  const text = `${article.title || ""} ${article.content || ""}`.toLowerCase();

  return WATER_KEYWORDS.some((k) => text.includes(k));
}

// Main fetcher
export async function fetchAllNews(): Promise<NewsItem[]> {
  try {
    const results = await Promise.all(
      RSS_SOURCES.map((source) => fetchRSSNews(source)),
    );

    return results.flat();
  } catch (err) {
    console.error("[fetchAllNews] Error:", err);
    return [];
  }
}

// Backward compatibility
export async function fetchNews() {
  return fetchAllNews();
}
