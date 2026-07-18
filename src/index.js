export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("OK");

    try {
      const update = await request.json();
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = update.message?.chat?.id;

      if (!chatId) return new Response("OK");

      const msg = update.message;
      let reply = "✅ دریافت شد!";
      let operationSummary = "";

      if (msg.voice) {
        operationSummary = "Voice Message";
        reply = "🎤 Voice دریافت شد.\n\nبه زودی transcript + ثبت هوشمند (مثلاً فروش X تومان)";
      } else if (msg.text) {
        const text = msg.text;

        if (text.toLowerCase().includes("فروش") || text.includes("sell")) {
          operationSummary = `فروش: ${text}`;
          reply = `💰 فروش ثبت شد!\n${text}\n\n(در نسخه بعدی به صندوق و موجودی اضافه می‌شه)`;
        } else if (text.toLowerCase().includes("هزینه") || text.includes("cost") || text.includes("خرج")) {
          operationSummary = `هزینه: ${text}`;
          reply = `📉 هزینه ثبت شد!\n${text}`;
        } else if (text.toLowerCase().includes("موجودی") || text.includes("stock")) {
          operationSummary = `موجودی: ${text}`;
          reply = `📦 موجودی ثبت/پرسیده شد: ${text}`;
        } else {
          reply = `📝 پیام دریافت شد: "${text}"\n\nمثال:\nفروش ۱۲۰۰۰۰۰ گوشی\nهزینه ۳۰۰۰۰۰ اجاره`;
        }
      }

      // ارسال پاسخ
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply
        })
      });

      // Log برای آینده (بعداً به DB واقعی)
      console.log("📊 Operation:", operationSummary, "User:", chatId);

      return new Response("OK");
    } catch (e) {
      console.error(e);
      return new Response("Error", { status: 500 });
    }
  }
};
