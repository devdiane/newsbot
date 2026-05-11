import { categorizeArticle, NewsItem } from "./filterNews";
import { prisma } from "./prisma";

export async function saveArticles(items: NewsItem[]) {
  for (const item of items) {
    try {
      const category = categorizeArticle(item);
      await prisma.article.create({
        data: {
          title: item.title || "",
          link: item.link || "",
          category: category,
          publishedAt: item.pubDate ? new Date(item.pubDate) : null,
        },
      });
    } catch {
      // duplicate link already exists
    }
  }
}
