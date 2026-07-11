import { DateTime } from "luxon";
import type { Booking, Procedure } from "../types";

export const SALON_OPENING_MINUTES = 10 * 60;
export const SALON_CLOSING_MINUTES = 20 * 60;
export const BOOKING_INTERVAL_MINUTES = 15;

export function parseTimeToMinutes(time: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function validateBookingDateTime(
  date: unknown,
  time: unknown,
  durationMinutes: number,
  now = DateTime.now().setZone("Europe/Budapest")
): string | null {
  if (typeof date !== "string" || typeof time !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return "Date must use YYYY-MM-DD and time must use HH:MM.";
  }

  const start = DateTime.fromFormat(`${date} ${time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" });
  const startMinutes = parseTimeToMinutes(time);
  if (!start.isValid || startMinutes === null) return "Invalid date or time format provided.";
  if (start.startOf("day") < now.startOf("day")) return "Bookings cannot be made for past dates.";
  if (startMinutes < SALON_OPENING_MINUTES || startMinutes % BOOKING_INTERVAL_MINUTES !== 0 || startMinutes + durationMinutes > SALON_CLOSING_MINUTES) {
    return "Selected time is outside salon working hours.";
  }
  if (start <= now.plus({ minutes: BOOKING_INTERVAL_MINUTES })) return "Please select a time at least 15 minutes from now.";
  return null;
}

export interface BookingConflict {
  booking: Booking;
  endTime: string;
}

export function findBookingConflict(
  bookings: Booking[],
  procedures: Procedure[],
  date: string,
  time: string,
  requestedDurationMinutes: number
): BookingConflict | null {
  const requestedStart = DateTime.fromFormat(`${date} ${time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" });
  if (!requestedStart.isValid) return null;
  const requestedEnd = requestedStart.plus({ minutes: requestedDurationMinutes });

  for (const booking of bookings) {
    if (booking.date !== date || booking.status === "cancelled") continue;
    const existingStart = DateTime.fromFormat(`${booking.date} ${booking.time}`, "yyyy-MM-dd HH:mm", { zone: "Europe/Budapest" });
    if (!existingStart.isValid) continue;

    const procedureIds = booking.procedureIds?.length ? booking.procedureIds : [booking.procedureId];
    const duration = procedures
      .filter((procedure) => procedureIds.includes(procedure.id))
      .reduce((total, procedure) => total + procedure.durationMinutes, 0) || 45;
    const existingEnd = existingStart.plus({ minutes: duration });

    if (requestedStart < existingEnd && existingStart < requestedEnd) {
      return { booking, endTime: existingEnd.toFormat("HH:mm") };
    }
  }

  return null;
}
