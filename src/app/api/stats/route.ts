import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get today's start (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's wind articles count
    const todayWindArticles = await prisma.article.count({
      where: {
        createdAt: {
          gte: today,
        },
        category: "wind",
      },
    });

    // Get today's water articles count
    const todayWaterArticles = await prisma.article.count({
      where: {
        createdAt: {
          gte: today,
        },
        category: "water",
      },
    });

    // Get total sent articles
    const sentArticles = await prisma.article.count({
      where: {
        sent: true,
      },
    });

    // Get last run from settings
    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    return NextResponse.json({
      success: true,
      windArticlesToday: todayWindArticles,
      waterArticlesToday: todayWaterArticles,
      sentToTelegram: sentArticles,
      lastRun: settings?.lastRun ? settings.lastRun.toISOString() : null,
    });
  } catch (error) {
    console.error("Stats error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stats",
      },
      { status: 500 },
    );
  }
}
