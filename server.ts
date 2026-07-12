import dotenv from "dotenv";
dotenv.config();

process.env.TZ = "Europe/Budapest";

import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import crypto, { timingSafeEqual } from "crypto";
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
  loadPortfolio,
  savePortfolio,
} from "./src/lib/database";
import helmet from "helmet";
import { z } from "zod";

const app = express(); // <--- ДОБАВЬТЕ ТОЛЬКО ЭТУ СТРОКУ
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.google.com/maps/embed/"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for React inline scripts in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"] // If direct supabase calls exist from client
    }
  } : false,
  crossOriginEmbedderPolicy: false // Allows loading images from other origins like google maps
}));

import { createServer } from "http";
import { Server } from "socket.io";

// CORS: allow only the app's own origin(s) and local dev
const ALLOWED_ORIGINS: string[] = [
  process.env.APP_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[];

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true
  }
});



app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (origin is undefined) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
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

// The JSON fallback has no transactions. Serialize booking mutations in this
// process so a second request cannot validate a slot between the first request's
// validation and write. Supabase deployments still benefit from the database RPC.
let bookingMutationQueue: Promise<void> = Promise.resolve();
function withBookingMutationLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = bookingMutationQueue.then(operation, operation);
  bookingMutationQueue = result.then(() => undefined, () => undefined);
  return result;
}

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "FATAL: JWT_SECRET environment variable is not set. " +
      "Generate one with: openssl rand -hex 32 — then add it to .env. Refusing to start."
    );
  }
  return secret;
})();

function generateToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { algorithm: "HS256", expiresIn: "4h" });
}

function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
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
 * Input sanitization — strips HTML tags as a first layer of defense.
 * NOTE: This is NOT sufficient for XSS prevention on its own.
 * Always use escapeHtml() when interpolating user data into HTML contexts (emails, etc.).
 */
function sanitizeString(str: string, maxLength: number): string {
  if (!str) return "";
  return str
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .trim()
    .substring(0, maxLength);
}

/**
 * HTML output encoding — escapes characters that have special meaning in HTML.
 * Must be applied when interpolating any user-supplied data into HTML templates.
 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

/**
 * Constant-time string comparison to prevent timing-based side-channel attacks.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare against self to keep constant time, then return false
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
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
 * Sends an email notification to the client.
 */
async function sendEmailNotification(booking: any, type: "created" | "confirmed" | "cancelled") {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"Smart Nail Studio" <noreply@velvetnails.com>`;

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
    subject = "Smart Nail Studio - Booking Received / Запись получена / Foglalás regisztrálva";
    heading = "Thank you for booking! / Спасибо за запись! / Köszönjük a foglalást!";
    intro = "We have received your booking request. Our administrator will confirm your appointment shortly. / Мы получили вашу заявку на запись. Наш администратор подтвердит её в ближайшее время. / Megkaptuk foglalási igényét. Adminisztrátorunk hamarosan visszaigazolja.";
  } else if (type === "confirmed") {
    subject = "Smart Nail Studio - Booking CONFIRMED / Запись ПОДТВЕРЖДЕНА / Foglalás VISSZAIGAZOLVA";
    heading = "Your Booking is Confirmed! / Ваша запись подтверждена! / Foglalása visszaigazolva!";
    intro = "We are looking forward to seeing you at Smart Nail Studio! / Мы с нетерпением ждем вас в Smart Nail Studio! / Szeretettel várjuk Önt a Smart Nail Studio-ban!";
    statusColor = "#16a34a"; // Green
    statusLabel = "CONFIRMED / ПОДТВЕРЖДЕНО / VISSZAIGAZOLVA";
  } else if (type === "cancelled") {
    subject = "Smart Nail Studio - Booking Cancelled / Запись отменена / Foglalás törölve";
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
          <h1>SMART</h1>
          <p>Nail Studio Budapest</p>
        </div>
        <div class="content">
          <h2 class="greeting">Hello, ${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}!</h2>
          <p class="intro">${intro}</p>
          
          <div class="details-card">
            <div class="details-row">
              <div class="details-label">Service / Услуга / Szolgáltatás:</div>
              <div class="details-value" style="font-weight: 600;">${escapeHtml(procedureName)}</div>
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
              <div class="details-value">${escapeHtml(booking.phone)}</div>
            </div>
            ${booking.comment ? `
            <div class="details-row">
              <div class="details-label">Comments:</div>
              <div class="details-value">${escapeHtml(booking.comment)}</div>
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
          <p>© 2026 Smart Nail Studio. Budapest. All rights reserved.</p>
          <p>If you have any questions or need to reschedule, please call us at <a href="tel:+36301234567">+36 (30) 123-4567</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!user || !pass) {
    console.warn("SMTP is not configured; client notification was not sent. Set SMTP_USER and SMTP_PASS in .env to enable delivery.");
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

    console.log(`Client notification sent (type: ${type}).`);
  } catch (error) {
    console.error(`Failed to send client notification (type: ${type}):`, error);
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
  const adminUrl = `${process.env.APP_URL || "https://smartnails.com"}/admin`;

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
          <p>Smart Nail Studio Admin Alert</p>
        </div>
        <div class="content">
          <h2 class="greeting">Hello Administrator,</h2>
          <p class="intro">A new appointment has been requested by a client. Please review the details below and manage it in the admin dashboard.</p>
          
          <div class="details-card">
            <div class="details-row">
              <div class="details-label">Client Name:</div>
              <div class="details-value" style="font-weight: 600;">${escapeHtml(booking.firstName)} ${escapeHtml(booking.lastName)}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Phone Number:</div>
              <div class="details-value"><a href="tel:${escapeHtml(booking.phone)}" style="color: #4b3d36; font-weight: 600;">${escapeHtml(booking.phone)}</a></div>
            </div>
            <div class="details-row">
              <div class="details-label">Email Address:</div>
              <div class="details-value"><a href="mailto:${escapeHtml(booking.email || "")}" style="color: #4b3d36;">${escapeHtml(booking.email || "N/A")}</a></div>
            </div>
            <div class="details-row">
              <div class="details-label">Service(s):</div>
              <div class="details-value" style="font-weight: 600;">${escapeHtml(procedureName)}</div>
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
              <div class="details-value">${escapeHtml(booking.comment)}</div>
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
          <p>© 2026 Smart Nail Studio. Budapest. Admin Notification Service.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  if (!user || !pass) {
    console.warn("SMTP is not configured; admin notification was not sent. Set SMTP_USER and SMTP_PASS in .env to enable delivery.");
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

    console.log("Admin notification email sent.");
  } catch (error) {
    console.error("Failed to send admin notification email:", error);
  }
}

// API Routes

// Health check — minimal response, no infrastructure details exposed
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Admin Authentication Login Endpoint
app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("FATAL: ADMIN_PASSWORD is not set in .env — login is disabled.");
    return res.status(500).json({ error: "Server configuration error. Please contact support." });
  }

  if (password && safeCompare(password.trim(), adminPassword.trim())) {
    const token = generateToken({ isAdmin: true });

    res.cookie("velvet_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 4 * 60 * 60 * 1000, // 4 hours (matches JWT TTL)
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

// Admin Change Password Endpoint
app.post("/api/admin/change-password", authenticateAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: "Server configuration error." });
  }

  if (!currentPassword || !safeCompare(currentPassword.trim(), adminPassword.trim())) {
    return res.status(401).json({ error: "Invalid current password" });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long." });
  }

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    let passwordUpdated = false;
    
    if (fs.existsSync(envPath)) {
      let envFile = fs.readFileSync(envPath, "utf8");
      
      // Handle the case where ADMIN_PASSWORD is in the file
      if (/^ADMIN_PASSWORD=/m.test(envFile)) {
        envFile = envFile.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD="${newPassword.trim()}"`);
      } else {
        envFile += `\nADMIN_PASSWORD="${newPassword.trim()}"\n`;
      }
      fs.writeFileSync(envPath, envFile, "utf8");
      passwordUpdated = true;
    } else {
      console.warn("⚠️ .env file not found. Updating password only in memory. It will reset on server restart.");
    }
    
    // Update memory
    process.env.ADMIN_PASSWORD = newPassword.trim();
    
    return res.json({ success: true, message: passwordUpdated ? "Password updated permanently." : "Password updated for this session only." });
  } catch (err) {
    console.error("Failed to change password:", err);
    return res.status(500).json({ error: "Failed to save new password." });
  }
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
    // Pending requests reserve their slot as well; otherwise several clients can
    // submit overlapping requests before an administrator confirms one of them.
    const dayBookings = bookings.filter((b) => b.date === date && b.status !== "cancelled");

    const busySlots = dayBookings.map((b) => {
      let duration = 45;
      if (Array.isArray(b.procedureIds) && b.procedureIds.length > 0) {
        const pIds = b.procedureIds;
        const selectedProcs = procedures.filter((p) => pIds.includes(p.id));
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
  return withBookingMutationLock(async () => {
  const requestReceivedAt = DateTime.now().setZone("Europe/Budapest").toString();
  try {
    const { firstName, lastName, phone, email, procedureId, procedureIds, date, time, comment } = req.body;

    if (!firstName || !lastName || !phone || !email || !procedureId || !date || !time) {
      console.warn(`[BOOKING REJECTED] Missing required fields. Time: ${requestReceivedAt}.`);
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

    const actualProcedureIds = Array.from(new Set((Array.isArray(procedureIds) && procedureIds.length > 0)
      ? procedureIds
      : [procedureId]));

    if (!actualProcedureIds.every((id) => typeof id === "string" && id.length > 0)) {
      return res.status(400).json({ error: "Selected procedures are invalid." });
    }

    const procedures = await loadProcedures();
    const requestedProcs = procedures.filter((p) => actualProcedureIds.includes(p.id));
    if (requestedProcs.length !== actualProcedureIds.length) {
      console.warn("[BOOKING REJECTED] One or more requested procedures do not exist.");
      return res.status(400).json({ error: "Selected procedures do not exist." });
    }
    if (requestedProcs.some((procedure) => procedure.isHidden)) {
      return res.status(400).json({ error: "One or more selected services are unavailable." });
    }

    const totalDurationMinutes = requestedProcs.reduce((sum, p) => sum + p.durationMinutes, 0);

    // Convert local Budapest input to absolute Unix time
    if (typeof date !== "string" || typeof time !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: "Date must use YYYY-MM-DD and time must use HH:MM." });
    }

    const requestedStartDT = DateTime.fromFormat(`${date} ${time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" });
    if (!requestedStartDT.isValid) {
      console.warn("[BOOKING REJECTED] Invalid date or time format.");
      return res.status(400).json({ error: "Invalid date or time format provided." });
    }

    const now = DateTime.now().setZone("Europe/Budapest");
    const startMinutes = parseTimeToMinutes(time);
    const salonOpensAt = 10 * 60;
    const salonClosesAt = 20 * 60;

    if (requestedStartDT.startOf("day") < now.startOf("day")) {
      return res.status(400).json({ error: "Bookings cannot be made for past dates." });
    }
    if (startMinutes < salonOpensAt || startMinutes % 15 !== 0 || startMinutes + totalDurationMinutes > salonClosesAt) {
      return res.status(400).json({ error: "Selected time is outside salon working hours." });
    }
    if (requestedStartDT <= now.plus({ minutes: 15 })) {
      return res.status(400).json({ error: "Please select a time at least 15 minutes from now." });
    }

    const requestedStartMillis = requestedStartDT.toMillis();
    const requestedEndMillis = requestedStartMillis + (totalDurationMinutes * 60000);

    // Load active bookings on the same date for validation
    const bookings = await loadBookings();
    const bookingsOnSameDate = bookings.filter((b) => b.date === date && b.status !== "cancelled");

    for (const b of bookingsOnSameDate) {
      let existingDuration = 45;
      if (Array.isArray(b.procedureIds) && b.procedureIds.length > 0) {
        const pIds = b.procedureIds;
        const selectedProcs = procedures.filter((p) => pIds.includes(p.id));
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
        
        console.warn(`[DOUBLE BOOKING PREVENTED] Server-side overlap check. Existing booking ID: ${b.id}.`);

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

    console.log(`[BOOKING SUCCESS - FALLBACK] Booking created. ID: ${newBooking.id}.`);

    // Fire Email Notification asynchronously
    sendAdminEmailNotification(newBooking).catch(console.error);
    sendEmailNotification(newBooking, "created").catch(console.error);

    // Notify admin via Socket.io
    io.emit("booking:created", newBooking);

    res.status(201).json(newBooking);
  } catch (error: any) {
    console.error(`[BOOKING CRITICAL EXCEPTION] Failed to handle booking request. Time: ${requestReceivedAt}. Error:`, error);
    res.status(500).json({ error: error.message || "Failed to create booking" });
  }
  });
});

// Update Booking Status (Protected - admin only)
app.put("/api/bookings/:id/status", authenticateAdmin, async (req, res) => {
  return withBookingMutationLock(async () => {
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

    if (status === "confirmed" || status === "cancelled") {
      sendEmailNotification(updated, status).catch(console.error);
    }

    // Notify all admins about the status change
    io.emit("booking:updated", updated);

    res.json(updated);
  } catch (error) {
    console.error("Failed to update booking status API:", error);
    res.status(500).json({ error: "Failed to update booking status" });
  }
  });
});

// Delete Booking (Protected - admin only)
app.delete("/api/bookings/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteBooking(id);

    if (!success) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Notify admins about deletion
    io.emit("booking:deleted", id);

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

const procedureSchema = z.object({
  id: z.string().min(1),
  nameEn: z.string().min(1),
  nameRu: z.string().min(1),
  nameHu: z.string().min(1),
  price: z.number().min(0),
  durationMinutes: z.number().min(1),
  descriptionEn: z.string(),
  descriptionRu: z.string(),
  descriptionHu: z.string(),
  isHidden: z.boolean().optional()
});

const proceduresArraySchema = z.array(procedureSchema);

// Update procedures (Protected - admin only)
app.put("/api/procedures", authenticateAdmin, async (req, res) => {
  return withBookingMutationLock(async () => {
  try {
    // 1. Нормализуем входящие данные: гарантируем isHidden
    const rawProcedures = req.body.procedures;
    if (!Array.isArray(rawProcedures)) {
      return res.status(400).json({ error: "procedures must be an array" });
    }

    const proceduresWithDefaults = rawProcedures.map((p: any) => ({
      ...p,
      isHidden: p.isHidden ?? false, // если undefined или null -> false
    }));

    // 2. Валидируем
    const parseResult = proceduresArraySchema.safeParse(proceduresWithDefaults);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid procedures data", details: parseResult.error.issues });
    }

    const validatedProcedures = parseResult.data;

    // PUT replaces the complete catalogue. Do not allow it to silently remove a
    // service that is present in booking history (the local JSON fallback has no
    // foreign-key constraint to protect this for us).
    const incomingIds = new Set(validatedProcedures.map((procedure) => String(procedure.id)));
    const referencedProcedureIds = new Set<string>();
    for (const booking of await loadBookings()) {
      if (booking.procedureId) referencedProcedureIds.add(String(booking.procedureId));
      for (const procedureId of booking.procedureIds || []) {
        referencedProcedureIds.add(String(procedureId));
      }
    }
    const removedReferencedIds = [...referencedProcedureIds].filter((id) => !incomingIds.has(id));
    if (removedReferencedIds.length > 0) {
      return res.status(409).json({
        error: "Cannot remove services that are linked to existing bookings.",
        blocked: removedReferencedIds,
      });
    }

    // 3. Сохраняем
    console.log("📝 Сохраняем процедуры:", JSON.stringify(validatedProcedures, null, 2));
    await saveProcedures(validatedProcedures);
    console.log("✅ Процедуры сохранены");

    // 4. Возвращаем сохранённые данные (они уже нормализованы)
    res.json(validatedProcedures);
  } catch (error: any) {
    console.error("Failed to save procedures API:", error);
    const message = error?.message || "Failed to save procedures";
    const status = message.includes("linked to existing bookings") ? 409 : 500;
    res.status(status).json({ error: message });
  }
  });
});

// Delete Procedures (Protected - admin only)
app.delete("/api/procedures", authenticateAdmin, async (req, res) => {
  return withBookingMutationLock(async () => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid request: 'ids' must be a non-empty array." });
    }

    const bookings = await loadBookings();
    const procedures = await loadProcedures();
    
    const allProcedureIdsInBookings = new Set<string>();
    bookings.forEach(booking => {
      if (booking.procedureId) {
        allProcedureIdsInBookings.add(String(booking.procedureId));
      }
      if (Array.isArray(booking.procedureIds)) {
        booking.procedureIds.forEach(pid => allProcedureIdsInBookings.add(String(pid)));
      }
    });

    const idsToDelete: string[] = [];
    const blockedIds: string[] = [];

    ids.forEach(id => {
      if (allProcedureIdsInBookings.has(String(id))) {
        blockedIds.push(String(id));
      } else {
        idsToDelete.push(String(id));
      }
    });

    if (idsToDelete.length > 0) {
      const remainingProcedures = procedures.filter((p: any) => !idsToDelete.includes(String(p.id)));
      await saveProcedures(remainingProcedures);
    }

    if (blockedIds.length > 0) {
      const blockedNames = procedures.filter((p: any) => blockedIds.includes(String(p.id))).map((p: any) => p.nameEn).join(", ");
      return res.status(409).json({
        error: `Could not delete some services because they are linked to existing bookings: ${blockedNames}`,
        deleted: idsToDelete,
        blocked: blockedIds,
      });
    }

    res.json({ success: true, deleted: idsToDelete });
  } catch (error) {
    console.error("Failed to delete procedures API:", error);
    res.status(500).json({ error: "Failed to delete procedures" });
  }
  });
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

const contactsSchema = z.object({
  phone1: z.string().min(1),
  phone2: z.string(),
  email: z.string().email(),
  instagram: z.string(),
  mapUrl: z.string(),
  addressEn: z.string().min(1),
  addressRu: z.string().min(1),
  addressHu: z.string().min(1),
  workingHoursEn: z.string().min(1),
  workingHoursRu: z.string().min(1),
  workingHoursHu: z.string().min(1),
});

// Update contacts (Protected - admin only)
app.put("/api/contacts", authenticateAdmin, async (req, res) => {
  try {
    const parseResult = contactsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid contacts data", details: parseResult.error.issues });
    }
    const contactsToSave = parseResult.data;
    await saveContacts(contactsToSave);

    // After saving, load the contacts again to ensure we return the persisted state
    const updatedContacts = await loadContacts();
    res.json(updatedContacts);
  } catch (error) {
    console.error("Failed to save contacts API:", error);
    res.status(500).json({ error: "Failed to save contacts" });
  }
});
// Получить портфолио (Публичный)
app.get("/api/portfolio", async (req, res) => {
  try {
    const items = await loadPortfolio();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to load portfolio" });
  }
});

// Обновить портфолио (Только для админа)
app.put("/api/portfolio", authenticateAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items must be an array" });
    }
    await savePortfolio(items);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save portfolio" });
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


  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
