// ذخیره ساده (در memory - بعداً KV/Telegram Cloud)
const userData = new Map();

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("OK");

    try {
      const update = await request.json();
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = update.message?.chat?.id;
      const userId = update.message?.from?.id?.toString();

      if (!chatId || !botToken) return new Response("OK");

      const msg = update.message;
      let reply = "✅ دریافت شد!";

      let data = userData.get(userId) || { sales: [], costs: [], lastReport: null };

      if (msg.voice) {
        reply = "🎤 Voice دریافت شد. (transcript + ثبت به زودی)";
      } else if (msg.text) {
        const text = msg.text.trim();
        const lower = text.toLowerCase();

        if (lower.includes("فروش") || lower.includes("sell")) {
          data.sales.push(text);
          reply = `💰 فروش ثبت شد!\n${text}\n\nمجموع فروش: ${data.sales.length} مورد`;
        } else if (lower.includes("هزینه") || lower.includes("cost") || lower.includes("خرج")) {
          data.costs.push(text);
          reply = `📉 هزینه ثبت شد!\n${text}`;
        } else if (lower.includes("گزارش") || lower === "/report") {
          reply = `📊 گزارش شما:\nفروش: ${data.sales.length} مورد\nهزینه: ${data.costs.length} مورد`;
        } else {
          reply = `📝 "${text}" ثبت شد.\n\n/report برای گزارش`;
        }
      }

      userData.set(userId, data);

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: reply })
      });

      return new Response("OK");
    } catch (e) {
      console.error(e);
      return new Response("OK");
    }
  }
};
