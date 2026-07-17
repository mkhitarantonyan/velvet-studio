import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Portfolio from "./components/Portfolio";
import Procedures from "./components/Procedures";
import Contacts from "./components/Contacts";
import BookingModal from "./components/BookingModal";
import AdminPanel from "./components/AdminPanel";
import { Booking, Procedure, SalonContacts, PortfolioItem } from "./types";
import { Sparkles, Mail, Phone, MapPin, Instagram, ShieldAlert, CheckCircle2, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "./lib/LanguageContext";
import logoImg from "/assets/images/logo-02.png";

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const [isAdminPath, setIsAdminPath] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Will be verified by an API call
  const [authChecked, setAuthChecked] = useState(false); // To prevent UI flicker
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [preselectedProcedure, setPreselectedProcedure] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [contacts, setContacts] = useState<SalonContacts | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [activeSection, setActiveSection] = useState("hero");

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info">("success");

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Check if we are on the /admin route (either path or hash)
  const checkAdminRoute = () => {
    const isPath = window.location.pathname === "/admin" || window.location.hash === "#admin";
    setIsAdminPath(isPath);
  };

  useEffect(() => {
    checkAdminRoute();
    window.addEventListener("hashchange", checkAdminRoute);
    window.addEventListener("popstate", checkAdminRoute);
    
    // Simple custom popstate support
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      checkAdminRoute();
    };

    return () => {
      window.removeEventListener("hashchange", checkAdminRoute);
      window.removeEventListener("popstate", checkAdminRoute);
    };
  }, []);

  // Fetch all initial data
  const fetchBookings = async () => {
    if (!isAuthenticated) return;

    try {
      const res = await fetch("/api/bookings", {
        headers: {
        }
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = Array.isArray(data) ? data.map((b: any) => ({ ...b, id: String(b.id) })) : [];
        setBookings(normalized);
      } else if (res.status === 401) {
        handleAdminLogout(false); // Don't show toast on session expiry
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  const fetchProcedures = async () => {
    try {
      const res = await fetch("/api/procedures");
      if (res.ok) {
        const data = await res.json();
        const normalizedProcedures = data.map((p: Procedure) => ({
          ...p,
          isHidden: p.isHidden ?? false,
        }));
        setProcedures(normalizedProcedures);
      }
    } catch (err) {
      console.error("Error fetching procedures:", err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch (err) {
      console.error("Error fetching portfolio:", err);
    }
  };

  // Check authentication status on initial load
  const checkAuthStatus = async () => {
    try {
      // A lightweight endpoint to check the cookie without fetching all data
      const res = await fetch("/api/admin/auth-check"); // This endpoint needs to be created
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    fetchProcedures();
    fetchContacts();
    fetchPortfolio();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
      // Poll for bookings every 15 seconds to keep admin view real-time
      const interval = setInterval(() => {
        fetchBookings();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Monitor scroll position for active navbar highlight
  useEffect(() => {
    if (isAdminPath) return;

    const handleScroll = () => {
      const sections = ["hero", "portfolio", "procedures", "contacts"];
      const scrollPosition = window.scrollY + 120; // sticky header offset

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAdminPath]);

  // Handle Admin Password Login Form Submit
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      setIsAuthenticated(true);
      showToast(language === "ru" ? "Авторизация прошла успешно!" : "Welcome back, Admin!", "success");
      // Bookings will be fetched by the useEffect hook watching `isAuthenticated`
    } catch (err: any) {
      setLoginError(t("adminLoginError") || err.message);
    }
  };

  const handleAdminLogout = async (showToastOnSuccess = true) => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch (err) {
      console.error("Failed to clear secure session cookie during logout:", err);
    }
    if (showToastOnSuccess) {
      showToast(language === "ru" ? "Вы вышли из системы." : "You have been logged out.", "info");
    }
    setIsAuthenticated(false);
    setAdminPassword("");
    // Redirect to home
    window.location.hash = "";
    window.history.pushState({}, "", "/");
    setIsAdminPath(false);
  };

  // Update Booking Status Handler (Admin)
  const handleUpdateStatus = async (id: string, status: "confirmed" | "cancelled") => {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update booking status");

      const updatedBooking = await res.json();
      const normalizedUpdated = { ...updatedBooking, id: String(updatedBooking.id) };
      
      setBookings((prev) =>
        prev.map((b) => (String(b.id) === String(id) ? normalizedUpdated : b))
      );

      const statusMsg = status === "confirmed" 
        ? (language === "ru" ? "подтверждена" : "confirmed") 
        : (language === "ru" ? "отклонена" : "cancelled");
        
      showToast(
        language === "ru" 
          ? `Запись ${updatedBooking.firstName} ${updatedBooking.lastName} успешно ${statusMsg}!`
          : `Appointment for ${updatedBooking.firstName} ${updatedBooking.lastName} successfully ${statusMsg}!`,
        status === "confirmed" ? "success" : "info"
      );
    } catch (err) {
      console.error(err);
      showToast(
        language === "ru" ? "Ошибка при обновлении статуса" : "Error updating booking status",
        "info" // Using 'info' for errors to match the toast's icon style (ShieldAlert)
      );
    }
  };

  // Delete Booking Handler (Admin)
  const handleDeleteBooking = async (id: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "DELETE",
        // No body or special headers needed, cookie provides auth
      });

      if (!res.ok) throw new Error("Failed to delete booking");

      setBookings((prev) => prev.filter((b) => String(b.id) !== String(id)));
      showToast(
        language === "ru" 
          ? "Запись удалена из системы" 
          : "Booking successfully removed from the system", 
        "info"
      );
    } catch (err) {
      console.error(err);
      showToast(
        language === "ru" ? "Не удалось удалить запись" : "Failed to delete booking",
        "info"
      );
    }
  };

  // Add Booking Handler (Manual by admin or customer success flow)
  const handleAddBooking = async (bookingData: Omit<Booking, "id" | "status" | "createdAt">) => {
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create booking");
      }

      const newBooking = await res.json();
      const normalizedNew = { ...newBooking, id: String(newBooking.id) };
      setBookings((prev) => [normalizedNew, ...prev]);
      
      showToast(
        language === "ru"
          ? `Клиент ${newBooking.firstName} успешно записан на ${newBooking.time}!`
          : `Client ${newBooking.firstName} successfully booked for ${newBooking.time}!`,
        "success"
      );
    } catch (err: any) {
      throw new Error(err.message || "Error creating booking");
    }
  };

  // Save Dynamic Procedures (Admin)
  const handleUpdateProcedures = async (updatedProcedures: Procedure[]) => {
    try {
      const res = await fetch("/api/procedures", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ procedures: updatedProcedures }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update procedures");
      }
      
      const saved = await res.json();
      // Нормализуем ответ (на всякий случай)
      const normalizedSaved = saved.map((p: Procedure) => ({
        ...p,
        isHidden: p.isHidden ?? false,
      }));
      setProcedures(normalizedSaved);
      console.log("📦 Процедуры в App после сохранения:", normalizedSaved);
      return normalizedSaved; // ← важно: возвращаем для AdminPanel
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Delete Procedures Handler (Admin)
  const handleDeleteProcedures = async (ids: string[]) => {
    try {
      const res = await fetch(`/api/procedures`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const err = new Error(responseData.error || "Failed to delete procedures");
        (err as any).deleted = responseData.deleted;
        (err as any).blocked = responseData.blocked;
        
        if (responseData.deleted && responseData.deleted.length > 0) {
          setProcedures((prev) => prev.filter((p) => !responseData.deleted.includes(p.id)));
        }
        
        throw err;
      }
      
      setProcedures((prev) => prev.filter((p) => !ids.includes(p.id)));

    } catch (err) {
      console.error("Error deleting procedures:", err);
      // Re-throw for the AdminPanel to handle its UI state
      throw err;
    }
  };

  // Save Dynamic Contacts & Salon info (Admin)
  const handleUpdateContacts = async (updatedContacts: SalonContacts) => {
    try {
      const res = await fetch("/api/contacts", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedContacts),
      });

      if (!res.ok) throw new Error("Failed to update contacts");
      
      const saved = await res.json();
      setContacts(saved);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdatePortfolio = async (updatedPortfolio: PortfolioItem[]) => {
    try {
      const res = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updatedPortfolio }),
      });

      if (!res.ok) {
        throw new Error("Failed to update portfolio");
      }
      
      // Re-fetch portfolio to get the latest state from server
      await fetchPortfolio();

    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Handle CTA button in services cards
  const handleSelectProcedure = (procedureName: string) => {
    setPreselectedProcedure(procedureName);
    setIsBookingOpen(true);
  };

  const handleOpenBookingDefault = () => {
    setPreselectedProcedure("");
    setIsBookingOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-brand-200 selection:text-brand-900 bg-white">
      
      {/* Toast Notification Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
            className="fixed top-24 left-1/2 z-50 flex items-center gap-2 rounded-full bg-brand-950 px-6 py-3.5 text-xs font-semibold text-white shadow-xl min-w-[280px]"
          >
            {toastType === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            )}
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Header
        onOpenBooking={handleOpenBookingDefault}
        activeSection={activeSection}
      />

      <main className="grow flex flex-col">
        {isAdminPath && !isAuthenticated ? (
          /* Render password screen if on /admin and not authenticated (or auth check is in progress) */
          <div className="grow flex items-center justify-center bg-brand-50/40 p-4 min-h-[calc(100vh-80px)]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white border border-brand-200/50 rounded-2xl shadow-xl overflow-hidden my-8"
            >
              <div className="bg-brand-900 p-8 text-white text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
                  <Lock className="h-5 w-5 text-brand-200" />
                </div>
                <h2 className="font-serif text-2xl font-light tracking-wide">{t("adminLoginTitle")}</h2>
                <p className="text-xs text-brand-300 mt-1">Smart Nail Studio • Budapest</p>
              </div>
              
              <form onSubmit={handleAdminLogin} className="p-8 space-y-4">
                {loginError && (
                  <div className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-600 border border-rose-100">
                    ⚠️ {loginError}
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-semibold text-brand-800 uppercase tracking-wider">
                    {t("adminLoginPasswordLabel")}
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={t("adminLoginPasswordPlaceholder")}
                    className="mt-1 w-full rounded-lg border border-brand-200 bg-brand-50/20 px-3.5 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-full bg-brand-500 hover:bg-brand-600 text-white py-3 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow"
                >
                  <span>{t("adminLoginBtn")}</span>
                </button>

                <div className="text-center pt-4 border-t border-brand-100">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = "";
                      window.history.pushState({}, "", "/");
                      setIsAdminPath(false);
                    }}
                    className="text-xs font-semibold text-brand-500 hover:text-brand-800 transition-colors cursor-pointer"
                  >
                    ← {language === "ru" ? "Вернуться на главную" : language === "hu" ? "Vissza a főoldalra" : "Back to salon home"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        ) : (
          <>
            {isAdminPath && isAuthenticated ? (
              /* Auth'd Admin Panel view */
              <AdminPanel
                bookings={bookings}
                procedures={procedures}
                contacts={contacts}
                portfolio={portfolio}
                onUpdateStatus={handleUpdateStatus}
                onDeleteBooking={handleDeleteBooking}
                onAddBooking={handleAddBooking}
                onUpdateProcedures={handleUpdateProcedures}
                onDeleteProcedures={handleDeleteProcedures}
                onUpdateContacts={handleUpdateContacts}
                onUpdatePortfolio={handleUpdatePortfolio}
                onLogout={handleAdminLogout}
              />
            ) : (
              /* Public Salon Client view */
              <>
                {/* 1. Hero */}
                <Hero onOpenBooking={handleOpenBookingDefault} />

                {/* Animated Marquee Strip */}
                <div className="bg-brand-900 text-white py-4 overflow-hidden relative border-y border-white/10">
                  <div className="whitespace-nowrap animate-marquee flex items-center gap-16 text-xs font-bold tracking-widest uppercase">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand-300 animate-pulse" /> 
                      {language === "ru" ? "Идеальный маникюр • Безупречная форма" : language === "hu" ? "Tökéletes manikűr • Hibátlan forma" : "Perfect manicure • Flawless shape"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand-300 animate-pulse" /> 
                      {language === "ru" ? "Стерилизация по евро-стандартам 100%" : language === "hu" ? "100%-os európai szintű sterilizáció" : "100% professional European sterilization"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand-300 animate-pulse" /> 
                      {language === "ru" ? "Премиум уход, кофе, чай и сладости" : language === "hu" ? "Prémium ápolás, tea, kávé és édességek" : "Premium care, tea, coffee & delicious sweets"}
                    </span>
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand-300 animate-pulse" /> 
                      {language === "ru" ? "Скидка 10% на первый визит по промокоду «VELVET_FIRST»" : language === "hu" ? "10% kedvezmény az első látogatásra «VELVET_FIRST»" : "10% off first visit with promo code «VELVET_FIRST»"}
                    </span>
                  </div>
                </div>

                {/* 2. Portfolio Showcase */}
                <Portfolio />

                {/* 3. Procedures & Services List */}
                <Procedures 
                  procedures={procedures} 
                  onSelectProcedure={handleSelectProcedure} 
                />

                {/* 4. Contacts, Address and Map */}
                <Contacts contacts={contacts} />
              </>
            )}
          </>
        )}
      </main>
      
      {/* Public Footer (Hidden on active Admin Dashboard) */}
      {!(isAdminPath && isAuthenticated) && (
        <footer className="bg-brand-950 text-brand-200 border-t border-brand-900/60 py-12">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-8 md:grid-cols-4">
                  
                  {/* Brand info */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <img src={logoImg} alt="Smart Nail Studio Logo" className="h-10 w-auto" />
                      <div>
                        <span className="font-serif text-xl font-bold tracking-widest text-white uppercase">{t("logoTitle")}</span>
                        <span className="block text-[10px] tracking-[0.2em] text-brand-400 font-medium uppercase">{t("logoSubtitle")}</span>
                      </div>
                    </div>
                    <p className="text-xs text-brand-400 leading-relaxed">
                      {t("footerDesc")}
                    </p>
                  </div>

                  {/* Links */}
                  <div>
                    <h4 className="font-serif text-sm font-semibold text-white tracking-wider uppercase mb-4">{t("footerNavTitle")}</h4>
                    <ul className="space-y-2 text-xs text-brand-400">
                      <li><a href="#hero" className="hover:text-white transition-colors">{language === "ru" ? "Главная" : language === "hu" ? "Főoldal" : "Home"}</a></li>
                      <li><a href="#portfolio" className="hover:text-white transition-colors">{t("navGallery")}</a></li>
                      <li><a href="#procedures" className="hover:text-white transition-colors">{t("navServices")}</a></li>
                      <li><a href="#contacts" className="hover:text-white transition-colors">{t("navContacts")}</a></li>
                    </ul>
                  </div>

                  {/* Info details */}
                  {contacts && (
                    <div>
                      <h4 className="font-serif text-sm font-semibold text-white tracking-wider uppercase mb-4">{t("footerContactTitle")}</h4>
                      <ul className="space-y-3 text-xs text-brand-400">
                        <li className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                          <a href={`tel:${contacts.phone1}`} className="hover:text-white transition-colors">{contacts.phone1}</a>
                        </li>
                        <li className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                          <a href={`mailto:${contacts.email}`} className="hover:text-white transition-colors">{contacts.email}</a>
                        </li>
                        <li className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" />
                          <span>{language === "ru" ? contacts.addressRu : language === "hu" ? contacts.addressHu : contacts.addressEn}</span>
                        </li>
                      </ul>
                    </div>
                  )}

                  {/* Slogan */}
                  <div>
                    <h4 className="font-serif text-sm font-semibold text-white tracking-wider uppercase mb-4">{t("footerSocialTitle")}</h4>
                    <div className="flex items-center gap-3">
                      {contacts && (
                        <a 
                          href={`https://instagram.com/${contacts.instagram.replace('@', '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-900 text-brand-400 hover:bg-brand-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Instagram className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <div className="mt-4 bg-brand-900/40 p-3 rounded-lg border border-brand-900 text-[10px] text-brand-400 leading-relaxed">
                      {t("footerSocialPromo")}
                    </div>
                  </div>

                </div>

                <div className="mt-12 border-t border-brand-900/60 pt-6 flex flex-col md:flex-row items-center justify-between text-[11px] text-brand-500">
                  <p>© {new Date().getFullYear()} {t("logoTitle")} {language === "ru" ? "Студия маникюра" : language === "hu" ? "Körömstúdió" : "Manicure Studio"}. {language === "ru" ? "Все права защищены." : "All rights reserved."}</p>
                  <div className="flex gap-4 mt-2 md:mt-0">
                    <a href="#" className="hover:text-brand-300">{t("footerPrivacy")}</a>
                    <span>•</span>
                    <a href="#" className="hover:text-brand-300">{t("footerTerms")}</a>
                  </div>
                </div>
              </div>
            </footer>
          )}

      {/* Online booking modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        preselectedProcedure={preselectedProcedure}
        onBookingSuccess={() => {
          fetchBookings(); // Refresh bookings dynamically
        }}
        procedures={procedures}
      />

    </div>
  );
}
