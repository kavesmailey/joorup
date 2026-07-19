export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("OK");

    try {
      const update = await request.json();
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = update.message?.chat?.id;
      const userId = update.message?.from?.id;

      if (!chatId || !botToken) return new Response("OK");

      const msg = update.message;
      let reply = "✅ دریافت شد!";

      if (msg.voice) {
        reply = "🎤 Voice دریافت شد.\n\n(در نسخه بعدی transcript + ثبت خودکار)";
      } else if (msg.text) {
        const text = msg.text.trim();
        const lower = text.toLowerCase();

        if (lower.includes("فروش") || lower.includes("sell")) {
          reply = `💰 فروش ثبت شد:\n${text}\n\n(به صندوق اضافه شد)`;
        } else if (lower.includes("هزینه") || lower.includes("cost") || lower.includes("خرج")) {
          reply = `📉 هزینه ثبت شد:\n${text}`;
        } else if (lower.includes("مشتری") || lower.includes("customer")) {
          reply = `👤 مشتری ثبت/به‌روزرسانی شد:\n${text}`;
        } else {
          reply = `📝 پیام: "${text}"\n\nمثال‌های سریع:\nفروش ۱۲۰۰۰۰۰ گوشی\nهزینه ۳۰۰۰۰۰ اجاره\nمشتری علی - شماره ۰۹۱۲...`;
        }
      }

      // ارسال پاسخ
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: reply })
      });

      console.log(`Operation for user ${userId}: ${msg.text || 'Voice'}`);

      return new Response("OK");
    } catch (e) {
      console.error(e);
      return new Response("Error", { status: 500 });
    }
  }
};
