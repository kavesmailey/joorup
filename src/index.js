// Simple in-memory storage (برای شروع - بعداً Telegram Cloud)
const userData = new Map(); // در production از KV یا D1 استفاده می‌کنیم

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

      if (msg.voice) {
        reply = "🎤 Voice دریافت شد.\n\nبه زودی transcript هوشمند + ثبت.";
      } else if (msg.text) {
        const text = msg.text.trim();
        const lower = text.toLowerCase();

        let data = userData.get(userId) || { sales: 0, costs: 0, transactions: [] };

        if (lower.includes("فروش") || lower.includes("sell")) {
          data.sales += 1; // بعداً مبلغ واقعی parse می‌کنیم
          data.transactions.push({type: "فروش", text, time: new Date().toISOString()});
          reply = `💰 فروش ثبت شد!\n${text}\n\nمجموع فروش امروز: ${data.sales} مورد`;
        } else if (lower.includes("هزینه") || lower.includes("cost") || lower.includes("خرج")) {
          data.costs += 1;
          data.transactions.push({type: "هزینه", text, time: new Date().toISOString()});
          reply = `📉 هزینه ثبت شد!\n${text}`;
        } else if (lower === "/report" || lower.includes("گزارش")) {
          reply = `📊 گزارش لحظه‌ای:\nفروش: ${data.sales} مورد\nهزینه: ${data.costs} مورد\n\nتراکنش‌ها: ${data.transactions.length} مورد`;
        } else {
          reply = `📝 "${text}" دریافت شد.\n\n/commands: /report`;
        }

        userData.set(userId, data);
      }

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: reply })
      });

      return new Response("OK");
    } catch (e) {
      console.error(e);
      return new Response("Error", { status: 500 });
    }
  }
};
