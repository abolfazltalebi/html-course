/* =========================================================
   یادآور روزانه - script.js
   ذخیره‌سازی: localStorage
   بررسی زمان‌ها: هر ۳۰ ثانیه
   ========================================================= */

const STORAGE_KEY = "reminders";

// نگاشت نام روزهای هفته فارسی به شماره روز جاوااسکریپت (getDay)
// جاوااسکریپت: یکشنبه=0، دوشنبه=1، ... شنبه=6
const WEEKDAYS = {
  "یکشنبه": 0,
  "دوشنبه": 1,
  "سه شنبه": 2,
  "سه‌شنبه": 2,
  "چهارشنبه": 3,
  "پنجشنبه": 4,
  "پنج شنبه": 4,
  "جمعه": 5,
  "شنبه": 6
};

// عناصر DOM
const reminderInput = document.getElementById("reminderInput");
const addBtn = document.getElementById("addBtn");
const remindersList = document.getElementById("remindersList");
const emptyState = document.getElementById("emptyState");
const notifStatus = document.getElementById("notifStatus");

let reminders = loadReminders();

// ---------------------------------------------------------
// تبدیل ارقام فارسی/عربی به انگلیسی
// ---------------------------------------------------------
function toEnglishDigits(str) {
  const persian = "۰۱۲۳۴۵۶۷۸۹";
  const arabic = "٠١٢٣٤٥٦٧٨٩";
  return str.replace(/[۰-۹٠-٩]/g, (ch) => {
    let idx = persian.indexOf(ch);
    if (idx === -1) idx = arabic.indexOf(ch);
    return idx !== -1 ? idx : ch;
  });
}

// ---------------------------------------------------------
// تحلیل متن ورودی کاربر و استخراج تاریخ/ساعت/عنوان
// ---------------------------------------------------------
function parseReminderText(rawText) {
  let text = toEnglishDigits(rawText.trim());
  let isDaily = false;
  let dayOffsetInfo = null; // { type: 'today' | 'tomorrow' | 'weekday', value }

  // تشخیص "هر روز"
  if (/هر\s*روز/.test(text)) {
    isDaily = true;
    text = text.replace(/هر\s*روز/g, "").trim();
  }

  // تشخیص "امروز"
  if (/امروز/.test(text)) {
    dayOffsetInfo = { type: "today" };
    text = text.replace(/امروز/g, "").trim();
  }
  // تشخیص "فردا"
  else if (/فردا/.test(text)) {
    dayOffsetInfo = { type: "tomorrow" };
    text = text.replace(/فردا/g, "").trim();
  } else {
    // تشخیص نام روز هفته
    for (const dayName in WEEKDAYS) {
      if (text.indexOf(dayName) !== -1) {
        dayOffsetInfo = { type: "weekday", value: WEEKDAYS[dayName] };
        text = text.replace(dayName, "").trim();
        break;
      }
    }
  }

  // استخراج ساعت: الگوی "ساعت 5" یا "ساعت 5:30" یا "ساعت 5 و 30 دقیقه"
  let hour = null;
  let minute = 0;
  const timeMatch = text.match(/ساعت\s*(\d{1,2})(?:[:٫]\s*(\d{1,2})|\s*و\s*(\d{1,2})\s*دقیقه)?/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    if (timeMatch[2]) minute = parseInt(timeMatch[2], 10);
    else if (timeMatch[3]) minute = parseInt(timeMatch[3], 10);
    // حذف بخش زمان (و رنج احتمالی "تا 7") از متن برای رسیدن به عنوان تمیز
    text = text.replace(timeMatch[0], "").trim();
    text = text.replace(/تا\s*\d{1,2}(?:[:٫]\d{1,2})?/, "").trim();
  }

  // پاکسازی فاصله‌های اضافه که از حذف کلمات باقی می‌ماند
  const title = text.replace(/\s+/g, " ").trim();

  return { title, hour, minute, isDaily, dayOffsetInfo };
}

// ---------------------------------------------------------
// محاسبه تاریخ دقیق (Date object) بر اساس نتیجه‌ی تحلیل متن
// ---------------------------------------------------------
function computeTargetDate(parsed) {
  const now = new Date();
  const hour = parsed.hour !== null ? parsed.hour : now.getHours();
  const minute = parsed.minute || 0;

  let target = new Date();
  target.setHours(hour, minute, 0, 0);

  if (parsed.isDaily) {
    // برای یادآورهای روزانه فقط ساعت مهم است، تاریخ در هر بررسی محاسبه می‌شود
    return target;
  }

  if (parsed.dayOffsetInfo) {
    if (parsed.dayOffsetInfo.type === "tomorrow") {
      target.setDate(target.getDate() + 1);
    } else if (parsed.dayOffsetInfo.type === "weekday") {
      const currentDay = now.getDay();
      let diff = parsed.dayOffsetInfo.value - currentDay;
      if (diff < 0 || (diff === 0 && target < now)) diff += 7;
      target.setDate(target.getDate() + diff);
    }
    // "today" نیازی به تغییر ندارد
  } else {
    // اگر هیچ روزی مشخص نشده و ساعت گذشته، فرض بر فرداست
    if (target < now) {
      target.setDate(target.getDate() + 1);
    }
  }

  return target;
}

// ---------------------------------------------------------
// ذخیره و بارگذاری از localStorage
// ---------------------------------------------------------
function loadReminders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveReminders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

// ---------------------------------------------------------
// افزودن یادآور جدید
// ---------------------------------------------------------
function addReminder() {
  const rawText = reminderInput.value.trim();
  if (!rawText) return;

  const parsed = parseReminderText(rawText);

  if (!parsed.title) {
    alert("لطفا یک عنوان برای یادآور بنویس.");
    return;
  }
  if (parsed.hour === null) {
    alert("ساعت یادآور مشخص نیست. مثلا بنویس: «ساعت ۵ ...»");
    return;
  }

  const targetDate = computeTargetDate(parsed);

  const reminder = {
    id: Date.now().toString(),
    title: parsed.title,
    hour: parsed.hour,
    minute: parsed.minute,
    isDaily: parsed.isDaily,
    dateISO: parsed.isDaily ? null : targetDate.toISOString(),
    lastNotifiedDate: null, // برای یادآورهای روزانه: تاریخ آخرین اطلاع‌رسانی (جلوگیری از تکرار در همان روز)
    notified: false,        // برای یادآورهای یکبار مصرف
    completed: false
  };

  reminders.push(reminder);
  saveReminders();
  renderReminders();

  reminderInput.value = "";
  reminderInput.focus();
}

// ---------------------------------------------------------
// حذف / تکمیل یادآور
// ---------------------------------------------------------
function deleteReminder(id) {
  reminders = reminders.filter((r) => r.id !== id);
  saveReminders();
  renderReminders();
}

function toggleComplete(id) {
  const r = reminders.find((r) => r.id === id);
  if (r) {
    r.completed = !r.completed;
    saveReminders();
    renderReminders();
  }
}

// ---------------------------------------------------------
// نمایش کارت‌های یادآور
// ---------------------------------------------------------
function formatDateLabel(reminder) {
  if (reminder.isDaily) return "هر روز";
  const d = new Date(reminder.dateISO);
  return d.toLocaleDateString("fa-IR", { day: "numeric", month: "long" });
}

function formatTimeLabel(reminder) {
  const h = String(reminder.hour).padStart(2, "0");
  const m = String(reminder.minute).padStart(2, "0");
  return `${h}:${m}`;
}

function renderReminders() {
  remindersList.innerHTML = "";

  // مرتب‌سازی: ناتمام‌ها اول
  const sorted = [...reminders].sort((a, b) => a.completed - b.completed);

  sorted.forEach((reminder) => {
    const card = document.createElement("div");
    card.className = "reminder-card" + (reminder.completed ? " done" : "");

    card.innerHTML = `
      <div class="reminder-main">
        <p class="reminder-title"></p>
        <div class="reminder-meta">
          <span class="badge ${reminder.isDaily ? "daily" : ""}"></span>
          <span class="badge"></span>
        </div>
      </div>
      <div class="reminder-actions">
        <button class="icon-btn complete" title="تکمیل / بازگردانی">✓</button>
        <button class="icon-btn delete" title="حذف">✕</button>
      </div>
    `;

    // متن‌ها را جداگانه با textContent قرار می‌دهیم تا از مشکلات escaping جلوگیری شود
    card.querySelector(".reminder-title").textContent = reminder.title;
    const badges = card.querySelectorAll(".badge");
    badges[0].textContent = formatDateLabel(reminder);
    badges[1].textContent = formatTimeLabel(reminder);

    card.querySelector(".complete").addEventListener("click", () => toggleComplete(reminder.id));
    card.querySelector(".delete").addEventListener("click", () => deleteReminder(reminder.id));

    remindersList.appendChild(card);
  });

  emptyState.style.display = reminders.length === 0 ? "block" : "none";
}

// ---------------------------------------------------------
// صدای اعلان کوتاه (تولید شده با Web Audio API، بدون فایل خارجی)
// ---------------------------------------------------------
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880; // نت لا
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // اگر مرورگر پشتیبانی نکرد، بی‌صدا رد می‌شویم
  }
}

// ---------------------------------------------------------
// نمایش اعلان (Notification API) یا آلرت در صورت مسدود بودن
// ---------------------------------------------------------
function fireNotification(reminder) {
  const body = `ساعت ${formatTimeLabel(reminder)} - ${reminder.title}`;

  if (Notification.permission === "granted") {
    new Notification("یادآوری!", { body });
    playNotificationSound();
  } else {
    // اعلان مسدود است یا اجازه داده نشده -> نمایش popup ساده
    playNotificationSound();
    alert(`⏰ یادآوری:\n${body}`);
  }
}

// ---------------------------------------------------------
// بررسی دوره‌ای یادآورها (هر ۳۰ ثانیه)
// ---------------------------------------------------------
function checkReminders() {
  const now = new Date();
  const todayStr = now.toDateString();
  let changed = false;

  reminders.forEach((reminder) => {
    if (reminder.completed) return;

    if (reminder.isDaily) {
      // یادآور روزانه: اگر ساعت فرا رسیده و امروز هنوز اطلاع‌رسانی نشده
      const reached =
        now.getHours() > reminder.hour ||
        (now.getHours() === reminder.hour && now.getMinutes() >= reminder.minute);

      if (reached && reminder.lastNotifiedDate !== todayStr) {
        fireNotification(reminder);
        reminder.lastNotifiedDate = todayStr;
        changed = true;
      }
    } else {
      // یادآور یکبار مصرف
      if (!reminder.notified) {
        const target = new Date(reminder.dateISO);
        if (now >= target) {
          fireNotification(reminder);
          reminder.notified = true;
          changed = true;
        }
      }
    }
  });

  if (changed) saveReminders();
}

// ---------------------------------------------------------
// درخواست مجوز نمایش اعلان (فقط یکبار)
// ---------------------------------------------------------
function requestNotificationPermission() {
  if (!("Notification" in window)) {
    notifStatus.textContent = "این مرورگر از اعلان‌ها پشتیبانی نمی‌کند. به‌جای آن از پاپ‌آپ استفاده می‌شود.";
    notifStatus.classList.add("blocked");
    return;
  }

  if (Notification.permission === "default") {
    Notification.requestPermission().then(updateNotifStatusText);
  } else {
    updateNotifStatusText();
  }
}

function updateNotifStatusText() {
  if (Notification.permission === "granted") {
    notifStatus.textContent = "✓ اعلان مرورگر فعال است";
    notifStatus.classList.remove("blocked");
  } else {
    notifStatus.textContent = "اعلان مرورگر مسدود است، در زمان یادآوری به‌جای آن پاپ‌آپ نشان داده می‌شود.";
    notifStatus.classList.add("blocked");
  }
}

// ---------------------------------------------------------
// راه‌اندازی اولیه
// ---------------------------------------------------------
addBtn.addEventListener("click", addReminder);
reminderInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addReminder();
});

requestNotificationPermission();
renderReminders();

// بررسی هر ۳۰ ثانیه
setInterval(checkReminders, 30 * 1000);
// یک بار هم بلافاصله بعد از لود بررسی شود
checkReminders();
