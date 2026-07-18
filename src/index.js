export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("OK");

    try {
      const update = await request.json();
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = update.message?.chat?.id;

      if (!chatId) return new Response("OK");

      let reply = "✅ دریافت شد!";

      const msg = update.message;
      let operation = "";

      if (msg.voice) {
        operation = "Voice - به زودی transcript + ثبت هوشمند";
        reply = "🎤 Voice دریافت شد. (transcript بعداً اضافه می‌شه)";
      } else if (msg.text) {
        const text = msg.text.toLowerCase();

        if (text.includes("فروش") || text.includes("sell")) {
          operation = `فروش: ${text}`;
          reply = `💰 فروش ثبت شد: ${text}`;
        } else if (text.includes("هزینه") || text.includes("cost")) {
          operation = `هزینه: ${text}`;
          reply = `📉 هزینه ثبت شد: ${text}`;
        } else {
          reply = `📝 دریافت شد: ${msg.text}\n\nبرای ثبت: "فروش ۵۰۰۰۰۰ گوشی" یا "هزینه ۲۰۰۰۰۰ اجاره"`;
        }
      }

      // ارسال پاسخ
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({chat_id: chatId, text: reply})
      });

      // بعداً اینجا Telegram Cloud یا DB ذخیره می‌کنیم
      console.log("Operation:", operation);

      return new Response("OK");
    } catch (e) {
      console.error(e);
      return new Response("Error", { status: 500 });
    }
  }
};
