export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("OK");

    try {
      const update = await request.json();
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = update.message?.chat?.id;

      if (!chatId || !botToken) return new Response("OK");

      const msg = update.message;
      let reply = "✅ دریافت شد!";

      if (msg.voice) {
        reply = "🎤 Voice دریافت شد. (transcript + AI parse به زودی)";
      } else if (msg.text) {
        const text = msg.text.trim();

        // Parse هوشمندتر (کلمات کلیدی + الگو)
        let type = "unknown";
        if (/فروش|sell|فروخت|فروشم/i.test(text)) type = "فروش";
        else if (/هزینه|cost|خرج|خرید|پرداخت|اجاره/i.test(text)) type = "هزینه";
        else if (/مشتری|customer|کلاینت/i.test(text)) type = "مشتری";

        if (type !== "unknown") {
          reply = `✅ ${type} ثبت شد!\n${text}`;
        } else {
          reply = `📝 "${text}" دریافت شد.\n\nمثال: فروش ۱۲۰۰۰۰۰ گوشی\nهزینه ۳۰۰۰۰۰ اجاره`;
        }
      }

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
