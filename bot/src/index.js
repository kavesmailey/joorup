/**
 * Joorup Bot — Phase 1
 * - ثبت متنی فروش / هزینه + تأیید با دکمه
 * - موجودی
 * - گزارش شبانه + پیشنهاد عملی فردا (Cron)
 * فقط Cloudflare Workers + KV (binding: DB)
 */

const CONFIRM_TTL_MS = 5 * 60 * 1000; // ۵ دقیقه برای تأیید

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Joorup Bot is running.", { status: 200 });
    }

    try {
      const update = await request.json();

      // پیام متنی
      if (update.message?.text) {
        await handleMessage(update.message, env);
        return new Response("OK");
      }

      // کلیک روی دکمه تأیید / لغو
      if (update.callback_query) {
        await handleCallback(update.callback_query, env);
        return new Response("OK");
      }

      return new Response("OK");
    } catch (err) {
      console.error("Error:", err);
      return new Response("Error", { status: 500 });
    }
  },

  // Cron Trigger — گزارش شبانه
  async scheduled(controller, env, ctx) {
    console.log("Nightly report cron started:", controller.cron);
    ctx.waitUntil(runNightlyReports(env));
  },
};

/* ───────────────────────────── Message Handler ───────────────────────────── */

async function handleMessage(message, env) {
  const chatId = message.chat.id;
  const text = message.text.trim();
  const firstName = message.from?.first_name || "کاربر";

  // ثبت کاربر فعال (برای گزارش شبانه)
  await ensureUser(env, chatId);

  if (text === "/start") {
    await send(env, chatId, welcomeText(firstName));
    return;
  }

  if (text === "/ping") {
    await send(env, chatId, "pong ✅\nبات پایدار است.");
    return;
  }

  if (text === "/موجودی" || text === "/balance" || text === "موجودی") {
    const bal = await getBalance(env, chatId);
    await send(env, chatId, `💰 موجودی فعلی: <b>${formatMoney(bal)}</b> تومان`);
    return;
  }

  if (text === "/گزارش" || text === "/report") {
    const report = await buildTodayReport(env, chatId);
    await send(env, chatId, report);
    return;
  }

  // تلاش برای پارس فروش / هزینه
  const parsed = parseTransaction(text);
  if (parsed) {
    // ذخیره موقت برای تأیید
    const pendingKey = `pending:${chatId}`;
    await env.DB.put(
      pendingKey,
      JSON.stringify({
        ...parsed,
        createdAt: Date.now(),
      }),
      { expirationTtl: 300 }
    );

    const typeLabel = parsed.type === "sale" ? "فروش" : "هزینه";
    const sign = parsed.type === "sale" ? "+" : "−";
    const note = parsed.note ? `\nیادداشت: ${parsed.note}` : "";

    await send(env, chatId, {
      text: `آیا این را ثبت کنم؟\n\n${typeLabel}: <b>${sign}${formatMoney(parsed.amount)}</b> تومان${note}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ تأیید", callback_data: "confirm_tx" },
            { text: "❌ لغو", callback_data: "cancel_tx" },
          ],
        ],
      },
    });
    return;
  }

  // پیام ناشناخته
  await send(
    env,
    chatId,
    `متوجه نشدم.\n\nمی‌تونی بنویسی:\n• فروش ۱۵۰۰۰۰\n• هزینه ۵۰۰۰۰ ناهار\n\nیا دستورات:\n/موجودی\n/گزارش`
  );
}

/* ───────────────────────────── Callback Handler ───────────────────────────── */

async function handleCallback(cq, env) {
  const chatId = cq.message.chat.id;
  const data = cq.data;
  const messageId = cq.message.message_id;

  // جواب سریع به تلگرام
  await answerCallback(env, cq.id);

  if (data === "cancel_tx") {
    await env.DB.delete(`pending:${chatId}`);
    await editMessage(env, chatId, messageId, "لغو شد.");
    return;
  }

  if (data === "confirm_tx") {
    const raw = await env.DB.get(`pending:${chatId}`);
    if (!raw) {
      await editMessage(env, chatId, messageId, "مهلت تأیید تمام شده. دوباره بفرست.");
      return;
    }

    const pending = JSON.parse(raw);
    if (Date.now() - pending.createdAt > CONFIRM_TTL_MS) {
      await env.DB.delete(`pending:${chatId}`);
      await editMessage(env, chatId, messageId, "مهلت تأیید تمام شده. دوباره بفرست.");
      return;
    }

    // ثبت واقعی
    await commitTransaction(env, chatId, pending);
    await env.DB.delete(`pending:${chatId}`);

    const bal = await getBalance(env, chatId);
    const typeLabel = pending.type === "sale" ? "فروش" : "هزینه";
    const sign = pending.type === "sale" ? "+" : "−";

    await editMessage(
      env,
      chatId,
      messageId,
      `✅ ثبت شد\n${typeLabel}: ${sign}${formatMoney(pending.amount)} تومان\n\n💰 موجودی: <b>${formatMoney(bal)}</b> تومان`
    );
    return;
  }
}

/* ───────────────────────────── Transaction Logic ───────────────────────────── */

function parseTransaction(text) {
  const normalized = text
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/,/g, "")
    .replace(/،/g, "")
    .trim();

  // فروش
  let m = normalized.match(/^(?:فروش|sale)\s*[:=]?\s*([\d.]+)\s*(.*)$/i);
  if (m) {
    const amount = Math.round(parseFloat(m[1]));
    if (amount > 0) return { type: "sale", amount, note: (m[2] || "").trim() };
  }

  // هزینه
  m = normalized.match(/^(?:هزینه|هزینه\s*کردم|expense)\s*[:=]?\s*([\d.]+)\s*(.*)$/i);
  if (m) {
    const amount = Math.round(parseFloat(m[1]));
    if (amount > 0) return { type: "expense", amount, note: (m[2] || "").trim() };
  }

  // فرم کوتاه +150000 یا -50000
  m = normalized.match(/^([+-])\s*([\d.]+)\s*(.*)$/);
  if (m) {
    const amount = Math.round(parseFloat(m[2]));
    if (amount > 0) {
      return {
        type: m[1] === "+" ? "sale" : "expense",
        amount,
        note: (m[3] || "").trim(),
      };
    }
  }

  return null;
}

async function commitTransaction(env, chatId, tx) {
  const today = todayKey();
  const dayKey = `day:${chatId}:${today}`;
  const balKey = `bal:${chatId}`;

  let day = JSON.parse((await env.DB.get(dayKey)) || "[]");
  day.push({
    type: tx.type,
    amount: tx.amount,
    note: tx.note || "",
    ts: Date.now(),
  });
  await env.DB.put(dayKey, JSON.stringify(day));

  let bal = Number((await env.DB.get(balKey)) || 0);
  bal += tx.type === "sale" ? tx.amount : -tx.amount;
  await env.DB.put(balKey, String(bal));
}

async function getBalance(env, chatId) {
  return Number((await env.DB.get(`bal:${chatId}`)) || 0);
}

/* ───────────────────────────── Report & Suggestion ───────────────────────────── */

async function buildTodayReport(env, chatId) {
  const today = todayKey();
  const day = JSON.parse((await env.DB.get(`day:${chatId}:${today}`)) || "[]");
  const bal = await getBalance(env, chatId);

  let sales = 0;
  let expenses = 0;
  const lines = [];

  for (const t of day) {
    if (t.type === "sale") {
      sales += t.amount;
      lines.push(`🟢 +${formatMoney(t.amount)}${t.note ? " — " + t.note : ""}`);
    } else {
      expenses += t.amount;
      lines.push(`🔴 −${formatMoney(t.amount)}${t.note ? " — " + t.note : ""}`);
    }
  }

  const net = sales - expenses;
  const netSign = net >= 0 ? "+" : "";

  let text = `📊 <b>گزارش امروز</b> (${today})\n\n`;
  if (lines.length === 0) {
    text += "هنوز تراکنشی ثبت نشده.\n";
  } else {
    text += lines.join("\n") + "\n\n";
    text += `فروش: <b>${formatMoney(sales)}</b>\n`;
    text += `هزینه: <b>${formatMoney(expenses)}</b>\n`;
    text += `خالص: <b>${netSign}${formatMoney(net)}</b>\n`;
  }
  text += `\n💰 موجودی کل: <b>${formatMoney(bal)}</b> تومان`;

  const suggestion = makeSuggestion(sales, expenses, net, day);
  text += `\n\n💡 <b>پیشنهاد فردا:</b>\n${suggestion}`;

  return text;
}

function makeSuggestion(sales, expenses, net, day) {
  if (day.length === 0) {
    return "امروز چیزی ثبت نکردی. فردا اولین فروش یا هزینه را همین‌جا بنویس تا روندت مشخص بشه.";
  }

  if (expenses > sales * 1.5 && sales > 0) {
    return "هزینه‌هات نسبت به فروش بالاست. فردا یکی از هزینه‌های غیرضروری را کم کن یا به تعویق بنداز.";
  }

  if (net < 0) {
    return "امروز منفی بودی. فردا روی یک کانال فروش یا مشتری قبلی تمرکز کن و حداقل یک فروش ثبت کن.";
  }

  if (sales > 0 && expenses === 0) {
    return "فروش خوب بدون هزینه اضافه. فردا همین ریتم را حفظ کن و اگر می‌تونی یک محصول/خدمت پرتقاضا را پررنگ‌تر کن.";
  }

  if (net > 0 && sales > expenses) {
    return "روز مثبتی بود. فردا همان کارهایی که فروش آورد را تکرار کن و یک کار کوچک برای افزایش فروش امتحان کن.";
  }

  return "فردا اول روز موجودی را چک کن و یک هدف فروش مشخص برای خودت بگذار.";
}

/* ───────────────────────────── Nightly Cron ───────────────────────────── */

async function runNightlyReports(env) {
  const usersRaw = await env.DB.get("users");
  if (!usersRaw) {
    console.log("No users yet.");
    return;
  }

  const users = JSON.parse(usersRaw);
  console.log(`Sending nightly reports to ${users.length} users`);

  for (const chatId of users) {
    try {
      const report = await buildTodayReport(env, chatId);
      await send(env, chatId, "🌙 <b>گزارش شبانه Joorup</b>\n\n" + report);
      await sleep(50);
    } catch (e) {
      console.error(`Failed report for ${chatId}:`, e);
    }
  }
}

async function ensureUser(env, chatId) {
  const raw = await env.DB.get("users");
  let users = raw ? JSON.parse(raw) : [];
  if (!users.includes(chatId)) {
    users.push(chatId);
    await env.DB.put("users", JSON.stringify(users));
  }
}

/* ───────────────────────────── Telegram Helpers ───────────────────────────── */

async function send(env, chatId, content) {
  const body =
    typeof content === "string"
      ? { chat_id: chatId, text: content, parse_mode: "HTML" }
      : { chat_id: chatId, parse_mode: "HTML", ...content };

  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error("sendMessage error:", await res.text());
  }
}

async function editMessage(env, chatId, messageId, text) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    }),
  });
}

async function answerCallback(env, callbackQueryId) {
  await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  });
}

/* ───────────────────────────── Utils ───────────────────────────── */

function todayKey() {
  // تاریخ تهران (UTC+3:30)
  const now = new Date();
  const tehran = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);
  return tehran.toISOString().slice(0, 10);
}

function formatMoney(n) {
  return Number(n).toLocaleString("en-US");
}

function welcomeText(name) {
  return `سلام ${name} 👋\n\nمن <b>Joorup</b> هستم — مدیر کسب‌وکار هوشمند تو.\n\nالان می‌تونی:\n• فروش یا هزینه را بنویسی (مثال: فروش ۱۵۰۰۰۰)\n• /موجودی بگیری\n• /گزارش امروز را ببینی\n\nهر شب هم گزارش + پیشنهاد فردا برات می‌فرستم.`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
