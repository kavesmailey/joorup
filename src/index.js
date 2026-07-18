import { Bot } from 'grammy';

export default {
  async fetch(request, env) {
    const botToken = env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return new Response("❌ TOKEN_MISSING", { status: 500 });
    }

    const bot = new Bot(botToken);

    // دستورات پایه
    bot.command("start", (ctx) => {
      return ctx.reply("✅ سلام! جووراپ بات فعاله.\n\nفروش، هزینه، مشتری یا voice بفرست ثبت کنم.");
    });

    bot.command("help", (ctx) => {
      return ctx.reply("دستورات: /start\nفروش: ۵۰۰۰۰۰ تومان گوشی\nهزینه: ۲۰۰۰۰۰ اجاره");
    });

    // همه پیام‌ها
    bot.on("message", async (ctx) => {
      const msg = ctx.message;
      
      if (msg.voice || msg.video_note) {
        await ctx.reply("🎤 Voice دریافت شد! (به زودی هوشمند transcript + ثبت می‌شه)");
      } else if (msg.text) {
        await ctx.reply(`✅ دریافت شد:\n"${msg.text}"\n\nثبت موقت شد! (بعداً DB واقعی اضافه می‌کنیم)`);
      }
    });

    try {
      const update = await request.json();
      await bot.handleUpdate(update);
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Error:", error);
      return new Response("Error", { status: 500 });
    }
  }
};
