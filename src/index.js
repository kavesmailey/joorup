export default {
  async fetch(request, env) {
    console.log("Request received");

    if (request.method !== "POST") {
      console.log("Not POST");
      return new Response("OK");
    }

    try {
      const update = await request.json();
      console.log("Update received:", JSON.stringify(update).substring(0, 200)); // log کوتاه

      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;

      if (!botToken) {
        console.error("TOKEN_MISSING in env");
        return new Response("OK");
      }

      if (!chatId) {
        console.error("No chatId in update");
        return new Response("OK");
      }

      const msg = update.message || (update.callback_query && update.callback_query.message);
      let replyText = "✅ جووراپ بات فعاله!";

      if (msg?.voice) {
        replyText = "🎤 Voice دریافت شد!";
      } else if (msg?.text) {
        const text = msg.text.trim();
        const lower = text.toLowerCase();

        if (lower.includes("فروش") || lower.includes("sell")) {
          replyText = `💰 فروش ثبت شد!\n${text}`;
        } else if (lower.includes("هزینه") || lower.includes("cost") || lower.includes("خرج")) {
          replyText = `📉 هزینه ثبت شد!\n${text}`;
        } else if (lower.includes("گزارش") || lower === "/report") {
          replyText = "📊 گزارش: در حال توسعه...";
        } else {
          replyText = `📝 دریافت شد: "${text}"`;
        }
      }

      // ارسال با retry ساده
      const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText
        })
      });

      const sendResult = await sendRes.json();
      console.log("Send result:", sendResult.ok ? "Success" : "Failed");

      return new Response("OK");
    } catch (error) {
      console.error("Critical error:", error);
      return new Response("OK");
    }
  }
};
