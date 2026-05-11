import cron from "node-cron";
import { fetchAllNews } from "./fetchNews";
import { filterAndDedupe } from "./filterNews";
import { sendTelegramMessage } from "./telegram";

export function startScheduler() {
  // Run daily at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("=== Running scheduled fetch at 9AM ===");

    try {
      const items = await fetchAllNews();
      const filtered = filterAndDedupe(items);

      console.log(`[Scheduler] Final: ${filtered.length} articles to post`);

      for (const item of filtered) {
        if (item.title && item.link) {
          await sendTelegramMessage(`${item.title}\n${item.link}`);
        }
      }

      console.log(`[Scheduler] Posted ${filtered.length} articles`);
    } catch (error) {
      console.error("[Scheduler] Error:", error);
    }
  });

  console.log("Scheduler started: runs daily at 9:00 AM");
}
