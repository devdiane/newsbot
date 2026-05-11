import { fetchAllNews } from "@/lib/fetchNews";
import { filterAndDedupe, NewsItem } from "@/lib/filterNews";
import { sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const items = await fetchAllNews();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "No items returned from RSS feeds" },
        { status: 500 },
      );
    }

    const filtered = filterAndDedupe(items as NewsItem[]);

    const results = [];
    for (const item of filtered) {
      if (item.title && item.link) {
        await sendTelegramMessage(`${item.title}\n${item.link}`);
        results.push(item.title);
      }
    }

    return NextResponse.json({
      success: true,
      totalArticles: items.length,
      filteredCount: filtered.length,
      sentCount: results.length,
      count: filtered.length,
      articles: results,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
