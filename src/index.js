export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("OK");

    try {
      const update = await request.json();
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = update.message?.chat?.id;

      if (!chatId || !botToken) return new Response("OK");

      const msg = update.message;
      let reply = "✅ جووراپ بات فعاله!";

      if (msg.voice) {
        reply = "🎤 Voice دریافت شد. (transcript به زودی)";
      } else if (msg.text) {
        const text = msg.text.trim();
        const lower = text.toLowerCase();

        if (lower.includes("فروش") || lower.includes("sell")) {
          reply = `💰 فروش ثبت شد:\n${text}`;
        } else if (lower.includes("هزینه") || lower.includes("cost") || lower.includes("خرج")) {
          reply = `📉 هزینه ثبت شد:\n${text}`;
        } else if (lower.includes("گزارش") || lower === "/report") {
          reply = "📊 گزارش: فعلاً ۰ تراکنش (ذخیره واقعی به زودی اضافه می‌شه)";
        } else {
          reply = `📝 دریافت شد: "${text}"\n\nمثال: فروش ۱۲۰۰۰۰۰ گوشی`;
        }
      }

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: reply })
      });

      return new Response("OK");
    } catch (e) {
      console.error("Error:", e);
      return new Response("Error", { status: 500 });
    }
  }
};
