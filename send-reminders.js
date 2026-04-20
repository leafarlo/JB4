#!/usr/bin/env node
/**
 * Jardin Botanique 4 — Weekly Reminder Script
 *
 * Emails come from GitHub Secrets injected as environment variables.
 * residents.json stores only names and which secret key to read.
 * Zero private data in the repository.
 *
 * Secret naming convention (set in GitHub → Settings → Secrets → Actions):
 *   EMAIL_G1_M1, EMAIL_G1_M2 … EMAIL_G5_M4
 *   AMBASSADOR_EMAIL
 *   GMAIL_USER
 *   GMAIL_APP_PASS
 */

const nodemailer = require('nodemailer');
const fs         = require('fs');
const path       = require('path');

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'residents.json'), 'utf8')
);

const DRY_RUN = process.env.DRY_RUN === 'true';

// ── Resolve email for a member from environment variable ───────────────────
function getEmail(secretKey) {
  return process.env[secretKey] || null;
}

// ── Date helpers ───────────────────────────────────────────────────────────
const refMonday = new Date(config.referenceMonday);

function getMondayOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0) ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekIndex(monday) {
  return Math.round((monday - refMonday) / (7 * 24 * 3600 * 1000));
}

function groupForWeek(wi) {
  const idx = ((wi % 5) + 5) % 5;
  return config.groups[idx];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatDateShort(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

function bagEmoji(type) {
  return { blue: '🔵', yellow: '🟡', green: '🟢', glass: '⬜', bulk: '🟫' }[type] || '🗑️';
}

// ── This week's duties ─────────────────────────────────────────────────────
const thisMonday = getMondayOfWeek();
const wi         = weekIndex(thisMonday);
const trashGroup = groupForWeek(wi);
const dishGroup  = groupForWeek(wi + 1);

const weekEnd = new Date(thisMonday);
weekEnd.setDate(weekEnd.getDate() + 6);

const thisWeekTrash = config.trashSchedule.filter(t => {
  const d = new Date(t.date);
  return d >= thisMonday && d <= weekEnd;
});

// ── Mailer ─────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

// ── Email templates ────────────────────────────────────────────────────────
function buildTrashEmail(member, group, trashItems) {
  const allNames  = group.members.map(m => m.name).join(', ');
  const trashRows = trashItems.map(t => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #eee;">
        📅 <strong>${formatDate(t.date)}</strong>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #eee;color:#4a7c2f;">
        ${bagEmoji(t.type)} ${t.label}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="background:#1a2e1a;padding:32px 36px 24px;">
    <div style="font-size:12px;color:#8fb573;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">Jardin Botanique 4 · Brussels</div>
    <div style="font-family:Georgia,serif;font-size:26px;color:#f5f0e8;font-weight:bold;">🗑️ Trash Duty Reminder</div>
    <div style="font-size:13px;color:#8fb573;margin-top:6px;">${group.name} · Week of ${formatDateShort(thisMonday)}</div>
  </div>
  <div style="padding:28px 36px;">
    <p style="font-size:15px;color:#1a1a14;margin:0 0 16px;">Hi <strong>${member.name}</strong> 👋</p>
    <p style="font-size:14px;color:#4a4a3a;line-height:1.6;margin:0 0 24px;">
      This is your weekly reminder that <strong>${group.name}</strong> is on <strong>trash duty</strong> this week.
      Please put the bags outside <strong>before 7:00 AM</strong> on collection morning.
    </p>
    <div style="background:#f9f7f2;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <div style="background:#2d5016;color:#d4e8c2;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;padding:10px 16px;">This week's collection</div>
      <table style="width:100%;border-collapse:collapse;">${trashRows}</table>
    </div>
    <div style="margin-bottom:24px;">
      <div style="font-size:12px;color:#7a7a6a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Your group members</div>
      <div style="font-size:14px;color:#1a2e1a;font-weight:500;">${allNames}</div>
    </div>
    <div style="background:#fff8e8;border:1px solid #e8c87a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <div style="font-size:13px;color:#8a6020;">⏰ <strong>Put bags outside before 7:00 AM.</strong> Sort correctly — wrong bags may not be collected!</div>
    </div>
  </div>
  <div style="background:#f5f0e8;padding:16px 36px;border-top:1px solid #ede6d6;">
    <div style="font-size:12px;color:#aaa;">Jardin Botanique 4 · Automated weekly reminder</div>
  </div>
</div>
</body></html>`;
}

function buildDishEmail(member, group) {
  const allNames = group.members.map(m => m.name).join(', ');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="background:#1a2a3a;padding:32px 36px 24px;">
    <div style="font-size:12px;color:#7ab8e8;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">Jardin Botanique 4 · Brussels</div>
    <div style="font-family:Georgia,serif;font-size:26px;color:#f5f0e8;font-weight:bold;">🍽️ Dishwasher Duty Reminder</div>
    <div style="font-size:13px;color:#7ab8e8;margin-top:6px;">${group.name} · Week of ${formatDateShort(thisMonday)}</div>
  </div>
  <div style="padding:28px 36px;">
    <p style="font-size:15px;color:#1a1a14;margin:0 0 16px;">Hi <strong>${member.name}</strong> 👋</p>
    <p style="font-size:14px;color:#4a4a3a;line-height:1.6;margin:0 0 24px;">
      This week <strong>${group.name}</strong> is on <strong>dishwasher duty</strong>.
      Please empty the dishwasher each morning <strong>before 10:00 AM</strong>.
    </p>
    <div style="background:#f0f7ff;border:1px solid #7ab8e8;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <div style="font-size:13px;color:#1a3a5a;">⏰ Empty dishwasher <strong>before 10:00 AM</strong> every morning this week.</div>
    </div>
    <div style="margin-bottom:24px;">
      <div style="font-size:12px;color:#7a7a6a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Your group members</div>
      <div style="font-size:14px;color:#1a2e1a;font-weight:500;">${allNames}</div>
    </div>
  </div>
  <div style="background:#f5f0e8;padding:16px 36px;border-top:1px solid #ede6d6;">
    <div style="font-size:12px;color:#aaa;">Jardin Botanique 4 · Automated weekly reminder</div>
  </div>
</div>
</body></html>`;
}

// ── Send ───────────────────────────────────────────────────────────────────
async function send(to, subject, html, name) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would send to ${name} <${to}> — "${subject}"`);
    return;
  }
  await transporter.sendMail({
    from: `"Jardin Botanique 4" <${process.env.GMAIL_USER}>`,
    to, subject, html,
  });
}

async function main() {
  console.log(`\n🏡 Jardin Botanique 4 — Weekly Reminders${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`📅 Week: ${thisMonday.toDateString()}`);
  console.log(`🗑️  Trash: ${trashGroup.name} — ${trashGroup.members.map(m=>m.name).join(', ')}`);
  console.log(`🍽️  Dishes: ${dishGroup.name} — ${dishGroup.members.map(m=>m.name).join(', ')}`);
  console.log(`📦 Trash this week: ${thisWeekTrash.length ? thisWeekTrash.map(t=>t.label).join(', ') : 'none'}\n`);

  let sent = 0, skipped = 0, failed = 0;

  // Trash emails
  if (thisWeekTrash.length > 0) {
    for (const member of trashGroup.members) {
      const email = getEmail(member.emailSecret);
      if (!email) {
        console.log(`  ⚠️  ${member.name}: secret "${member.emailSecret}" not set — skipping`);
        skipped++;
        continue;
      }
      try {
        await send(email, `🗑️ [JB4] Trash duty this week — ${trashGroup.name}`,
          buildTrashEmail(member, trashGroup, thisWeekTrash), member.name);
        console.log(`  ✅ Trash → ${member.name}`);
        sent++;
      } catch (e) {
        console.error(`  ❌ ${member.name}: ${e.message}`);
        failed++;
      }
    }
  } else {
    console.log('  ℹ️  No trash collection this week — skipping trash emails.');
  }

  // Dish emails
  for (const member of dishGroup.members) {
    const email = getEmail(member.emailSecret);
    if (!email) {
      console.log(`  ⚠️  ${member.name}: secret "${member.emailSecret}" not set — skipping`);
      skipped++;
      continue;
    }
    try {
      await send(email, `🍽️ [JB4] Dishwasher duty this week — ${dishGroup.name}`,
        buildDishEmail(member, dishGroup), member.name);
      console.log(`  ✅ Dishes → ${member.name}`);
      sent++;
    } catch (e) {
      console.error(`  ❌ ${member.name}: ${e.message}`);
      failed++;
    }
  }

  // Ambassador summary
  const ambassadorEmail = getEmail(config.ambassador.emailSecret);
  if (ambassadorEmail) {
    const summary = `<h2>JB4 Weekly Summary</h2>
      <p><strong>🗑️ Trash:</strong> ${trashGroup.name} — ${trashGroup.members.map(m=>m.name).join(', ')}</p>
      <p><strong>Collection:</strong> ${thisWeekTrash.length ? thisWeekTrash.map(t=>`${t.label} on ${formatDate(t.date)}`).join('; ') : 'None this week'}</p>
      <p><strong>🍽️ Dishwasher:</strong> ${dishGroup.name} — ${dishGroup.members.map(m=>m.name).join(', ')}</p>
      <p style="color:#888;font-size:12px;">Sent: ${sent} · Skipped (no email): ${skipped} · Failed: ${failed}</p>`;
    try {
      await send(ambassadorEmail, `[JB4] Weekly summary — ${thisMonday.toLocaleDateString('en-GB')}`, summary, 'Ambassador');
      console.log(`\n  📋 Summary → ambassador`);
    } catch (e) {
      console.error('  ⚠️  Ambassador summary failed:', e.message);
    }
  }

  console.log(`\n✅ Done. Sent: ${sent} · Skipped: ${skipped} · Failed: ${failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
