import { Bot } from 'grammy';

export default {
  async fetch(request, env) {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return new Response("TOKEN_MISSING", { status: 500 });
    }

    const bot = new Bot(botToken);

    // Commandها
    bot.command("start", (ctx) => ctx.reply("سلام! جووراپ بات فعاله ✅\n\nفروش، هزینه، یا مشتری ثبت کن."));

    // پیام‌های معمولی + Voice
    bot.on("message", async (ctx) => {
      const msg = ctx.message;
      if (msg.voice) {
        await ctx.reply("🎤 Voice دریافت شد. به زودی transcript + ثبت هوشمند می‌شه!");
      } else if (msg.text) {
        await ctx.reply(`✅ دریافت شد: ${msg.text}\n\n(در نسخه بعدی به DB ذخیره می‌شه)`);
      }
    });

    try {
      const update = await request.json();
      await bot.handleUpdate(update);
      return new Response("OK");
    } catch (error) {
      console.error(error);
      return new Response("Error", { status: 500 });
    }
  }
};
