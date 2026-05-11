import { sendTelegramMessage } from "@/lib/telegram";
import { NextResponse } from "next/server";

export async function GET() {
  await sendTelegramMessage("Test message from app");

  return NextResponse.json({
    success: true,
  });
}
