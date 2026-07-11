import assert from "node:assert/strict";
import test from "node:test";
import { DateTime } from "luxon";
import { findBookingConflict, validateBookingDateTime } from "../src/lib/bookingValidation";
import type { Booking, Procedure } from "../src/types";

const procedure: Procedure = {
  id: "manicure", nameEn: "Manicure", nameRu: "Маникюр", nameHu: "Manikűr",
  price: 5000, durationMinutes: 60, descriptionEn: "", descriptionRu: "", descriptionHu: "",
};
const now = DateTime.fromISO("2026-07-11T09:00:00", { zone: "Europe/Budapest" });

test("allows a future 15-minute slot that ends by 20:00", () => {
  assert.equal(validateBookingDateTime("2026-07-12", "19:00", 60, now), null);
});

test("rejects past, off-grid, and after-hours slots", () => {
  assert.match(validateBookingDateTime("2026-07-10", "10:00", 60, now) || "", /past/i);
  assert.match(validateBookingDateTime("2026-07-12", "10:10", 60, now) || "", /working hours/i);
  assert.match(validateBookingDateTime("2026-07-12", "19:15", 60, now) || "", /working hours/i);
});

test("finds a pending booking conflict and ignores cancelled bookings", () => {
  const booking: Booking = {
    id: "1", firstName: "Test", lastName: "Client", phone: "+3612345678",
    procedureId: "manicure", procedureIds: ["manicure"], date: "2026-07-12", time: "11:00",
    status: "pending", createdAt: "2026-07-01T00:00:00.000Z",
  };
  assert.equal(findBookingConflict([booking], [procedure], "2026-07-12", "11:30", 60)?.booking.id, "1");
  assert.equal(findBookingConflict([{ ...booking, status: "cancelled" }], [procedure], "2026-07-12", "11:30", 60), null);
});
