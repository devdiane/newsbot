export interface NewsItem {
  title?: string;
  link?: string;
  content?: string;
  pubDate?: string;
}

// Expanded keywords per project requirement
const KEYWORDS = [
  "water",
  "dam",
  "reservoir",
  "flood",
  "irrigation",
  "hydropower",
  "wind",
  "turbine",
  "DOE",
  "DENR",
  "LWUA",
];

// Normalize text for comparison
function normalize(text: string | undefined): string {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Check if two titles are duplicates
function isDuplicate(
  title1: string | undefined,
  title2: string | undefined,
): boolean {
  const n1 = normalize(title1);
  const n2 = normalize(title2);

  // Exact match
  if (n1 === n2 && n1.length > 0) {
    return true;
  }

  // Substring match (one contains the other)
  if (n1.length > 10 && n2.length > 10) {
    if (n1.includes(n2) || n2.includes(n1)) {
      return true;
    }
  }

  return false;
}

// Check if item matches any keyword (checks both title AND content/description)
function matchesKeywords(item: NewsItem): boolean {
  const searchText = [item.title || "", item.content || ""]
    .join(" ")
    .toLowerCase();

  for (const keyword of KEYWORDS) {
    if (searchText.includes(keyword.toLowerCase())) {
      console.log(
        `[filter] Matched keyword "${keyword}" in:`,
        item.title?.substring(0, 50),
      );
      return true;
    }
  }
  return false;
}

// Filter by keywords (checks both title AND content)
export function filterNews(items: NewsItem[]): NewsItem[] {
  return items.filter((item) => matchesKeywords(item));
}

// Filter and remove duplicates
export function filterAndDedupe(items: NewsItem[]): NewsItem[] {
  const filtered = filterNews(items);
  const seen = new Set<string>();
  const deduplicated: NewsItem[] = [];

  for (const item of filtered) {
    const key = normalize(item.title);

    // Skip if we've seen a similar title
    if (seen.has(key)) {
      continue;
    }

    // Check against all previous titles
    let isDup = false;
    for (const previouslySeen of seen) {
      if (isDuplicate(item.title, previouslySeen)) {
        isDup = true;
        break;
      }
    }

    if (!isDup && key.length > 0) {
      seen.add(key);
      deduplicated.push(item);
    }
  }

  console.log(
    `[filterAndDedupe] Input: ${items.length}, Filtered: ${filtered.length}, Output: ${deduplicated.length}`,
  );
  return deduplicated;
}
