import { fetchAllNews } from "@/lib/fetchNews";
import { categorizeArticle, filterAndDedupe, NewsItem } from "@/lib/filterNews";
import { prisma } from "@/lib/prisma";
import { saveArticles } from "@/lib/saveArticles";
import { sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const items = await fetchAllNews();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        {
          success: false,
          error: "No items returned from RSS feeds",
        },
        { status: 500 },
      );
    }

    const filtered = filterAndDedupe(items as NewsItem[]);

    // Count wind vs water articles before saving
    let windCount = 0;
    let waterCount = 0;
    for (const item of filtered) {
      const category = categorizeArticle(item);
      if (category === "wind") {
        windCount++;
      } else {
        waterCount++;
      }
    }

    // Save to DB
    await saveArticles(filtered);

    // Get unsent articles
    const unsent = await prisma.article.findMany({
      where: {
        sent: false,
      },
    });

    const results = [];

    // Send + mark sent
    for (const article of unsent) {
      if (article.title && article.link) {
        await sendTelegramMessage(`📰 ${article.title}\n${article.link}`);

        await prisma.article.update({
          where: {
            id: article.id,
          },
          data: {
            sent: true,
          },
        });

        results.push(article.title);
      }
    }

    // Save last run timestamp to settings
    const now = new Date();
    await prisma.settings.upsert({
      where: { id: "default" },
      update: { lastRun: now, updatedAt: now },
      create: { id: "default", lastRun: now, updatedAt: now },
    });

    return NextResponse.json({
      success: true,
      totalArticles: items.length,
      filteredCount: filtered.length,
      windCount: windCount,
      waterCount: waterCount,
      sentCount: results.length,
      articles: results,
    });
  } catch (error) {
    console.error("Fetch error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
