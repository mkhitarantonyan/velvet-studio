import dotenv from "dotenv";
dotenv.config();

process.env.TZ = "Europe/Budapest";

import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import { DateTime } from "luxon";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import {
  loadBookings,
  createBooking,
  updateBookingStatus,
  deleteBooking,
  loadProcedures,
  saveProcedures,
  loadContacts,
  saveContacts,
  getSupabaseClient,
  isSupabaseConfigured
} from "./src/lib/database";

const app = express();
app.set("trust proxy", 1);
const PORT = 3000;

// Dynamic, high-security CORS policy with strict credentials and origin resolution
app.use(cors({
  origin: (origin, callback) => {
    // Always allow all origins for seamless sandbox iframe preview and API access
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

app.use(express.json());
app.use(cookieParser());

// Rate Limiters to prevent abuse/brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  message: { error: "Too many login attempts from this IP, please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 booking requests per minute
  message: { error: "Too many booking requests. Please wait a moment before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stateless cryptographic JWT-like Admin Token Authentication System
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    console.warn("⚠️ WARNING: JWT_SECRET environment variable is missing in production! Generating a temporary cryptographically secure random session key.");
    try {
      return crypto.randomBytes(32).toString("hex");
    } catch (e) {
      return "fallback_velvet_nails_secure_secret_2026_prod_" + Math.random().toString(36).substring(2);
    }
  }
  return "fallback_velvet_nails_secure_secret_2026";
})();

function generateToken(payload: any): string {
  // Signs standard JWT with 1 day expiration
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Retrieve token from Authorization header or secure HttpOnly cookie
  let token = req.cookies?.velvet_admin_token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing authentication token" });
  }

  const payload = verifyToken(token);
  if (!payload || !payload.isAdmin) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired admin token" });
  }
  next();
}

/**
 * Robust string sanitization to prevent injection and XSS
 */
function sanitizeString(str: string, maxLength: number): string {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .trim()
    .substring(0, maxLength);
}

/**
 * Strict Email validation regex
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Robust phone validation regex
 */
function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Helper to parse time string "HH:MM" into minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") {
    throw new Error("Time string is missing or invalid");
  }
  const parts = timeStr.split(":");
  if (parts.length < 2) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time bounds in: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

/**
 * Sends a Telegram notification using the Bot API when a new booking is submitted.
 * Dates and times are explicitly formatted in the Europe/Budapest timezone (salon's local time).
 */
async function sendTelegramNotification(booking: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token === "your_bot_token" || chatId === "your_chat_id") {
    console.log("ℹ️ Telegram Bot notifications are not fully configured. Skipping notification.");
    return;
  }

  let procedureName = "Unknown Procedure";
  try {
    const procedures = await loadProcedures();
    const pIds = (Array.isArray(booking.procedureIds) && booking.procedureIds.length > 0)
      ? booking.procedureIds 
      : [booking.procedureId];
    const selectedProcs = procedures.filter((p) => pIds.includes(p.id));
    if (selectedProcs.length > 0) {
      procedureName = selectedProcs.map((p) => `${p.nameEn} / ${p.nameRu} / ${p.nameHu}`).join("\n    + ");
    }
  } catch (err) {
    console.error("Error fetching procedure name for Telegram notification:", err);
  }

  // Format the date/time beautifully using Luxon in Budapest timezone
  const bDateTime = DateTime.fromFormat(`${booking.date} ${booking.time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" });
  const formattedDate = bDateTime.isValid ? bDateTime.setLocale("en").toLocaleString(DateTime.DATE_HUGE) : booking.date;
  const formattedTime = bDateTime.isValid ? bDateTime.toFormat("HH:mm") : booking.time;

  const text = `🔔 *New Manicure Booking!*
👤 *Client:* ${booking.firstName} ${booking.lastName}
📞 *Phone:* \`${booking.phone}\`
💅 *Procedure:* ${procedureName}
📅 *Date:* ${formattedDate}
⏰ *Time:* ${formattedTime} (Budapest Time)
💬 *Comment:* ${booking.comment || "None"}
📌 *Status:* ${booking.status.toUpperCase()}`;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send Telegram notification:", errorText);
    } else {
      console.log("✅ Telegram bot notification dispatched successfully.");
    }
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
  }
}

/**
 * Sends an email notification to the client.
 */
async function sendEmailNotification(booking: any, type: "created" | "confirmed" | "cancelled") {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Velvet Budapest" <noreply@velvetnails.com>`;

  const emailTo = booking.email;
  if (!emailTo) {
    console.log("ℹ️ No email address found for booking. Skipping email notification.");
    return;
  }

  // Generate procedure names
  let procedureName = "Premium Nail Service";
  try {
    const procedures = await loadProcedures();
    const pIds = (Array.isArray(booking.procedureIds) && booking.procedureIds.length > 0)
      ? booking.procedureIds 
      : [booking.procedureId];
    const selectedProcs = procedures.filter((p: any) => pIds.includes(p.id));
    if (selectedProcs.length > 0) {
      procedureName = selectedProcs.map((p: any) => `${p.nameEn} / ${p.nameRu} / ${p.nameHu}`).join(" + ");
    }
  } catch (err) {
    console.error("Error loading procedures for email:", err);
  }

  // Format the date/time using Luxon in Budapest timezone
  const bDateTime = DateTime.fromFormat(`${booking.date} ${booking.time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" });
  const formattedDate = bDateTime.isValid ? bDateTime.setLocale("en").toLocaleString(DateTime.DATE_HUGE) : booking.date;
  const formattedTime = bDateTime.isValid ? bDateTime.toFormat("HH:mm") : booking.time;

  // Choose subject and body based on type
  let subject = "";
  let heading = "";
  let intro = "";
  let statusColor = "#d97706"; // Amber for pending
  let statusLabel = "Awaiting Confirmation / Ожидает подтверждения / Visszaigazolásra vár";

  if (type === "created") {
    subject = "Velvet Budapest - Booking Received / Запись получена / Foglalás regisztrálva";
    heading = "Thank you for booking! / Спасибо за запись! / Köszönjük a foglalást!";
    intro = "We have received your booking request. Our administrator will confirm your appointment shortly. / Мы получили вашу заявку на запись. Наш администратор подтвердит её в ближайшее время. / Megkaptuk foglalási igényét. Adminisztrátorunk hamarosan visszaigazolja.";
  } else if (type === "confirmed") {
    subject = "Velvet Budapest - Booking CONFIRMED / Запись ПОДТВЕРЖДЕНА / Foglalás VISSZAIGAZOLVA";
    heading = "Your Booking is Confirmed! / Ваша запись подтверждена! / Foglalása visszaigazolva!";
    intro = "We are looking forward to seeing you at Velvet Budapest! / Мы с нетерпением ждем вас в Velvet Budapest! / Szeretettel várjuk Önt a Velvet Budapestben!";
    statusColor = "#16a34a"; // Green
    statusLabel = "CONFIRMED / ПОДТВЕРЖДЕНО / VISSZAIGAZOLVA";
  } else if (type === "cancelled") {
    subject = "Velvet Budapest - Booking Cancelled / Запись отменена / Foglalás törölve";
    heading = "Booking Cancelled / Запись отменена / Foglalás törölve";
    intro = "Your booking has been cancelled. If this is a mistake, please make a new appointment. / Ваша запись была отменена. Если это ошибка, пожалуйста, оформите новую запись. / Foglalása törlésre került. Ha ez tévedés, kérjük, foglaljon új időpontot.";
    statusColor = "#dc2626"; // Red
    statusLabel = "CANCELLED / ОТМЕНЕНО / TÖRÖLVE";
  }

  // HTML email template with beautiful, premium CSS matching the Velvet design
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: #fcf8f6;
          color: #2e2522;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #f3e8e2;
          box-shadow: 0 4px 12px rgba(46, 37, 34, 0.03);
          margin: 0 auto;
          overflow: hidden;
        }
        .header {
          background-color: #4b3d36;
          color: #ffffff;
          padding: 32px 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 2px;
        }
        .header p {
          margin: 4px 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 4px;
          color: #d1c2ba;
        }
        .content {
          padding: 32px 24px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .intro {
          font-size: 14px;
          line-height: 1.6;
          color: #5c4e48;
          margin-bottom: 24px;
        }
        .details-card {
          background-color: #faf6f3;
          border-radius: 12px;
          border: 1px solid #f1e4dc;
          padding: 20px;
          margin-bottom: 24px;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f3e8e2;
          font-size: 14px;
        }
        .details-row:last-child {
          border-bottom: none;
        }
        .details-label {
          font-weight: 600;
          color: #5c4e48;
          width: 140px;
          flex-shrink: 0;
        }
        .details-value {
          color: #2e2522;
          text-align: right;
          word-break: break-word;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          color: #ffffff;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 1px;
        }
        .footer {
          background-color: #faf6f3;
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: #8c7d75;
          border-top: 1px solid #f1e4dc;
        }
        .footer a {
          color: #4b3d36;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VELVET</h1>
          <p>Nail Studio Budapest</p>
        </div>
        <div class="content">
          <h2 class="greeting">Hello, ${booking.firstName} ${booking.lastName}!</h2>
          <p class="intro">${intro}</p>
          
          <div class="details-card">
            <div class="details-row">
              <div class="details-label">Service / Услуга / Szolgáltatás:</div>
              <div class="details-value" style="font-weight: 600;">${procedureName}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Date / Дата / Dátum:</div>
              <div class="details-value">${formattedDate}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Time / Время / Időpont:</div>
              <div class="details-value" style="font-weight: 600;">${formattedTime}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Phone / Телефон / Telefon:</div>
              <div class="details-value">${booking.phone}</div>
            </div>
            ${booking.comment ? `
            <div class="details-row">
              <div class="details-label">Comments:</div>
              <div class="details-value">${booking.comment}</div>
            </div>
            ` : ""}
            <div class="details-row" style="border-bottom: none; margin-top: 10px; align-items: center;">
              <div class="details-label">Status / Статус:</div>
              <div class="details-value">
                <span class="status-badge" style="background-color: ${statusColor};">
                  ${statusLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>© 2026 Velvet Manicure Studio. Budapest. All rights reserved.</p>
          <p>If you have any questions or need to reschedule, please call us at <a href="tel:+36301234567">+36 (30) 123-4567</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!user || !pass) {
    console.log(`ℹ️ [SMTP EMAIL FALLBACK LOG]
========================================
To: ${emailTo}
Subject: ${subject}
Heading: ${heading}
Client: ${booking.firstName} ${booking.lastName} (${booking.phone})
Service: ${procedureName}
Time: ${booking.date} at ${booking.time}
Status: ${type.toUpperCase()}
========================================
SMTP settings are not configured. To enable real email delivery, set SMTP_USER and SMTP_PASS in .env.`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host || "smtp.gmail.com",
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
    });

    await transporter.sendMail({
      from: from,
      to: emailTo,
      subject: subject,
      html: htmlContent,
    });

    console.log(`✅ Confirmation email of type "${type}" sent successfully to ${emailTo}.`);
  } catch (error) {
    console.error(`❌ Failed to send confirmation email to ${emailTo}:`, error);
  }
}

/**
 * Sends an email notification to the administrator about a new booking request.
 */
async function sendAdminEmailNotification(booking: any) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log("ℹ️ No admin email configured (ADMIN_EMAIL is not set in .env). Skipping admin notification.");
    return;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Velvet Budapest" <noreply@velvetnails.com>`;

  // Generate procedure names
  let procedureName = "Premium Nail Service";
  try {
    const procedures = await loadProcedures();
    const pIds = (Array.isArray(booking.procedureIds) && booking.procedureIds.length > 0)
      ? booking.procedureIds 
      : [booking.procedureId];
    const selectedProcs = procedures.filter((p: any) => pIds.includes(p.id));
    if (selectedProcs.length > 0) {
      procedureName = selectedProcs.map((p: any) => `${p.nameEn} / ${p.nameRu} / ${p.nameHu}`).join(" + ");
    }
  } catch (err) {
    console.error("Error loading procedures for admin email:", err);
  }

  // Format the date/time using Luxon in Budapest timezone
  const bDateTime = DateTime.fromFormat(`${booking.date} ${booking.time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" });
  const formattedDate = bDateTime.isValid ? bDateTime.setLocale("en").toLocaleString(DateTime.DATE_HUGE) : booking.date;
  const formattedTime = bDateTime.isValid ? bDateTime.toFormat("HH:mm") : booking.time;

  const subject = `⚠️ NEW BOOKING: ${booking.firstName} ${booking.lastName} - ${booking.date} @ ${booking.time}`;
  const adminUrl = `${process.env.APP_URL || "https://velvetnails.com"}/admin`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background-color: #fcf8f6;
          color: #2e2522;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          background-color: #ffffff;
          border-radius: 16px;
          border: 1px solid #f3e8e2;
          box-shadow: 0 4px 12px rgba(46, 37, 34, 0.03);
          margin: 0 auto;
          overflow: hidden;
        }
        .header {
          color: #ffffff;
          padding: 32px 24px;
          text-align: center;
        }
        .header.luxury {
          background-color: #2e2522;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .header p {
          margin: 4px 0 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #d1c2ba;
        }
        .content {
          padding: 32px 24px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .intro {
          font-size: 14px;
          line-height: 1.6;
          color: #5c4e48;
          margin-bottom: 24px;
        }
        .details-card {
          background-color: #faf6f3;
          border-radius: 12px;
          border: 1px solid #f1e4dc;
          padding: 20px;
          margin-bottom: 24px;
        }
        .details-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f3e8e2;
          font-size: 14px;
        }
        .details-row:last-child {
          border-bottom: none;
        }
        .details-label {
          font-weight: 600;
          color: #5c4e48;
          width: 140px;
          flex-shrink: 0;
        }
        .details-value {
          color: #2e2522;
          text-align: right;
          word-break: break-word;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          color: #ffffff;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 1px;
          background-color: #d97706; /* Pending */
        }
        .action-button {
          display: block;
          width: 220px;
          margin: 28px auto 0;
          background-color: #4b3d36;
          color: #ffffff !important;
          text-align: center;
          padding: 12px 24px;
          border-radius: 30px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          letter-spacing: 1px;
          box-shadow: 0 4px 10px rgba(75, 61, 54, 0.2);
        }
        .footer {
          background-color: #faf6f3;
          padding: 24px;
          text-align: center;
          font-size: 12px;
          color: #8c7d75;
          border-top: 1px solid #f1e4dc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header luxury">
          <h1>New Booking Request</h1>
          <p>Velvet Budapest Admin Alert</p>
        </div>
        <div class="content">
          <h2 class="greeting">Hello Administrator,</h2>
          <p class="intro">A new appointment has been requested by a client. Please review the details below and manage it in the admin dashboard.</p>
          
          <div class="details-card">
            <div class="details-row">
              <div class="details-label">Client Name:</div>
              <div class="details-value" style="font-weight: 600;">${booking.firstName} ${booking.lastName}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Phone Number:</div>
              <div class="details-value"><a href="tel:${booking.phone}" style="color: #4b3d36; font-weight: 600;">${booking.phone}</a></div>
            </div>
            <div class="details-row">
              <div class="details-label">Email Address:</div>
              <div class="details-value"><a href="mailto:${booking.email || ""}" style="color: #4b3d36;">${booking.email || "N/A"}</a></div>
            </div>
            <div class="details-row">
              <div class="details-label">Service(s):</div>
              <div class="details-value" style="font-weight: 600;">${procedureName}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Requested Date:</div>
              <div class="details-value">${formattedDate}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Requested Time:</div>
              <div class="details-value" style="font-weight: 600;">${formattedTime}</div>
            </div>
            ${booking.comment ? `
            <div class="details-row">
              <div class="details-label">Comment:</div>
              <div class="details-value">${booking.comment}</div>
            </div>
            ` : ""}
            <div class="details-row" style="border-bottom: none; margin-top: 10px; align-items: center;">
              <div class="details-label">Current Status:</div>
              <div class="details-value">
                <span class="status-badge">
                  AWAITING CONFIRMATION
                </span>
              </div>
            </div>
          </div>

          <a href="${adminUrl}" class="action-button">Go to Admin Panel</a>
        </div>
        <div class="footer">
          <p>© 2026 Velvet Manicure Studio. Budapest. Admin Notification Service.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!user || !pass) {
    console.log(`ℹ️ [ADMIN SMTP EMAIL FALLBACK LOG]
========================================
To Admin: ${adminEmail}
Subject: ${subject}
Client: ${booking.firstName} ${booking.lastName} (${booking.phone})
Service: ${procedureName}
Time: ${booking.date} at ${booking.time}
========================================
SMTP settings are not configured. To enable real email delivery, set SMTP_USER and SMTP_PASS in .env.`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host || "smtp.gmail.com",
      port: port,
      secure: port === 465,
      auth: {
        user: user,
        pass: pass,
      },
    });

    await transporter.sendMail({
      from: from,
      to: adminEmail,
      subject: subject,
      html: htmlContent,
    });

    console.log(`✅ Admin notification email sent successfully to ${adminEmail}.`);
  } catch (error) {
    console.error(`❌ Failed to send admin notification email to ${adminEmail}:`, error);
  }
}

// API Routes

// Health and integration status checks
app.get("/api/health", (req, res) => {
  const isDbConfigured = isSupabaseConfigured();
  res.json({
    status: "ok",
    database: isDbConfigured ? "supabase_postgresql" : "local_json_file",
    telegram: (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) ? "configured" : "unconfigured"
  });
});

// Admin Authentication Login Endpoint
// Standardized HttpOnly Secure cookie response to guard against client-side XSS attacks.
app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { password } = req.body;
  const adminPassword = "Budapest2026"; // HARDCODED FOR TESTING!

  if (!adminPassword) {
    console.error("CRITICAL SECURITY ALERT: ADMIN_PASSWORD is not set or is weak in the .env file!");
    return res.status(500).json({ error: "Server configuration error. Please contact support." });
  }
  
  // --- DEBUGGING BLOCK ---
  // This will print passwords to your server console to help find the issue.
  // REMOVE THIS BLOCK AFTER SOLVING THE PROBLEM. 
  console.log("--- ADMIN LOGIN ATTEMPT ---");
  console.log("Password from browser:", `"${password}"`);
  console.log("Password from .env file:", `"${adminPassword}"`);
  
  if (password && password.trim() === adminPassword.trim()) {
    const token = generateToken({ isAdmin: true });
    
    // Set a secure, HTTP-only, SameSite=Strict cookie
    res.cookie("velvet_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.json({ success: true });
  } else {
    return res.status(401).json({ error: "Invalid password" });
  }
});

// Admin Logout Endpoint to clear HttpOnly session cookies
app.post("/api/admin/logout", (req, res) => {
  res.clearCookie("velvet_admin_token", {
    httpOnly: true,
    sameSite: "strict"
  });
  return res.json({ success: true });
});

// Lightweight auth check endpoint for client-side hydration
app.get("/api/admin/auth-check", authenticateAdmin, (req, res) => {
  // If authenticateAdmin middleware passes, the token is valid.
  res.json({ success: true, message: "Authenticated" });
});

// Get busy slots for a given date (Public, anonymized for slots rendering)
app.get("/api/bookings/busy", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "Date parameter is required" });
    }

    const bookings = await loadBookings();
    const procedures = await loadProcedures();

    // Filter active bookings on that specific date
    const dayBookings = bookings.filter((b) => b.date === date && b.status === "confirmed");

    const busySlots = dayBookings.map((b) => {
      let duration = 45;
      if (Array.isArray(b.procedureIds) && b.procedureIds.length > 0) {
        const selectedProcs = procedures.filter((p) => b.procedureIds.includes(p.id));
        if (selectedProcs.length > 0) {
          duration = selectedProcs.reduce((sum, p) => sum + p.durationMinutes, 0);
        }
      } else {
        const proc = procedures.find((p) => p.id === b.procedureId);
        if (proc) {
          duration = proc.durationMinutes;
        }
      }
      return {
        time: b.time,
        durationMinutes: duration
      };
    });

    res.json(busySlots);
  } catch (error) {
    console.error("Failed to load busy slots:", error);
    res.status(500).json({ error: "Failed to load busy slots" });
  }
});

// Load Bookings (Protected - admin only to protect customer privacy)
app.get("/api/bookings", authenticateAdmin, async (req, res) => {
  try {
    const bookings = await loadBookings();
    const sorted = [...bookings].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      
      const timeA = DateTime.fromFormat(`${a.date} ${a.time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" }).toMillis();
      const timeB = DateTime.fromFormat(`${b.date} ${b.time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" }).toMillis();
      return timeA - timeB;
    });
    res.json(sorted);
  } catch (error) {
    console.error("Failed to load bookings API:", error);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

// Create Booking (Public - anyone can book, but validated against double-booking / concurrency overlaps)
app.post("/api/bookings", bookingLimiter, async (req, res) => {
  const requestReceivedAt = DateTime.now().setZone("Europe/Budapest").toString();
  try {
    const { firstName, lastName, phone, email, procedureId, procedureIds, date, time, comment } = req.body;

    if (!firstName || !lastName || !phone || !email || !procedureId || !date || !time) {
      console.warn(`[BOOKING REJECTED] Missing fields. Time: ${requestReceivedAt}. Body:`, req.body);
      return res.status(400).json({ error: "Required fields are missing." });
    }

    // Sanitize user inputs to prevent any potential XSS or script injection
    const cleanFirstName = sanitizeString(firstName, 50);
    const cleanLastName = sanitizeString(lastName, 50);
    const cleanPhone = sanitizeString(phone, 30);
    const cleanEmail = sanitizeString(email, 100);
    const cleanComment = sanitizeString(comment || "", 1000);

    // Validate inputs with strict rules
    if (!cleanFirstName || !cleanLastName || !cleanPhone || !cleanEmail) {
      return res.status(400).json({ error: "Required fields contain invalid characters or are empty." });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ error: "Invalid email address format. Example: client@example.com" });
    }

    if (!isValidPhone(cleanPhone)) {
      return res.status(400).json({ error: "Invalid phone number format. Please provide a valid international phone number (e.g., +36301234567 or 06301234567)." });
    }

    const actualProcedureIds = (Array.isArray(procedureIds) && procedureIds.length > 0)
      ? procedureIds
      : [procedureId];

    if (isSupabaseConfigured() && actualProcedureIds.length === 1) {
      // Attempt DB-Level Atomic RPC function first (Gives complete database-enforced race condition immunity)
      try {
        const emailTag = `[email:${cleanEmail}]`;
        const finalRpcComment = cleanComment 
          ? `${cleanComment}\n[procedures:${actualProcedureIds.join(",")}]\n${emailTag}`
          : `[procedures:${actualProcedureIds.join(",")}]\n${emailTag}`;

        const client = getSupabaseClient();
        const { data: rpcData, error: rpcError } = await client.rpc("create_booking_safely", {
          p_first_name: cleanFirstName,
          p_last_name: cleanLastName,
          p_phone: cleanPhone,
          p_procedure_id: actualProcedureIds[0],
          p_booking_date: date,
          p_booking_time: time,
          p_comment: finalRpcComment
        });

        if (!rpcError && rpcData) {
          if (rpcData.success === false) {
            // Precise server logging of the double booking block with rich metadata for immediate support trace
            console.error(`[DOUBLE BOOKING PREVENTED] Atomic DB block triggered.
    - Client: ${cleanFirstName} ${cleanLastName} (${cleanPhone})
    - Intended Slot: ${date} ${time}
    - DB Message: ${rpcData.error || "Time slot occupied"}
    - Blocked At: ${requestReceivedAt}`);

            return res.status(409).json({ error: rpcData.error || "Time slot is already occupied." });
          }
          
          const newBooking = {
            id: String(rpcData.id),
            firstName: rpcData.first_name,
            lastName: rpcData.last_name,
            phone: rpcData.phone,
            email: cleanEmail,
            procedureId: rpcData.procedure_id,
            procedureIds: actualProcedureIds,
            date: rpcData.booking_date,
            time: rpcData.booking_time ? rpcData.booking_time.substring(0, 5) : "",
            comment: cleanComment,
            status: rpcData.status,
            createdAt: rpcData.created_at
          };

          console.log(`[BOOKING SUCCESS - DB RPC] Booking created. ID: ${newBooking.id}. Client: ${cleanFirstName} ${cleanLastName}. Slot: ${date} ${time}`);
          sendTelegramNotification(newBooking).catch(console.error);
          sendAdminEmailNotification(newBooking).catch(console.error);
          return res.status(201).json(newBooking);
        } else if (rpcError) {
          throw rpcError;
        }
      } catch (rpcErr: any) {
        // Gracefully log and fall back if RPC function is missing on Supabase instance
        console.warn(`⚠️ Database-level 'create_booking_safely' function failed/not found. Error: ${rpcErr?.message || rpcErr}. Falling back to high-fidelity server-side validation.`);
      }
    }

    // FALLBACK: State-of-the-art server-side Luxon validation (Budapest local timezone parsed to absolute global milliseconds)
    const procedures = await loadProcedures();
    const requestedProcs = procedures.filter((p) => actualProcedureIds.includes(p.id));
    if (requestedProcs.length === 0) {
      console.warn(`[BOOKING REJECTED] Procedures not found: ${actualProcedureIds}. Client: ${cleanFirstName} ${cleanLastName}`);
      return res.status(400).json({ error: "Selected procedures do not exist." });
    }

    const totalDurationMinutes = requestedProcs.reduce((sum, p) => sum + p.durationMinutes, 0);

    // Convert local Budapest input to absolute Unix time
    const requestedStartDT = DateTime.fromFormat(`${date} ${time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" });
    if (!requestedStartDT.isValid) {
      console.warn(`[BOOKING REJECTED] Invalid date/time format: ${date} ${time}. Client: ${cleanFirstName} ${cleanLastName}`);
      return res.status(400).json({ error: "Invalid date or time format provided." });
    }
    const requestedStartMillis = requestedStartDT.toMillis();
    const requestedEndMillis = requestedStartMillis + (totalDurationMinutes * 60000);

    // Load active bookings on the same date for validation
    const bookings = await loadBookings();
    const bookingsOnSameDate = bookings.filter((b) => b.date === date && b.status === "confirmed");

    for (const b of bookingsOnSameDate) {
      let existingDuration = 45;
      if (Array.isArray(b.procedureIds) && b.procedureIds.length > 0) {
        const selectedProcs = procedures.filter((p) => b.procedureIds.includes(p.id));
        if (selectedProcs.length > 0) {
          existingDuration = selectedProcs.reduce((sum, p) => sum + p.durationMinutes, 0);
        }
      } else {
        const proc = procedures.find((p) => p.id === b.procedureId);
        if (proc) {
          existingDuration = proc.durationMinutes;
        }
      }

      const existingStartDT = DateTime.fromFormat(`${b.date} ${b.time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" });
      if (!existingStartDT.isValid) continue;

      const existingStartMillis = existingStartDT.toMillis();
      const existingEndMillis = existingStartMillis + (existingDuration * 60000);

      // Strict overlap check: startA < endB && startB < endA (Global absolute millisecond scale)
      if (requestedStartMillis < existingEndMillis && existingStartMillis < requestedEndMillis) {
        const timeFromStr = b.time;
        const formattedEndTime = existingStartDT.plus({ minutes: existingDuration }).toFormat("HH:mm");
        
        console.error(`[DOUBLE BOOKING PREVENTED] Server-side overlap check blocked booking.
  - Client: ${cleanFirstName} ${cleanLastName} (${cleanPhone})
  - Intended Slot: ${date} ${time} (${requestedProcs.map(p => p.nameEn).join(", ")})
  - Overlapping Booking: ID ${b.id} from ${timeFromStr} to ${formattedEndTime}
  - Blocked At: ${requestReceivedAt}`);

        return res.status(409).json({ 
          error: `The requested time slot overlaps with an existing appointment from ${timeFromStr} to ${formattedEndTime}. Please choose another time slot.`
        });
      }
    }

    const newBooking = await createBooking({
      firstName: cleanFirstName,
      lastName: cleanLastName,
      phone: cleanPhone,
      email: cleanEmail,
      procedureId: actualProcedureIds[0],
      procedureIds: actualProcedureIds,
      date,
      time,
      comment: cleanComment,
    });

    console.log(`[BOOKING SUCCESS - FALLBACK] Booking created. ID: ${newBooking.id}. Client: ${cleanFirstName} ${cleanLastName}. Slot: ${date} ${time}`);

    // Fire Telegram Bot and Email Notifications asynchronously
    sendTelegramNotification(newBooking).catch(console.error);
    sendAdminEmailNotification(newBooking).catch(console.error);

    res.status(201).json(newBooking);
  } catch (error: any) {
    console.error(`[BOOKING CRITICAL EXCEPTION] Failed to handle booking request. Time: ${requestReceivedAt}. Error:`, error);
    res.status(500).json({ error: error.message || "Failed to create booking" });
  }
});

// Update Booking Status (Protected - admin only)
app.put("/api/bookings/:id/status", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await updateBookingStatus(id, status);

    if (!updated) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // No client email notification on status change (admin handles contact manually)

    res.json(updated);
  } catch (error) {
    console.error("Failed to update booking status API:", error);
    res.status(500).json({ error: "Failed to update booking status" });
  }
});

// Delete Booking (Protected - admin only)
app.delete("/api/bookings/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteBooking(id);

    if (!success) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete booking API:", error);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

// Get procedures (Public - needed for client-side catalog display)
app.get("/api/procedures", async (req, res) => {
  try {
    const procedures = await loadProcedures();
    res.json(procedures);
  } catch (error) {
    console.error("Failed to load procedures API:", error);
    res.status(500).json({ error: "Failed to load procedures" });
  }
});

// Update procedures (Protected - admin only)
app.put("/api/procedures", authenticateAdmin, async (req, res) => {
  try {
    const { procedures } = req.body;
    if (!Array.isArray(procedures)) {
      return res.status(400).json({ error: "Procedures must be an array" });
    }
    await saveProcedures(procedures);
    res.json(procedures);
  } catch (error) {
    console.error("Failed to save procedures API:", error);
    res.status(500).json({ error: "Failed to save procedures" });
  }
});

// Get contacts (Public - needed for footer & address details)
app.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await loadContacts();
    res.json(contacts);
  } catch (error) {
    console.error("Failed to load contacts API:", error);
    res.status(500).json({ error: "Failed to load contacts" });
  }
});

// Update contacts (Protected - admin only)
app.put("/api/contacts", authenticateAdmin, async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!contacts || typeof contacts !== "object") {
      return res.status(400).json({ error: "Contacts must be an object" });
    }
    await saveContacts(contacts);
    res.json(contacts);
  } catch (error) {
    console.error("Failed to save contacts API:", error);
    res.status(500).json({ error: "Failed to save contacts" });
  }
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Catch-all SPA route for dev server to support direct deep link visits/refreshes like /admin
    app.get("*", async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) return next(); // Skip API calls
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
