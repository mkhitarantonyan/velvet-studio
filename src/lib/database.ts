import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Booking, Procedure, SalonContacts } from "../types";
import fs from "fs";
import path from "path";

let supabaseClient: SupabaseClient | null = null;

/**
 * Persist JSON fallback data without leaving a partially-written file behind if
 * the process stops while writing. The rename is atomic on the same volume.
 */
function writeJsonAtomically(filePath: string, value: unknown): void {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    throw error;
  }
}

/**
 * Checks if Supabase credentials are validly provided in the environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes("your-project") && !key.includes("your-anon-key"));
}

/**
 * Lazy initialization of Supabase client.
 * Throws configuration errors if keys are missing but isSupabaseConfigured was expected.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("your-project") || key.includes("your-anon-key")) {
    throw new Error(
      "❌ CRITICAL CONFIGURATION ERROR: Supabase database variables are not configured correctly in .env. " +
      "Application requires SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY to function."
    );
  }

  try {
    supabaseClient = createClient(url, key);
    return supabaseClient;
  } catch (error) {
    console.error("❌ CRITICAL: Failed to initialize Supabase client:", error);
    throw error;
  }
}

/**
 * Normalizes a procedure object to ensure it has an `isHidden` property.
 * Defaults to `false` if missing.
 */
function normalizeProcedure(p: any): Procedure {
  return {
    ...p,
    isHidden: p.isHidden ?? false,
  };
}

/**
 * 1. Bookings CRUD operations (supporting local file fallback)
 */
export async function loadBookings(): Promise<Booking[]> {
  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase is not configured. Loading bookings from local file 'bookings.json'.");
    const filePath = path.join(process.cwd(), "bookings.json");
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const list: any[] = JSON.parse(content);
        return list.map((b) => {
          let procedureIds = b.procedureIds;
          let comment = b.comment || "";
          let cleanComment = comment;
          if (!procedureIds || procedureIds.length === 0) {
            const match = comment.match(/\[procedures:\s*([a-f0-9\-a-zA-Z0-9_,]+)\]/i);
            if (match) {
              procedureIds = match[1].split(",").filter(Boolean);
              cleanComment = comment.replace(/\[procedures:\s*([a-f0-9\-a-zA-Z0-9_,]+)\]/i, "").trim();
            } else {
              procedureIds = b.procedureId ? [b.procedureId] : [];
            }
          }
          let email = b.email || "";
          const emailMatch = cleanComment.match(/\[email:\s*([^\]\s]+)\]/i);
          if (emailMatch) {
            email = emailMatch[1];
            cleanComment = cleanComment.replace(/\[email:\s*([^\]\s]+)\]/i, "").trim();
          }
          return {
            ...b,
            id: String(b.id),
            comment: cleanComment,
            procedureIds,
            email: email || b.email,
          } as Booking;
        });
      }
    } catch (err) {
      console.error("Failed to read bookings.json fallback:", err);
    }
    return [];
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bookings from Supabase:", error);
    throw error;
  }

  return (data || []).map((b): Booking => {
    const commentStr = b.comment || "";
    let procedureIds = (Array.isArray(b.procedure_ids) && b.procedure_ids.length > 0)
      ? b.procedure_ids
      : (b.procedure_id ? [b.procedure_id] : []);

    let cleanComment = commentStr;

    // Graceful fallback for older records without native procedure_ids array
    if (!b.procedure_ids || b.procedure_ids.length === 0) {
      const match = commentStr.match(/\[procedures:\s*([a-f0-9\-a-zA-Z0-9_,]+)\]/i);
      if (match) {
        procedureIds = match[1].split(",").filter(Boolean);
        cleanComment = commentStr.replace(/\[procedures:\s*([a-f0-9\-a-zA-Z0-9_,]+)\]/i, "").trim();
      }
    }
    let email = "";
    const emailMatch = cleanComment.match(/\[email:\s*([^\]\s]+)\]/i);
    if (emailMatch) {
      email = emailMatch[1];
      cleanComment = cleanComment.replace(/\[email:\s*([^\]\s]+)\]/i, "").trim();
    }
    return {
      id: String(b.id),
      firstName: b.first_name,
      lastName: b.last_name,
      phone: b.phone,
      email: email || undefined,
      procedureId: b.procedure_id,
      procedureIds,
      date: b.booking_date, // PostgreSQL DATE
      time: b.booking_time ? b.booking_time.substring(0, 5) : "", // Trims HH:MM:SS to HH:MM for client inputs
      comment: cleanComment,
      status: b.status as 'pending' | 'confirmed' | 'cancelled',
      createdAt: b.created_at,
    };
  });
}

export async function createBooking(booking: Omit<Booking, "id" | "createdAt" | "status">): Promise<Booking> {
  const pIds = booking.procedureIds && booking.procedureIds.length > 0 
    ? booking.procedureIds 
    : [booking.procedureId];

  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase is not configured. Creating booking in local file 'bookings.json'.");
    const filePath = path.join(process.cwd(), "bookings.json");
    let currentBookings: Booking[] = [];
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        currentBookings = JSON.parse(content);
      }
    } catch (err) {
      console.error("Failed to read bookings.json during create:", err);
    }

    const newBooking: Booking = {
      id: String(Date.now()),
      ...booking,
      procedureIds: pIds,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    currentBookings.push(newBooking);

    try {
      writeJsonAtomically(filePath, currentBookings);
    } catch (err) {
      console.error("Failed to write to bookings.json:", err);
      throw err;
    }

    return newBooking;
  }

  const metaTags = [];
  if (booking.email) {
    metaTags.push(`[email:${booking.email.trim()}]`);
  }
  const serializedMeta = metaTags.join("\n");
  const finalComment = booking.comment 
    ? `${booking.comment.trim()}\n${serializedMeta}`
    : serializedMeta;

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("bookings")
    .insert({
      first_name: booking.firstName,
      last_name: booking.lastName,
      phone: booking.phone,
      procedure_id: booking.procedureId, // Strict Foreign Key UUID reference
      procedure_ids: pIds, // Native array array
      booking_date: booking.date,         // Safe DATE mapping
      booking_time: booking.time,         // Safe TIME mapping
      comment: finalComment,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating booking in Supabase:", error);
    throw error;
  }

  return {
    id: String(data.id),
    firstName: data.first_name,
    lastName: data.last_name,
    phone: data.phone,
    email: booking.email,
    procedureId: data.procedure_id,
    procedureIds: pIds,
    date: data.booking_date,
    time: data.booking_time ? data.booking_time.substring(0, 5) : "",
    comment: booking.comment || "",
    status: data.status as 'pending' | 'confirmed' | 'cancelled',
    createdAt: data.created_at,
  };
}

export async function updateBookingStatus(id: string, status: "pending" | "confirmed" | "cancelled"): Promise<Booking | null> {
  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase is not configured. Updating booking status in local file 'bookings.json'.");
    const filePath = path.join(process.cwd(), "bookings.json");
    let currentBookings: Booking[] = [];
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        currentBookings = JSON.parse(content);
      }
    } catch (err) {
      console.error("Failed to read bookings.json during update:", err);
    }

    const index = currentBookings.findIndex((b) => b.id === id);
    if (index === -1) return null;

    currentBookings[index].status = status;

    try {
      writeJsonAtomically(filePath, currentBookings);
    } catch (err) {
      console.error("Failed to write to bookings.json:", err);
      throw err;
    }

    return currentBookings[index];
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select();

  if (error) {
    console.error("Error updating booking status in Supabase:", error);
    throw error;
  }

  if (!data || data.length === 0) return null;
  const b = data[0];
  let comment = b.comment || "";
  let email: string | undefined;
  const emailMatch = comment.match(/\[email:\s*([^\]\s]+)\]/i);
  if (emailMatch) {
    email = emailMatch[1];
    comment = comment.replace(/\[email:\s*([^\]\s]+)\]/i, "").trim();
  }
  const procedureIds = Array.isArray(b.procedure_ids) && b.procedure_ids.length > 0
    ? b.procedure_ids
    : (b.procedure_id ? [b.procedure_id] : []);
  return {
    id: String(b.id),
    firstName: b.first_name,
    lastName: b.last_name,
    phone: b.phone,
    email,
    procedureId: b.procedure_id,
    procedureIds,
    date: b.booking_date,
    time: b.booking_time ? b.booking_time.substring(0, 5) : "",
    comment,
    status: b.status as 'pending' | 'confirmed' | 'cancelled',
    createdAt: b.created_at,
  };
}

export async function deleteBooking(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase is not configured. Deleting booking from local file 'bookings.json'.");
    const filePath = path.join(process.cwd(), "bookings.json");
    let currentBookings: Booking[] = [];
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        currentBookings = JSON.parse(content);
      }
    } catch (err) {
      console.error("Failed to read bookings.json during delete:", err);
    }

    const filtered = currentBookings.filter((b) => String(b.id) !== String(id));
    if (filtered.length === currentBookings.length) return false;

    try {
      writeJsonAtomically(filePath, filtered);
    } catch (err) {
      console.error("Failed to write to bookings.json:", err);
      throw err;
    }

    return true;
  }

  const client = getSupabaseClient();
  
  // To prevent errors if the database ID column is integer/bigint vs string/UUID:
  const parsedId = parseInt(id, 10);
  if (!isNaN(parsedId) && String(parsedId) === String(id)) {
    // Attempt deleting as integer first
    const { error: intError } = await client.from("bookings").delete().eq("id", parsedId);
    if (!intError) return true;
  }

  // Fallback to deleting as original string
  const { error } = await client.from("bookings").delete().eq("id", id);
  if (error) {
    console.error("Error deleting booking from Supabase:", error);
    throw error;
  }
  return true;
}

/**
 * Seed data with fixed constant UUID strings to guarantee referential integrity and safe seeding.
 */
const DEFAULT_PROCEDURES: Procedure[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    nameEn: "Classic Manicure",
    nameRu: "Классический маникюр",
    nameHu: "Klasszikus manikűr",
    price: 5500,
    durationMinutes: 45,
    descriptionEn: "Hygienic treatment of the cuticle, shaping of the nail, nourishing oil and light hand massage.",
    descriptionRu: "Гигиеническая обработка кутикулы, придание формы свободному краю ногтя, питательное масло и легкий массаж рук.",
    descriptionHu: "A kutikula higiénikus kezelése, a köröm formázása, tápláló olaj és könnyű kézmasszázs."
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    nameEn: "Hardware Manicure",
    nameRu: "Аппаратный маникюр",
    nameHu: "Gépi manikűr",
    price: 6500,
    durationMinutes: 60,
    descriptionEn: "Modern safe technique of cuticle and nail fold treatment using a professional machine without soaking.",
    descriptionRu: "Безопасная современная техника обработки кутикулы и ногтевых валиков с помощью профессионального аппарата без размачивания.",
    descriptionHu: "A kutikula és a körömredők biztonságos, modern kezelése professzionális géppel, áztatás nélkül."
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    nameEn: "Manicure + Gel Polish",
    nameRu: "Маникюр + Покрытие гель-лак",
    nameHu: "Manikűr + Gél lakk",
    price: 8900,
    durationMinutes: 90,
    descriptionEn: "Combined treatment of nails, plate alignment with a base, solid premium long-lasting gel polish and top.",
    descriptionRu: "Комбинированная обработка ногтей, выравнивание ногтевой пластины базой, однотонное покрытие премиальным стойким гель-лаком и топ.",
    descriptionHu: "Kombinált körömkezelés, a körömlemez kiegyenlítése alappal, prémium tartós gél lakk fedés és top."
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    nameEn: "Nail Extension",
    nameRu: "Наращивание ногтей",
    nameHu: "Műköröm építés",
    price: 12500,
    durationMinutes: 120,
    descriptionEn: "Modeling of nails with gel/acrylic gel on forms, filing, creating desired length and shape, perfect glare.",
    descriptionRu: "Моделирование ногтей гелем/акригелем на формы, опил, придание желаемой длины и формы, идеальный блик.",
    descriptionHu: "Körömmodellezés zselével vagy akrilzselével sablonra, reszelés, a kívánt hosszúság és forma kialakítása."
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    nameEn: "Nail Design (all fingers)",
    nameRu: "Дизайн ногтей (все пальчики)",
    nameHu: "Körömdíszítés (minden ujj)",
    price: 2000,
    durationMinutes: 30,
    descriptionEn: "Art painting, stamping, rubbing, foil, gradient or sliders. Price depends on complexity.",
    descriptionRu: "Художественная роспись, стемпинг, втирка, фольга, градиент или слайдеры. Цена зависит от сложности рисунка.",
    descriptionHu: "Kézzel festett minták, nyomdázás, pigmentpor, fólia, ombre vagy matricák. Az ár a bonyolultságtól függ."
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    nameEn: "Removal + Care",
    nameRu: "Снятие покрытия + Уход",
    nameHu: "Eltávolítás + Ápolás",
    price: 2500,
    durationMinutes: 30,
    descriptionEn: "Gentle removal of previous gel polish with a milling cutter, shaping, soft buff polishing and strengthening treatment.",
    descriptionRu: "Бережное снятие предыдущего покрытия фрезой, придание формы, полировка ногтевой пластины мягким бафом и лечебный укрепитель ногтей.",
    descriptionHu: "A korábbi bevonat kíméletes eltávolítása csiszológéppel, formázás, kímélő polírozás és körömerősítő kezelés."
  }
];

/**
 * 2. Procedures CRUD operations
 */
export async function loadProcedures(): Promise<Procedure[]> {
  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase is not configured. Loading procedures from local file 'procedures.json'.");
    const filePath = path.join(process.cwd(), "procedures.json");
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        const procedures = JSON.parse(content);
        if (!Array.isArray(procedures)) return [];
        return procedures.map(normalizeProcedure);
      }
    } catch (err) {
      console.error("Failed to read procedures.json fallback:", err);
    }
    try {
      const normalizedDefaults = DEFAULT_PROCEDURES.map(normalizeProcedure);
      writeJsonAtomically(filePath, normalizedDefaults);
      return normalizedDefaults;
    } catch (err) {
      console.error("Failed to write default procedures.json:", err);
    }
    return DEFAULT_PROCEDURES.map(normalizeProcedure);
  }

  const client = getSupabaseClient();
  const { data, error } = await client.from("procedures").select("*");
  if (error) {
    console.error("Error fetching procedures from Supabase:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    await saveProcedures(DEFAULT_PROCEDURES);
    return DEFAULT_PROCEDURES.map(normalizeProcedure);
  }

  return data.map((p): Procedure => normalizeProcedure({
    id: String(p.id),
    nameEn: p.name_en,
    nameRu: p.name_ru,
    nameHu: p.name_hu,
    price: Number(p.price),
    durationMinutes: Number(p.duration_minutes),
    descriptionEn: p.description_en || "",
    descriptionRu: p.description_ru || "",
    descriptionHu: p.description_hu || "",
    isHidden: p.is_hidden,
  }));
}

export async function saveProcedures(procedures: Procedure[]): Promise<void> {
  const normalizedProcedures = procedures.map(normalizeProcedure);

  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase is not configured. Saving procedures to local file 'procedures.json'.");
    const filePath = path.join(process.cwd(), "procedures.json");
    try {
      writeJsonAtomically(filePath, normalizedProcedures);
    } catch (err) {
      console.error("Failed to write to procedures.json:", err);
      throw err;
    }
    return;
  }

  const client = getSupabaseClient();

  // `upsert` below only inserts new rows / updates existing ones — it never removes
  // rows that are missing from the payload. Without this step, a procedure deleted
  // in the admin panel (and no longer present in `procedures`) would stay in the
  // database forever and reappear after every reload. So we first diff against
  // what's actually in the table and explicitly delete anything that's gone missing.
  const { data: existingRows, error: fetchError } = await client.from("procedures").select("id");
  if (fetchError) {
    console.error("Error fetching existing procedure ids from Supabase:", fetchError);
    throw fetchError;
  }
  const incomingIds = new Set(normalizedProcedures.map((p) => String(p.id)));
  const idsToRemove = (existingRows || [])
    .map((row: any) => String(row.id))
    .filter((id: string) => !incomingIds.has(id));

  if (idsToRemove.length > 0) {
    const { error: deleteError } = await client.from("procedures").delete().in("id", idsToRemove);
    if (deleteError) {
      console.error("Error removing deleted procedures from Supabase:", deleteError);
      throw deleteError;
    }
  }

  const mapped = normalizedProcedures.map((p) => ({
    id: p.id,
    name_en: p.nameEn,
    name_ru: p.nameRu,
    name_hu: p.nameHu,
    price: p.price,
    duration_minutes: p.durationMinutes,
    description_en: p.descriptionEn,
    description_ru: p.descriptionRu,
    description_hu: p.descriptionHu,
    is_hidden: p.isHidden,
  }));

  if (mapped.length > 0) {
    const { error } = await client.from("procedures").upsert(mapped);
    if (error) {
      console.error("Error saving procedures to Supabase:", error);
      throw error;
    }
  }
}

/**
 * Deletes one or more procedures immediately — used by the admin panel's single-row
 * "Delete" button and the multi-select "Delete selected" bulk action, independent of
 * the "Save All Changes" flow.
 *
 * If a procedure is still referenced by an existing booking, Supabase will reject the
 * delete (foreign key constraint) rather than throwing for the whole batch, that id is
 * reported back as "blocked" so the caller can tell the admin exactly which service(s)
 * could not be removed and why, while still deleting everything that was safe to.
 */
export async function deleteProcedures(ids: string[]): Promise<{ deleted: string[]; blocked: string[] }> {
  const uniqueIds = Array.from(new Set(ids.map(String)));
  if (uniqueIds.length === 0) return { deleted: [], blocked: [] };

  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase is not configured. Deleting procedures from local file 'procedures.json'.");
    const filePath = path.join(process.cwd(), "procedures.json");
    let current: Procedure[] = [];
    try {
      if (fs.existsSync(filePath)) {
        current = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
    } catch (err) {
      console.error("Failed to read procedures.json during delete:", err);
    }
    const idsSet = new Set(uniqueIds);
    const remaining = current.filter((p) => !idsSet.has(String(p.id)));
    const deleted = current.filter((p) => idsSet.has(String(p.id))).map((p) => String(p.id));
    try {
      writeJsonAtomically(filePath, remaining);
    } catch (err) {
      console.error("Failed to write procedures.json during delete:", err);
      throw err;
    }
    return { deleted, blocked: [] };
  }

  const client = getSupabaseClient();
  const { error } = await client.from("procedures").delete().in("id", uniqueIds);

  if (!error) {
    return { deleted: uniqueIds, blocked: [] };
  }

  // Bulk delete failed — most likely a foreign key violation because one of the
  // selected services is still referenced by an existing booking. Retry one by one
  // so everything that CAN be deleted still gets deleted.
  console.warn("Bulk procedure delete failed, retrying individually:", error.message);
  const deleted: string[] = [];
  const blocked: string[] = [];
  for (const id of uniqueIds) {
    const { error: singleError } = await client.from("procedures").delete().eq("id", id);
    if (singleError) {
      console.error(`Could not delete procedure ${id}:`, singleError.message);
      blocked.push(id);
    } else {
      deleted.push(id);
    }
  }
  return { deleted, blocked };
}

/**
 * 3. Contacts operations
 */
export async function loadContacts(): Promise<SalonContacts> {
  const initialContacts: SalonContacts = {
    phone1: "+36 (30) 123-4567",
    phone2: "+36 (1) 987-6543",
    email: "budapest@velvet-nails.hu",
    instagram: "@velvet_nails_budapest",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2695.5658607689953!2d19.0401717!3d47.497912!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4741dc41c3000001%3A0x8603683bf1e0ea!2sBudapest!5e0!3m2!1sen!2shu!4v1700000000000!5m2!1sen!2shu",
    addressEn: "Budapest, Andrássy út 12, 1061 Hungary",
    addressRu: "Будапешт, проспект Андраши 12, 1061 Венгрия",
    addressHu: "Budapest, Andrássy út 12, 1061 Magyarország",
    workingHoursEn: "Daily from 10:00 to 20:00",
    workingHoursRu: "Ежедневно с 10:00 до 20:00",
    workingHoursHu: "Naponta 10:00 és 20:00 között"
  };

  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase is not configured. Loading contacts from local file 'contacts.json'.");
    const filePath = path.join(process.cwd(), "contacts.json");
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
      }
    } catch (err) {
      console.error("Failed to read contacts.json fallback:", err);
    }
    try {
      writeJsonAtomically(filePath, initialContacts);
    } catch (err) {
      console.error("Failed to write default contacts.json:", err);
    }
    return initialContacts;
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from("contacts")
    .select("*")
    .eq("id", "main")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      await saveContacts(initialContacts);
      return initialContacts;
    }
    console.error("Error fetching contacts from Supabase:", error);
    throw error;
  }

  return {
    phone1: data.phone1,
    phone2: data.phone2 || "",
    email: data.email,
    instagram: data.instagram || "",
    mapUrl: data.map_url || "",
    addressEn: data.address_en || "",
    addressRu: data.address_ru || "",
    addressHu: data.address_hu || "",
    workingHoursEn: data.working_hours_en || "",
    workingHoursRu: data.working_hours_ru || "",
    workingHoursHu: data.working_hours_hu || "",
  };
}

export async function saveContacts(contacts: SalonContacts): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase is not configured. Saving contacts to local file 'contacts.json'.");
    const filePath = path.join(process.cwd(), "contacts.json");
    try {
      writeJsonAtomically(filePath, contacts);
    } catch (err) {
      console.error("Failed to write to contacts.json:", err);
      throw err;
    }
    return;
  }

  const client = getSupabaseClient();
  const { error } = await client.from("contacts").upsert({
    id: "main",
    phone1: contacts.phone1,
    phone2: contacts.phone2 || null,
    email: contacts.email,
    instagram: contacts.instagram || null,
    map_url: contacts.mapUrl || null,
    address_en: contacts.addressEn,
    address_ru: contacts.addressRu,
    address_hu: contacts.addressHu,
    working_hours_en: contacts.workingHoursEn,
    working_hours_ru: contacts.workingHoursRu,
    working_hours_hu: contacts.workingHoursHu,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error saving contacts to Supabase:", error);
    throw error;
  }
}
