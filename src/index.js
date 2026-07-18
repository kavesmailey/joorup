import { Bot } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || '');

// Command پایه
bot.command("start", (ctx) => ctx.reply("سلام! من جووراپ بات هستم. بگو چی ثبت کنم؟ (فروش، هزینه، مشتری)"));

// Echo ساده + آماده Voice
bot.on("message", async (ctx) => {
  const msg = ctx.message;
  
  if (msg.voice || msg.video_note) {
    await ctx.reply("🎤 Voice دریافت شد! (بعداً transcript + AI parse می‌کنیم)");
    // اینجا بعداً logic Voice → Grok API اضافه می‌کنیم
  } else if (msg.text) {
    await ctx.reply(`دریافت شد: ${msg.text}\n\nثبت شد! (بعداً به DB ذخیره می‌شه)`);
  }
});

export default {
  async fetch(req, env) {
    try {
      const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
      // grammY handler
      await bot.handleUpdate(await req.json());
      return new Response("OK");
    } catch (err) {
      console.error(err);
      return new Response("Error", { status: 500 });
    }
  }
};
