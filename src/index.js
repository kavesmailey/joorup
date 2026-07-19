export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("OK");
    }

    try {
      const update = await request.json();
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = update.message?.chat?.id;

      if (!chatId || !botToken) {
        console.error("Missing chatId or token");
        return new Response("OK");
      }

      const msg = update.message;
      let replyText = "✅ جووراپ بات (@joorupbot) فعاله!";

      if (msg.voice) {
        replyText = "🎤 Voice دریافت شد.\n\nبه زودی transcript + ثبت هوشمند.";
      } else if (msg.text) {
        const text = msg.text.trim();
        const lower = text.toLowerCase();

        if (lower.includes("فروش") || lower.includes("sell")) {
          replyText = `💰 فروش ثبت شد!\n${text}`;
        } else if (lower.includes("هزینه") || lower.includes("cost") || lower.includes("خرج")) {
          replyText = `📉 هزینه ثبت شد!\n${text}`;
        } else if (lower.includes("گزارش") || lower === "/report") {
          replyText = "📊 گزارش لحظه‌ای:\n(ذخیره واقعی به زودی)";
        } else {
          replyText = `📝 دریافت شد: "${text}"\n\nمثال: فروش ۱۲۰۰۰۰۰ گوشی`;
        }
      }

      // ارسال پیام با error handling کامل
      const sendResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          parse_mode: "HTML"
        })
      });

      const sendResult = await sendResponse.json();
      if (!sendResult.ok) {
        console.error("Telegram sendMessage failed:", sendResult);
      }

      return new Response("OK");
    } catch (error) {
      console.error("Main error:", error);
      return new Response("OK"); // همیشه 200 به Telegram برگردون تا webhook قطع نشه
    }
  }
};
