import React, { useState, useEffect, useMemo } from "react";
import { X, Calendar, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Booking, Procedure } from "../types";
import { useLanguage } from "../lib/LanguageContext";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProcedure?: string;
  onBookingSuccess: (booking: Booking) => void;
  procedures: Procedure[];
}

export default function BookingModal({ isOpen, onClose, preselectedProcedure, onBookingSuccess, procedures }: BookingModalProps) {
  const { language, t, formatPrice } = useLanguage();
  // Hidden services stay visible to the administrator but must never be offered
  // in the public booking flow.
  const bookableProcedures = useMemo(
    () => procedures.filter((procedure) => !procedure.isHidden),
    [procedures]
  );
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [procedure, setProcedure] = useState("");
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [comment, setComment] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<Booking | null>(null);

  const [busySlots, setBusySlots] = useState<{ time: string; durationMinutes: number }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Sync preselected procedure when modal opens
  useEffect(() => {
    if (preselectedProcedure) {
      setProcedure(preselectedProcedure);
      setSelectedProcedures([preselectedProcedure]);
    } else if (bookableProcedures.length > 0) {
      setProcedure(bookableProcedures[0].id); // Default to first visible service
      setSelectedProcedures([bookableProcedures[0].id]);
    } else {
      setProcedure("");
      setSelectedProcedures([]);
    }
  }, [preselectedProcedure, isOpen, bookableProcedures]);

  // Set default date to tomorrow
  useEffect(() => {
    if (!isOpen) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split("T")[0];
    setDate(dateString);
  }, [isOpen]);

  // Fetch busy slots when date changes
  useEffect(() => {
    if (!date || !isOpen) return;

    let active = true;
    const fetchBusySlots = async () => {
      setIsLoadingSlots(true);
      try {
        const response = await fetch(`/api/bookings/busy?date=${date}`);
        if (response.ok) {
          const data = await response.json();
          if (active) {
            setBusySlots(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch busy slots:", err);
      } finally {
        if (active) {
          setIsLoadingSlots(false);
        }
      }
    };

    fetchBusySlots();
    return () => {
      active = false;
    };
  }, [date, isOpen]);

  // Dynamically compute available slots for the selected procedures and date
  const availableSlots = useMemo(() => {
    if (!date || !selectedProcedures.length || !bookableProcedures.length) return [];
    
    // Sum of duration of all selected procedures
    const duration = bookableProcedures
      .filter((p) => selectedProcedures.includes(p.id))
      .reduce((sum, p) => sum + p.durationMinutes, 0);

    const parseTimeToMinutes = (timeStr: string): number => {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    };

    const startMins = 10 * 60; // 10:00 (Salon opening)
    const endMins = 20 * 60;   // 20:00 (Salon closing)
    const interval = 15;       // 15 minute steps

    const candidates: string[] = [];

    // Check if the selected date is today in Europe/Budapest
    const todayBudapest = new Date().toLocaleDateString("sv", { timeZone: "Europe/Budapest" });
    let minMinutesLimit = 0;

    if (date === todayBudapest) {
      const options = { timeZone: "Europe/Budapest", hour: "2-digit", minute: "2-digit", hour12: false } as const;
      const timeStr = new Date().toLocaleTimeString("en-US", options);
      const [nowH, nowM] = timeStr.split(":").map(Number);
      minMinutesLimit = nowH * 60 + nowM + 15; // 15-minute buffer
    }

    for (let currentMins = startMins; currentMins + duration <= endMins; currentMins += interval) {
      // Filter out past slots for today
      if (date === todayBudapest && currentMins < minMinutesLimit) {
        continue;
      }

      const candidateEnd = currentMins + duration;
      let hasOverlap = false;

      for (const busy of busySlots) {
        if (!busy.time) continue;
        const bStart = parseTimeToMinutes(busy.time);
        const bEnd = bStart + busy.durationMinutes;

        // Overlap: S_candidate < E_busy AND S_busy < E_candidate
        if (currentMins < bEnd && bStart < candidateEnd) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        const h = Math.floor(currentMins / 60);
        const mins = currentMins % 60;
        candidates.push(`${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
      }
    }

    return candidates;
  }, [date, selectedProcedures, busySlots, bookableProcedures]);

  // Auto-select first available slot when slots load or change
  useEffect(() => {
    if (availableSlots.length > 0) {
      if (!availableSlots.includes(time)) {
        setTime(availableSlots[0]);
      }
    } else {
      setTime("");
    }
  }, [availableSlots, date, selectedProcedures]);

  const handleDateChange = (val: string) => {
    const minDate = getMinDate();
    if (val < minDate) {
      setDate(minDate);
      setError(t({
        en: "Selecting a past date is not allowed.",
        ru: "Нельзя выбрать прошедшую дату.",
        hu: "Múltbeli dátum kiválasztása nem megengedett."
      }));
    } else {
      setDate(val);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim() || selectedProcedures.length === 0 || !date || !time) {
      setError(t("bookingErrorAllFields"));
      return;
    }

    // Client-side strict email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t({
        en: "Please enter a valid email address.",
        ru: "Пожалуйста, введите корректный адрес электронной почты.",
        hu: "Kérjük, adjon meg egy érvényes e-mail címet."
      }));
      return;
    }

    // Client-side phone verification
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, "");
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setError(t({
        en: "Please enter a valid phone number (e.g., +36301234567).",
        ru: "Пожалуйста, введите корректный номер телефона (например, +36301234567).",
        hu: "Kérjük, adjon meg egy érvényes telefonszámot (pl. +36301234567)."
      }));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          procedureId: selectedProcedures[0],
          procedureIds: selectedProcedures,
          date,
          time,
          comment: comment.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to submit booking");
      }

      const newBooking = await response.json();
      setSuccessBooking(newBooking);
      onBookingSuccess(newBooking);

      // Reset form
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setComment("");
    } catch (err: any) {
      if (err.message.includes("occupied") || err.message.includes("taken") || err.message.includes("overlap") || err.message.includes("overlaps")) {
        setError(t({
          en: "This time slot is no longer available. Please select another time slot.",
          ru: "Это время уже забронировано. Пожалуйста, выберите другое свободное время.",
          hu: "Ez az időpont már foglalt. Kérjük, válasszon egy másik időpontot."
        }));
      } else {
        setError(err.message || "Server connection error. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const handleModalClose = () => {
    setSuccessBooking(null);
    setError(null);
    onClose();
  };

  const timeSlots = [
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleModalClose}
            className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg md:max-w-3xl lg:max-w-4xl overflow-hidden rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl z-10 max-h-[95vh] sm:max-h-[90vh] flex flex-col mt-auto sm:mt-0"
          >
            {/* Header / Top banner */}
            <div className="bg-brand-900 px-6 py-5 sm:py-6 text-white relative shrink-0">
              <button
                onClick={handleModalClose}
                className="absolute top-4 right-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                id="close-booking-modal"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-300" />
                <span className="text-xs font-bold tracking-widest text-brand-200 uppercase">{t("bookingModalOnlineLabel")}</span>
              </div>
              <h2 className="mt-1 font-serif text-2xl font-light">
                {t("bookingModalTitle")}
              </h2>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1 scrollbar-thin">
              {successBooking ? (
                /* Success view */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-6 text-center max-w-md mx-auto"
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-4">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="font-serif text-2xl text-brand-950">{t("bookingSuccessTitle")}</h3>
                  <p className="mt-2 text-xs text-brand-600 max-w-xs mx-auto">
                    {t("bookingSuccessDesc")}
                  </p>

                  {/* Summary receipt card */}
                  <div className="mt-6 rounded-xl bg-brand-50 p-4 text-left border border-brand-100 text-xs text-brand-900 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-brand-500 font-medium">{t("bookingReceiptClient")}</span>
                      <span className="font-semibold">{successBooking.firstName} {successBooking.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-500 font-medium">{t("bookingReceiptService")}</span>
                      <span className="font-semibold text-right max-w-[200px]">
                        {(() => {
                          const pIds = successBooking.procedureIds && successBooking.procedureIds.length > 0 
                            ? successBooking.procedureIds 
                            : [successBooking.procedureId];
                          const selectedProcs = procedures.filter(proc => pIds.includes(proc.id));
                          return selectedProcs.map(p => t(p, "name")).join(" + ");
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-500 font-medium">{t("bookingReceiptDateTime")}</span>
                      <span className="font-semibold">{successBooking.date} at {successBooking.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-500 font-medium">{t("bookingReceiptPhone")}</span>
                      <span className="font-semibold">{successBooking.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-brand-500 font-medium">{t("bookingReceiptStatus")}</span>
                      <span className="font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px]">
                        {t("bookingReceiptStatusPending")}
                      </span>
                    </div>
                  </div>

                  {/* Confirmation Warning/Info Alert Box */}
                  <div className="mt-4 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs text-left flex items-start gap-2.5 shadow-sm">
                    <span className="text-base leading-none">⚠️</span>
                    <div>
                      <p className="font-bold">
                        {t({
                          ru: "Требуется подтверждение администратора!",
                          hu: "Adminisztrátori megerősítés szükséges!",
                          en: "Administrator confirmation required!"
                        })}
                      </p>
                      <p className="text-[11px] text-amber-700/90 mt-0.5 leading-relaxed">
                        {t({
                          ru: "Ваша запись успешно отправлена, но находится в статусе ожидания. Пожалуйста, дождитесь звонка или сообщения от нашего менеджера для окончательного подтверждения бронирования.",
                          hu: "A foglalása sikeresen elküldve, de még várakozó státuszban van. Kérjük, várja meg, amíg munkatársunk felveszi Önnel a kapcsolatot a foglalás végleges megerősítéséhez.",
                          en: "Your booking is successfully submitted but is currently pending. Please wait for our manager to contact you via phone or message to finalize the confirmation."
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleModalClose}
                    className="mt-8 w-full rounded-full bg-brand-900 py-3 text-sm font-bold text-white hover:bg-brand-950 transition-colors cursor-pointer"
                  >
                    {t("bookingReceiptBtnClose")}
                  </button>
                </motion.div>
              ) : (
                /* Form view */
                <form onSubmit={handleSubmit} className="space-y-5 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-5">
                  {error && (
                    <div className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-600 border border-rose-100 md:col-span-2">
                      ⚠️ {error}
                    </div>
                  )}

                  {/* Left Column: Personal info & comments */}
                  <div className="space-y-4 md:col-span-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      {/* First name */}
                      <div>
                        <label className="block text-xs font-semibold text-brand-800" htmlFor="booking-firstname">
                          {t("bookingLabelFirstName")}
                        </label>
                        <input
                          type="text"
                          id="booking-firstname"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder={t("bookingPlaceholderFirstName")}
                          className="mt-1 w-full rounded-xl border border-brand-200 bg-brand-50/30 px-3.5 py-3 sm:py-2.5 text-sm text-brand-950 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 transition-all"
                        />
                      </div>

                      {/* Last name */}
                      <div>
                        <label className="block text-xs font-semibold text-brand-800" htmlFor="booking-lastname">
                          {t("bookingLabelLastName")}
                        </label>
                        <input
                          type="text"
                          id="booking-lastname"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder={t("bookingPlaceholderLastName")}
                          className="mt-1 w-full rounded-xl border border-brand-200 bg-brand-50/30 px-3.5 py-3 sm:py-2.5 text-sm text-brand-950 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-semibold text-brand-800" htmlFor="booking-phone">
                          {t("bookingLabelPhone")}
                        </label>
                        <input
                          type="tel"
                          id="booking-phone"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t("bookingPlaceholderPhone")}
                          className="mt-1 w-full rounded-xl border border-brand-200 bg-brand-50/30 px-3.5 py-3 sm:py-2.5 text-sm text-brand-950 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 transition-all"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-semibold text-brand-800" htmlFor="booking-email">
                          {t("bookingLabelEmail")}
                        </label>
                        <input
                          type="email"
                          id="booking-email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t("bookingPlaceholderEmail")}
                          className="mt-1 w-full rounded-xl border border-brand-200 bg-brand-50/30 px-3.5 py-3 sm:py-2.5 text-sm text-brand-950 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 transition-all"
                        />
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-xs font-semibold text-brand-800" htmlFor="booking-comment">
                        {t("bookingLabelComment")}
                      </label>
                      <textarea
                        id="booking-comment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={t("bookingPlaceholderComment")}
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-brand-200 bg-brand-50/30 px-3.5 py-3 sm:py-2.5 text-sm text-brand-950 focus:border-brand-400 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Right Column: Procedures selection, calendar, and time slots */}
                  <div className="space-y-4 md:col-span-1">
                    {/* Procedure selection */}
                    <div>
                      <label className="block text-xs font-semibold text-brand-800 mb-1.5">
                        {t("bookingLabelProcedure")} ({t({ ru: "можно выбрать несколько", hu: "többet is választhat", en: "can select multiple" })})
                      </label>
                      <div className="space-y-2 max-h-40 overflow-y-auto border border-brand-200 bg-brand-50/10 p-2 rounded-xl scrollbar-thin">
                        {bookableProcedures.map((p) => {
                          const isSelected = selectedProcedures.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setSelectedProcedures((prev) => {
                                  if (isSelected) {
                                    if (prev.length <= 1) return prev; // keep at least 1
                                    return prev.filter((id) => id !== p.id);
                                  } else {
                                    return [...prev, p.id];
                                  }
                                });
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-sm sm:text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-brand-50/80 border-brand-400 text-brand-950 font-medium shadow-sm"
                                  : "bg-white border-brand-100 text-brand-700 hover:border-brand-200"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-brand-300 text-brand-900 focus:ring-brand-500 h-3.5 w-3.5 shrink-0 cursor-pointer"
                                />
                                <span className="truncate font-medium">{t(p, "name")}</span>
                              </div>
                              <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2">
                                <span className="text-brand-500 font-mono text-[9px] leading-none">{p.durationMinutes} {t("bookingMinutes")}</span>
                                <span className="text-brand-700 font-mono text-[10px] font-semibold leading-none">{formatPrice(p.price)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 md:grid-cols-1">
                      {/* Date Picker */}
                      <div>
                        <label className="block text-xs font-semibold text-brand-800" htmlFor="booking-date">
                          {t("bookingLabelDate")}
                        </label>
                        <div className="relative mt-1">
                          <input
                            type="date"
                            id="booking-date"
                            required
                            min={getMinDate()}
                            value={date}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="w-full rounded-xl border border-brand-200 bg-brand-50/30 px-3.5 py-2.5 text-sm text-brand-950 focus:border-brand-400 focus:outline-none cursor-pointer font-medium"
                          />
                        </div>
                      </div>

                      {/* Dynamic Time Slot Picker Grid */}
                      <div>
                        <label className="block text-xs font-semibold text-brand-800 mb-1.5">
                          {t("bookingLabelSelectTime")}
                        </label>

                        {isLoadingSlots ? (
                          <div className="flex items-center justify-center py-5 gap-2 bg-brand-50/30 rounded-xl border border-dashed border-brand-200">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                            <span className="text-[11px] text-brand-600 font-medium">
                              {t({ ru: "Загрузка свободных окон...", hu: "Szabad időpontok betöltése...", en: "Loading available slots..." })}
                            </span>
                          </div>
                        ) : availableSlots.length > 0 ? (
                          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                            {availableSlots.map((slot) => {
                              const isSelected = time === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setTime(slot)}
                                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all text-center cursor-pointer min-h-[36px] flex items-center justify-center ${
                                    isSelected
                                      ? "bg-brand-500 text-white border-brand-500 shadow-sm font-bold"
                                      : "bg-white text-brand-950 border-brand-200 hover:bg-brand-50 hover:border-brand-300"
                                  }`}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-100 text-center text-[11px] text-amber-800">
                            ⚠️ {t("bookingNoSlots")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary receipt card */}
                  <div className="md:col-span-2">
                    {(() => {
                      const selectedProcs = procedures.filter(p => selectedProcedures.includes(p.id));
                      if (selectedProcs.length === 0) return null;
                      const totalDuration = selectedProcs.reduce((acc, p) => acc + p.durationMinutes, 0);
                      const totalPrice = selectedProcs.reduce((acc, p) => acc + p.price, 0);
                      return (
                        <div className="bg-brand-50/70 border border-brand-100 rounded-xl p-3.5 shadow-sm space-y-2">
                          <div className="flex items-center justify-between border-b border-brand-200/50 pb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
                              {t({ ru: "Выбранные процедуры", hu: "Kiválasztott szolgáltatások", en: "Selected Services" })} ({selectedProcs.length})
                            </span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                            <div className="flex items-center gap-1.5 text-brand-800">
                              <Clock className="h-4 w-4 text-brand-500 shrink-0" />
                              <span className="font-medium text-xs">
                                {t({ ru: "Длительность:", hu: "Időtartam:", en: "Duration:" })}
                              </span>
                              <strong className="text-xs font-bold text-brand-950">{totalDuration} {t("bookingMinutes")}</strong>
                            </div>
                            <div className="flex items-center gap-1.5 text-brand-900 font-mono">
                              <span className="text-brand-600 font-sans text-xs">
                                {t({ ru: "Стоимость:", hu: "Összesen:", en: "Total price:" })}
                              </span>
                              <strong className="text-sm font-bold text-brand-950 font-mono">
                                {formatPrice(totalPrice)}
                              </strong>
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-amber-700/90 leading-relaxed italic pt-1.5 border-t border-brand-200/30">
                            {t({
                              en: "* Please note: Shown prices are preliminary. The final cost may vary based on custom additions or extra materials agreed with the master.",
                              ru: "* Обратите внимание: Указанные цены являются предварительными. Окончательная стоимость зависит от сложности или материалов, добавленных во время визита.",
                              hu: "* Kérjük vegye figyelembe: A feltüntetett árak előzetesek. A végleges összeg a plusz szolgáltatások és felhasznált anyagok függvényében változhat."
                            })}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Submit Button */}
                  <div className="md:col-span-2 pt-2 shrink-0">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full rounded-full bg-brand-500 py-3 text-base sm:text-sm font-bold text-white shadow-lg shadow-brand-200 hover:bg-brand-600 transition-colors disabled:bg-brand-300 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      {isLoading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>{t("bookingSubmittingBtn")}</span>
                        </>
                      ) : (
                        <span>{t("bookingSubmitBtn")}</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
