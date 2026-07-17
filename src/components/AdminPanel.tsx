import React, { useState, useEffect, useMemo } from "react";
import { Booking, Procedure, SalonContacts, PortfolioItem } from "../types";
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Search, 
  Clock, 
  Calendar, 
  Plus, 
  AlertCircle,
  FileText,
  FolderKanban,
  Save,
  Check,
  Edit3,
  MapPin,
  Mail,
  Phone,
  Instagram,
  Settings,
  ChevronRight,
  ChevronLeft,
  List,
  User,
  Globe,
  Sparkles,
  MessageSquare,
  Copy,
  ZoomIn,
  ZoomOut,
  Lock,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
  SlidersHorizontal,
  CheckSquare,
  Square,
  TrendingUp,
  Activity,
  ArrowUpDown,
  LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../lib/LanguageContext";

interface AdminPanelProps {
  bookings: Booking[];
  procedures: Procedure[];
  contacts: SalonContacts | null;
  portfolio: PortfolioItem[];
  onUpdateStatus: (id: string, status: 'confirmed' | 'cancelled') => Promise<void>;
  onDeleteBooking: (id: string) => Promise<void>;
  onAddBooking: (bookingData: Omit<Booking, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  onUpdateProcedures: (procedures: Procedure[]) => Promise<Procedure[]>;
  onDeleteProcedures: (ids: string[]) => Promise<any>;
  onUpdateContacts: (contacts: SalonContacts) => Promise<void>;
  onUpdatePortfolio: (items: PortfolioItem[]) => Promise<void>;
  onLogout: () => void;
}

export default function AdminPanel({ 
  bookings, 
  procedures, 
  contacts, 
  portfolio,
  onUpdateStatus, 
  onDeleteBooking, 
  onAddBooking,
  onUpdateProcedures,
  onDeleteProcedures,
  onUpdateContacts,
  onUpdatePortfolio,
  onLogout
}: AdminPanelProps) {
  const { language, t } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<"bookings" | "procedures" | "portfolio" | "contacts" | "settings">("bookings");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Portfolio search and category filters (Enhancement 1)
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [portfolioCategoryFilter, setPortfolioCategoryFilter] = useState("all");

  // Portfolio bulk selection mode (Enhancement 2)
  const [portfolioSelectedIds, setPortfolioSelectedIds] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkCategoryPreset, setBulkCategoryPreset] = useState<"manicure" | "pedicure" | "nail_art" | "custom">("manicure");
  const [bulkCategoryCustom, setBulkCategoryCustom] = useState("");

  // AI-powered translation states & actions
  const [translatingIds, setTranslatingIds] = useState<string[]>([]);
  const [translatingProcIds, setTranslatingProcIds] = useState<string[]>([]);

  const handleTranslatePortfolioItem = async (itemId: string) => {
    const item = localPortfolio.find(p => p.id === itemId);
    if (!item) return;

    const sourceLang = portfolioEditLang;
    const title = sourceLang === 'en' ? item.titleEn : sourceLang === 'ru' ? item.titleRu : item.titleHu;
    const description = sourceLang === 'en' ? item.descriptionEn : sourceLang === 'ru' ? item.descriptionRu : item.descriptionHu;

    if (!title && !description) {
      alert(language === "ru" ? "Заполните название или описание перед переводом!" : "Please fill in either the title or description before translating!");
      return;
    }

    setTranslatingIds(prev => [...prev, itemId]);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, sourceLang }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to translate");
      }

      const data = await res.json();
      setLocalPortfolio(prev => prev.map(p => {
        if (p.id === itemId) {
          return {
            ...p,
            titleEn: data.titleEn || p.titleEn,
            titleRu: data.titleRu || p.titleRu,
            titleHu: data.titleHu || p.titleHu,
            descriptionEn: data.descriptionEn || p.descriptionEn,
            descriptionRu: data.descriptionRu || p.descriptionRu,
            descriptionHu: data.descriptionHu || p.descriptionHu,
          };
        }
        return p;
      }));
    } catch (err: any) {
      console.error("Translation error:", err);
      alert(language === "ru" 
        ? `Ошибка перевода: ${err.message}` 
        : `Translation failed: ${err.message}`
      );
    } finally {
      setTranslatingIds(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleTranslateProcedure = async (procId: string) => {
    const proc = localProcedures.find(p => p.id === procId);
    if (!proc) return;

    let sourceLang: 'en' | 'ru' | 'hu' = 'ru';
    let title = "";
    if (proc.nameRu) {
      sourceLang = 'ru';
      title = proc.nameRu;
    } else if (proc.nameEn) {
      sourceLang = 'en';
      title = proc.nameEn;
    } else if (proc.nameHu) {
      sourceLang = 'hu';
      title = proc.nameHu;
    }

    if (!title) {
      alert(language === "ru" ? "Заполните хотя бы одно название услуги перед переводом!" : "Please fill in at least one service name before translating!");
      return;
    }

    setTranslatingProcIds(prev => [...prev, procId]);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, sourceLang }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to translate");
      }

      const data = await res.json();
      setLocalProcedures(prev => prev.map(p => {
        if (p.id === procId) {
          return {
            ...p,
            nameEn: data.nameEn || p.nameEn,
            nameRu: data.nameRu || p.nameRu,
            nameHu: data.nameHu || p.nameHu,
          };
        }
        return p;
      }));
    } catch (err: any) {
      console.error("Translation error:", err);
      alert(language === "ru" ? `Ошибка перевода: ${err.message}` : `Translation failed: ${err.message}`);
    } finally {
      setTranslatingProcIds(prev => prev.filter(id => id !== procId));
    }
  };

  // Booking custom filters and sorting (Enhancement 4)
  const [bookingDateFilter, setBookingDateFilter] = useState("");
  const [bookingSortOrder, setBookingSortOrder] = useState<"desc" | "asc">("desc");

  // Settings Tab states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage(null);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsMessage({ type: "success", text: language === "ru" ? "Пароль успешно изменен!" : language === "hu" ? "A jelszó sikeresen megváltozott!" : "Password successfully changed!" });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setSettingsMessage({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch (err) {
      setSettingsMessage({ type: "error", text: "Network error" });
    }
  };

  // Calendar View states
  const [adminViewMode, setAdminViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const [selectedCalendarBooking, setSelectedCalendarBooking] = useState<Booking | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  
  const [calendarZoom, setCalendarZoom] = useState<"compact" | "normal" | "spacious">("normal");

  const hourHeight = useMemo(() => {
    if (calendarZoom === "compact") return 64;
    if (calendarZoom === "spacious") return 144;
    return 96;
  }, [calendarZoom]);
  
  // Custom non-blocking confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const [copiedBookingId, setCopiedBookingId] = useState<string | null>(null);

  const getWhatsAppUrl = (booking: Booking) => {
    const pIds = booking.procedureIds && booking.procedureIds.length > 0 ? booking.procedureIds : [booking.procedureId];
    const selectedProcs = procedures.filter(proc => pIds.includes(proc.id));
    const procNames = selectedProcs.map(p => {
      if (language === "ru") return p.nameRu;
      if (language === "hu") return p.nameHu;
      return p.nameEn;
    }).join(" + ");

    let msg = "";
    if (language === "ru") {
      msg = `Здравствуйте, ${booking.firstName}! Вас беспокоит студия маникюра Velvet Budapest. Мы получили вашу заявку на запись: ${procNames} на ${booking.date} в ${booking.time}. Пожалуйста, подтвердите, всё ли в силе?`;
    } else if (language === "hu") {
      msg = `Szia ${booking.firstName}! A Velvet Manicure Stúdió (Budapest) nevében kereslek. Szeretnénk egyeztetni a foglalásodat: ${procNames} ekkor: ${booking.date} ${booking.time}. Kérlek, jelezz vissza, ha megfelelő számodra az időpont!`;
    } else {
      msg = `Hello ${booking.firstName}! This is Velvet Manicure Studio Budapest. We are writing to confirm your booking request for: ${procNames} on ${booking.date} at ${booking.time}. Please let us know if this time still works for you!`;
    }

    let cleanPhone = booking.phone.replace(/[^\d+]/g, "");
    if (cleanPhone.startsWith("06") && cleanPhone.length === 11) {
      cleanPhone = "+36" + cleanPhone.substring(2);
    } else if (!cleanPhone.startsWith("+") && cleanPhone.length === 9 && (cleanPhone.startsWith("20") || cleanPhone.startsWith("30") || cleanPhone.startsWith("70"))) {
      cleanPhone = "+36" + cleanPhone;
    }
    const waPhone = cleanPhone.replace("+", "");
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleCopyBookingInfo = (booking: Booking) => {
    const pIds = booking.procedureIds && booking.procedureIds.length > 0 ? booking.procedureIds : [booking.procedureId];
    const selectedProcs = procedures.filter(p => pIds.includes(p.id));
    const procNames = selectedProcs.map(p => `${p.nameEn} / ${p.nameRu} / ${p.nameHu}`).join(" + ");
    
    const text = `
✨ Velvet Budapest Booking:
👤 Client: ${booking.firstName} ${booking.lastName}
📞 Phone: ${booking.phone}
📧 Email: ${booking.email || 'N/A'}
💅 Service: ${procNames}
📅 Date: ${booking.date}
⏰ Time: ${booking.time}
💬 Comment: ${booking.comment || 'None'}
Status: ${booking.status.toUpperCase()}
`.trim();

    navigator.clipboard.writeText(text);
    setCopiedBookingId(booking.id);
    setTimeout(() => setCopiedBookingId(null), 2000);
  };
  
  // Update current time indicator every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const weekDays = useMemo(() => {
    const start = new Date(calendarDate);
    start.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendarDate]);

  const calendarHeaderLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    const firstDay = weekDays[0];
    const lastDay = weekDays[6];
    
    const locale = language === "ru" ? "ru-RU" : language === "hu" ? "hu-HU" : "en-US";
    
    const firstMonth = firstDay.toLocaleDateString(locale, { month: "long" });
    const lastMonth = lastDay.toLocaleDateString(locale, { month: "long" });
    const firstYear = firstDay.getFullYear();
    const lastYear = lastDay.getFullYear();
    
    if (firstYear !== lastYear) {
      return `${firstMonth} ${firstYear} – ${lastMonth} ${lastYear}`;
    }
    if (firstMonth !== lastMonth) {
      return `${firstMonth} – ${lastMonth} ${firstYear}`;
    }
    return `${firstMonth} ${firstYear}`;
  }, [weekDays, language]);

  const getFormattedDateString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  
  // State for manual booking drawer
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newProcedure, setNewProcedure] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("12:00");
  const [newComment, setNewComment] = useState("");
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Editable procedures list
  const [localProcedures, setLocalProcedures] = useState<Procedure[]>([]);
  const [editingProcedureId, setEditingProcedureId] = useState<string | null>(null);
  const [procSaveSuccess, setProcSaveSuccess] = useState(false);

  // Multi-select + immediate delete state for the services table
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<string[]>([]);
  const [procDeletingIds, setProcDeletingIds] = useState<string[]>([]);
  const [procDeleteMessage, setProcDeleteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const toggleProcedureSelected = (id: string) => {
    setSelectedProcedureIds(prev =>
      prev.includes(id) ? prev.filter(existingId => existingId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllProcedures = () => {
    setSelectedProcedureIds(prev =>
      prev.length === localProcedures.length ? [] : localProcedures.map(p => p.id)
    );
  };

  // Deletes right away (no need to press "Save All Changes" first). Handles both
  // a single service (from the row's own Delete button) and a bulk selection.
  const handleDeleteProceduresNow = async (ids: string[]) => {
    if (ids.length === 0) return;
    setProcDeleteMessage(null);
    setProcDeletingIds(ids);
    try {
      await onDeleteProcedures(ids);
      setLocalProcedures(prev => prev.filter(p => !ids.includes(p.id)));
      setSelectedProcedureIds(prev => prev.filter(id => !ids.includes(id)));
      setProcDeleteMessage({
        type: "success",
        text: language === "ru"
          ? `Удалено услуг: ${ids.length}.`
          : language === "hu"
            ? `${ids.length} szolgáltatás törölve.`
            : `Deleted ${ids.length} service(s).`
      });
    } catch (err: any) {
      // Partial failure: some ids were deleted, some are blocked because they're
      // still used by existing bookings. Remove the ones that DID get deleted and
      // tell the admin exactly which service(s) are blocked and why.
      const deletedIds: string[] = err?.deleted || [];
      const blockedIds: string[] = err?.blocked || ids.filter(id => !deletedIds.includes(id));
      if (deletedIds.length > 0) {
        setLocalProcedures(prev => prev.filter(p => !deletedIds.includes(p.id)));
        setSelectedProcedureIds(prev => prev.filter(id => !deletedIds.includes(id)));
      }
      const blockedNames = localProcedures
        .filter(p => blockedIds.includes(p.id))
        .map(p => p.nameEn)
        .join(", ");
      setProcDeleteMessage({
        type: "error",
        text: language === "ru"
          ? `Нельзя удалить "${blockedNames}" — на эту услугу есть действующие записи клиентов. Сначала обработайте или удалите эти записи.`
          : language === "hu"
            ? `A(z) "${blockedNames}" nem törölhető — élő foglalások tartoznak hozzá. Előbb kezelje vagy törölje azokat.`
            : `Could not delete "${blockedNames}" — there are existing bookings for it. Handle or remove those bookings first.`
      });
    } finally {
      setProcDeletingIds([]);
      setTimeout(() => setProcDeleteMessage(null), 6000);
    }
  };

  // Editable contacts form
  const [localContacts, setLocalContacts] = useState<SalonContacts | null>(null);
  // Portfolio state
  const [localPortfolio, setLocalPortfolio] = useState<PortfolioItem[]>([]);
  const [portfolioSaveSuccess, setPortfolioSaveSuccess] = useState(false);
  const [portfolioEditLang, setPortfolioEditLang] = useState<"en" | "ru" | "hu">((language === "ru" || language === "hu" || language === "en") ? language : "en");
  const [portfolioViewMode, setPortfolioViewMode] = useState<"grid" | "table">("grid");
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);

  const handleSavePortfolio = async () => {
    try {
      await onUpdatePortfolio(localPortfolio);
      setPortfolioSaveSuccess(true);
      setTimeout(() => setPortfolioSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save portfolio");
    }
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const copy = [...localPortfolio];
    const temp = copy[idx];
    copy[idx] = copy[idx - 1];
    copy[idx - 1] = temp;
    setLocalPortfolio(copy);
  };

  const moveDown = (idx: number) => {
    if (idx === localPortfolio.length - 1) return;
    const copy = [...localPortfolio];
    const temp = copy[idx];
    copy[idx] = copy[idx + 1];
    copy[idx + 1] = temp;
    setLocalPortfolio(copy);
  };

  const copyToAllLanguages = (idx: number) => {
    const copy = [...localPortfolio];
    const item = copy[idx];
    const currentTitle = portfolioEditLang === "en" ? item.titleEn : portfolioEditLang === "ru" ? item.titleRu : item.titleHu;
    const currentCategory = portfolioEditLang === "en" ? item.categoryEn : portfolioEditLang === "ru" ? item.categoryRu : item.categoryHu;
    const currentDesc = portfolioEditLang === "en" ? item.descriptionEn : portfolioEditLang === "ru" ? item.descriptionRu : item.descriptionHu;

    item.titleEn = currentTitle || "";
    item.titleRu = currentTitle || "";
    item.titleHu = currentTitle || "";

    item.categoryEn = currentCategory || "";
    item.categoryRu = currentCategory || "";
    item.categoryHu = currentCategory || "";

    item.descriptionEn = currentDesc || "";
    item.descriptionRu = currentDesc || "";
    item.descriptionHu = currentDesc || "";

    setLocalPortfolio(copy);
  };

  const bulkCopyToAllLanguages = () => {
    const copy = [...localPortfolio];
    copy.forEach((item) => {
      if (portfolioSelectedIds.includes(item.id)) {
        const currentTitle = portfolioEditLang === "en" ? item.titleEn : portfolioEditLang === "ru" ? item.titleRu : item.titleHu;
        const currentCategory = portfolioEditLang === "en" ? item.categoryEn : portfolioEditLang === "ru" ? item.categoryRu : item.categoryHu;
        const currentDesc = portfolioEditLang === "en" ? item.descriptionEn : portfolioEditLang === "ru" ? item.descriptionRu : item.descriptionHu;

        item.titleEn = currentTitle || "";
        item.titleRu = currentTitle || "";
        item.titleHu = currentTitle || "";

        item.categoryEn = currentCategory || "";
        item.categoryRu = currentCategory || "";
        item.categoryHu = currentCategory || "";

        item.descriptionEn = currentDesc || "";
        item.descriptionRu = currentDesc || "";
        item.descriptionHu = currentDesc || "";
      }
    });
    setLocalPortfolio(copy);
  };

  const bulkUpdateCategory = (preset: "manicure" | "pedicure" | "nail_art" | "custom", customVal?: string) => {
    const copy = [...localPortfolio];
    copy.forEach((item) => {
      if (portfolioSelectedIds.includes(item.id)) {
        if (preset === "manicure") {
          item.categoryEn = "Manicure";
          item.categoryRu = "Маникюр";
          item.categoryHu = "Manikőr";
        } else if (preset === "pedicure") {
          item.categoryEn = "Pedicure";
          item.categoryRu = "Педикюр";
          item.categoryHu = "Pedikűr";
        } else if (preset === "nail_art") {
          item.categoryEn = "Nail Art";
          item.categoryRu = "Дизайн ногтей";
          item.categoryHu = "Köröm díszítés";
        } else if (preset === "custom" && customVal !== undefined) {
          if (portfolioEditLang === "en") item.categoryEn = customVal;
          else if (portfolioEditLang === "ru") item.categoryRu = customVal;
          else if (portfolioEditLang === "hu") item.categoryHu = customVal;
        }
      }
    });
    setLocalPortfolio(copy);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const MAX_HEIGHT = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
            resolve(compressedDataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsBulkUploading(true);
    setBulkUploadProgress(0);
    const fileArray = Array.from(files);
    const totalFiles = fileArray.length;
    const newItems: PortfolioItem[] = [];

    for (let i = 0; i < totalFiles; i++) {
      const file = fileArray[i];
      try {
        const compressed = await compressImage(file);
        const newId = self.crypto.randomUUID ? self.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        
        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const readableTitle = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        newItems.push({
          id: newId,
          titleEn: readableTitle,
          titleRu: language === "ru" ? "Новая работа" : readableTitle,
          titleHu: language === "hu" ? "Új munka" : readableTitle,
          descriptionEn: "",
          descriptionRu: "",
          descriptionHu: "",
          image: compressed,
          categoryEn: "Manicure",
          categoryRu: "Маникюр",
          categoryHu: "Manikőr"
        });
      } catch (err) {
        console.error("Error compressing file:", file.name, err);
      }
      setBulkUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
    }

    if (newItems.length > 0) {
      setLocalPortfolio(prev => [...newItems, ...prev]);
    }
    setIsBulkUploading(false);
    setBulkUploadProgress(0);
  };
  const [contactsSaveSuccess, setContactsSaveSuccess] = useState(false);

  // Initialize editing buffers
  useEffect(() => {
    if (procedures && procedures.length > 0) {
      setLocalProcedures(JSON.parse(JSON.stringify(procedures)));
      setSelectedProcedureIds(prev => prev.filter(id => procedures.some(p => p.id === id)));
      if (!newProcedure) {
        setNewProcedure(procedures[0].id);
      }
    }
  }, [procedures]);

  useEffect(() => {
    if (contacts) {
      setLocalContacts(JSON.parse(JSON.stringify(contacts)));
    }
  }, [contacts]);

  useEffect(() => {
    setLocalPortfolio(JSON.parse(JSON.stringify(portfolio || [])));
  }, [portfolio]);

  // Set default date for drawer to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNewDate(tomorrow.toISOString().split("T")[0]);
  }, [showAddDrawer]);

  // Statistics
  const totalCount = bookings.length;
  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const confirmedCount = bookings.filter(b => b.status === "confirmed").length;
  const cancelledCount = bookings.filter(b => b.status === "cancelled").length;

  // Filter Bookings
  const getFilteredBookings = (list: Booking[], currentSearchTerm: string, currentStatusFilter: string) => {
    return list.filter((booking) => {
    const fullName = `${booking.firstName} ${booking.lastName}`.toLowerCase();
    const phone = booking.phone.toLowerCase();
    const pIds = booking.procedureIds && booking.procedureIds.length > 0 ? booking.procedureIds : [booking.procedureId];
    const selectedProcs = procedures.filter(p => pIds.includes(p.id));
    const procedureName = selectedProcs.map(proc => `${proc.nameEn} ${proc.nameRu} ${proc.nameHu}`).join(" ").toLowerCase();
    const search = currentSearchTerm.toLowerCase();
    const matchesSearch = !search || 
                          fullName.includes(search) || 
                          phone.includes(search) ||
                          procedureName.includes(search);

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && booking.status === statusFilter;
  });}

  const filteredBookings = getFilteredBookings(bookings, searchTerm, statusFilter);

  // Filtered and sorted bookings computed (Enhancement 4)
  const processedBookings = useMemo(() => {
    let result = [...filteredBookings];
    
    // Filter by Date
    if (bookingDateFilter) {
      result = result.filter(b => b.date === bookingDateFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.time}`).getTime();
      if (bookingSortOrder === "desc") {
        return dateTimeB - dateTimeA;
      } else {
        return dateTimeA - dateTimeB;
      }
    });
    
    return result;
  }, [filteredBookings, bookingDateFilter, bookingSortOrder]);

  // Compute portfolio categories
  const portfolioCategories = useMemo(() => {
    const cats = new Set<string>();
    localPortfolio.forEach(p => {
      const cat = portfolioEditLang === "en" ? p.categoryEn : portfolioEditLang === "ru" ? p.categoryRu : p.categoryHu;
      if (cat) cats.add(cat.trim());
    });
    return Array.from(cats);
  }, [localPortfolio, portfolioEditLang]);

  // Filtered portfolio items based on search and category
  const filteredLocalPortfolio = useMemo(() => {
    return localPortfolio.filter(item => {
      const currentTitle = (portfolioEditLang === "en" ? item.titleEn : portfolioEditLang === "ru" ? item.titleRu : item.titleHu) || "";
      const currentCategory = (portfolioEditLang === "en" ? item.categoryEn : portfolioEditLang === "ru" ? item.categoryRu : item.categoryHu) || "";
      const currentDesc = (portfolioEditLang === "en" ? item.descriptionEn : portfolioEditLang === "ru" ? item.descriptionRu : item.descriptionHu) || "";
      
      const search = portfolioSearch.toLowerCase();
      const matchesSearch = !search || 
                            currentTitle.toLowerCase().includes(search) || 
                            currentCategory.toLowerCase().includes(search) ||
                            currentDesc.toLowerCase().includes(search);
      
      const matchesCategory = portfolioCategoryFilter === "all" || 
                              currentCategory.trim() === portfolioCategoryFilter.trim();
                              
      return matchesSearch && matchesCategory;
    });
  }, [localPortfolio, portfolioSearch, portfolioCategoryFilter, portfolioEditLang]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrawerError(null);

    if (!newFirstName.trim() || !newLastName.trim() || !newPhone.trim() || !newEmail.trim() || !newProcedure || !newDate || !newTime) {
      setDrawerError(t("bookingErrorAllFields"));
      return;
    }

    setDrawerLoading(true);
    try {
      await onAddBooking({
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        phone: newPhone.trim(),
        email: newEmail.trim(),
        procedureId: newProcedure,
        date: newDate,
        time: newTime,
        comment: newComment.trim(),
      });

      // Clear values
      setNewFirstName("");
      setNewLastName("");
      setNewPhone("");
      setNewEmail("");
      setNewComment("");
      setShowAddDrawer(false);
    } catch (err: any) {
      setDrawerError(err.message || t("adminDrawerErrorMsg"));
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleSaveProcedures = async () => {
    try {
      const savedProcedures = await onUpdateProcedures(localProcedures);
      setLocalProcedures(savedProcedures);
      setProcSaveSuccess(true);
      setTimeout(() => setProcSaveSuccess(false), 3000);
      setEditingProcedureId(null);
    } catch (err) {
      alert("Failed to save procedures");
    }
  };

  const handleProcedureFieldChange = (id: string, field: keyof Procedure, value: string | number | boolean) => {
    setLocalProcedures(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSaveContacts = async () => {
    if (!localContacts) return;
    try {
      await onUpdateContacts(localContacts);
      setContactsSaveSuccess(true);
      setTimeout(() => setContactsSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save contacts");
    }
  };

  const handleContactsFieldChange = (field: keyof SalonContacts, value: string) => {
    if (!localContacts) return;
    const updated = {
      ...localContacts,
      [field]: value
    };
    if (field === "addressEn") {
      updated.addressRu = value;
      updated.addressHu = value;
    }
    if (field === "workingHoursEn") {
      updated.workingHoursRu = value;
      updated.workingHoursHu = value;
    }
    setLocalContacts(updated);
  };

  const getStatusBadge = (status: Booking["status"]) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-3 w-3" />
            {t("adminStatsConfirmed")}
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" />
            {t("adminStatsCancelled")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="h-3 w-3 animate-spin-slow" />
            {t("bookingReceiptStatusPending")}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString(language === "ru" ? "ru-RU" : language === "hu" ? "hu-HU" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 10; h < 20; h++) {
      for (const m of ["00", "15", "30", "45"]) {
        slots.push(`${String(h).padStart(2, "0")}:${m}`);
      }
    }
    slots.push("20:00");
    return slots;
  }, []);

  return (
    <section className="bg-brand-50/30 min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="md:flex md:items-center md:justify-between border-b border-brand-200/50 pb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
              <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">{t("adminPanelSubtitle")}</span>
            </div>
            <h2 className="mt-1 font-serif text-3xl font-light text-brand-950">
              {t("adminPanelTitle")}
            </h2>
          </div>
          
          <div className="mt-4 flex md:mt-0 md:ml-4 gap-3">
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-brand-300 px-5 py-2.5 text-xs font-bold text-brand-800 hover:bg-brand-50 transition-colors cursor-pointer"
            >
              {t("adminLogout")}
            </button>
            
            {activeTab === "bookings" && (
              <button
                onClick={() => setShowAddDrawer(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-600 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {t("adminPanelManualBtn")}
              </button>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="mt-6 flex overflow-x-auto whitespace-nowrap border-b border-brand-200/30 scrollbar-thin">
          <button
            onClick={() => setActiveTab("bookings")}
            className={`px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === "bookings"
                ? "border-brand-500 text-brand-900"
                : "border-transparent text-brand-600 hover:text-brand-900"
            }`}
          >
            {t("adminTabBookings")}
          </button>
          <button
            onClick={() => setActiveTab("procedures")}
            className={`px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === "procedures"
                ? "border-brand-500 text-brand-900"
                : "border-transparent text-brand-600 hover:text-brand-900"
            }`}
          >
            {t("adminTabEditProcedures")}
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === "portfolio"
                ? "border-brand-500 text-brand-900"
                : "border-transparent text-brand-600 hover:text-brand-900"
            } flex items-center gap-2`}
          >
            <FolderKanban className="h-4 w-4" />
            <span>{language === "ru" ? "Портфолио" : language === "hu" ? "Portfólió" : "Portfolio"}</span>
          </button>
          <button
            onClick={() => setActiveTab("contacts")}
            className={`px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${
              activeTab === "contacts"
                ? "border-brand-500 text-brand-900"
                : "border-transparent text-brand-600 hover:text-brand-900"
            }`}
          >
            {t("adminTabEditContacts")}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === "settings"
                ? "border-brand-500 text-brand-900"
                : "border-transparent text-brand-600 hover:text-brand-900"
            }`}
          >
            <Settings className="h-4 w-4" />
            {language === "ru" ? "Настройки" : language === "hu" ? "Beállítások" : "Settings"}
          </button>
        </div>

        {/* TAB 1: BOOKINGS */}
        {activeTab === "bookings" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            {/* Urgent: Pending Bookings Sticky Banner */}
            {pendingCount > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-amber-100 text-amber-800 p-2 rounded-xl shrink-0">
                    <AlertCircle className="h-5 w-5 animate-bounce text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 text-sm">
                      {language === "ru" 
                        ? `Есть необработанные записи (${pendingCount})` 
                        : language === "hu" 
                        ? `Függőben lévő időpontok (${pendingCount})` 
                        : `Pending booking requests (${pendingCount})`}
                    </h3>
                    <p className="text-xs text-amber-700/90 mt-0.5 leading-relaxed">
                      {language === "ru"
                        ? "Клиенты ждут вашего звонка или сообщения для подтверждения записи. Используйте кнопки быстрого контакта."
                        : language === "hu"
                        ? "Az ügyfelek várják a megerősítő hívást vagy üzenetet. Használja a gyors kapcsolatfelvételi gombokat."
                        : "Clients are waiting for your call or message to confirm their slots. Please use the quick contact links below."}
                    </p>
                  </div>
                </div>
                {adminViewMode !== "list" && (
                  <button
                    onClick={() => {
                      setAdminViewMode("list");
                      setStatusFilter("pending");
                    }}
                    className="self-start sm:self-auto rounded-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
                  >
                    {language === "ru" ? "Показать списком" : language === "hu" ? "Megjelenítés listában" : "Show in List"}
                  </button>
                )}
              </div>
            )}

            {/* Stats Blocks */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {/* Total */}
              <div className="rounded-2xl border border-brand-200/50 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">{t("adminStatsTotal")}</span>
                  <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold font-serif text-brand-950">{totalCount}</p>
              </div>

              {/* Pending */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/20 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">{t("adminStatsPending")}</span>
                  <div className="rounded-lg bg-amber-100/60 p-2 text-amber-700">
                    <Clock className="h-4 w-4 animate-pulse" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold font-serif text-amber-950">{pendingCount}</p>
              </div>

              {/* Confirmed */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/20 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">{t("adminStatsConfirmed")}</span>
                  <div className="rounded-lg bg-emerald-100/60 p-2 text-emerald-700">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold font-serif text-brand-950">{confirmedCount}</p>
              </div>

              {/* Cancelled */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/20 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">{t("adminStatsCancelled")}</span>
                  <div className="rounded-lg bg-rose-100/60 p-2 text-rose-700">
                    <XCircle className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold font-serif text-brand-950">{cancelledCount}</p>
              </div>
            </div>

            {/* Filters, Search, and View Toggles */}
            <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left Side: View Toggles & Calendar Nav */}
              <div className="flex flex-wrap items-center gap-3">
                {/* View Toggles */}
                <div className="flex rounded-xl bg-brand-100/50 p-1 border border-brand-200/40 shrink-0">
                  <button
                    onClick={() => setAdminViewMode("calendar")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      adminViewMode === "calendar"
                        ? "bg-white text-brand-950 shadow-sm"
                        : "text-brand-700 hover:text-brand-950"
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{language === "ru" ? "Календарь" : language === "hu" ? "Naptár" : "Calendar"}</span>
                  </button>
                  <button
                    onClick={() => setAdminViewMode("list")}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          adminViewMode === 'list'
                        ? "bg-white text-brand-950 shadow-sm"
                        : "text-brand-700 hover:text-brand-950"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>{language === "ru" ? "Список" : language === "hu" ? "Lista" : "List"}</span>
                  </button>
                </div>

                {/* Calendar Navigation and Title */}
                {adminViewMode === "calendar" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCalendarDate(new Date())}
                      className="rounded-lg bg-white border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-900 hover:bg-brand-50 transition-colors cursor-pointer"
                    >
                      {language === "ru" ? "Сегодня" : language === "hu" ? "Ma" : "Today"}
                    </button>
                    
                    <div className="flex items-center rounded-lg bg-white border border-brand-200 overflow-hidden shrink-0">
                      <button
                        onClick={() => {
                          const d = new Date(calendarDate);
                          d.setDate(d.getDate() - 7);
                          setCalendarDate(d);
                        }}
                        className="p-1.5 text-brand-700 hover:bg-brand-50 hover:text-brand-950 border-r border-brand-200 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          const d = new Date(calendarDate);
                          d.setDate(d.getDate() + 7);
                          setCalendarDate(d);
                        }}
                        className="p-1.5 text-brand-700 hover:bg-brand-50 hover:text-brand-950 cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <h3 className="text-xs sm:text-sm font-semibold text-brand-950 ml-1 uppercase tracking-wide">
                      {calendarHeaderLabel}
                    </h3>

                    {/* Zoom controls */}
                    <div className="flex items-center ml-2 border-l border-brand-200/60 pl-3 gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          if (calendarZoom === "spacious") setCalendarZoom("normal");
                          else if (calendarZoom === "normal") setCalendarZoom("compact");
                        }}
                        disabled={calendarZoom === "compact"}
                        className="p-1.5 rounded-lg text-brand-700 bg-white border border-brand-200 hover:bg-brand-50 hover:text-brand-950 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title={language === "ru" ? "Отдалить" : language === "hu" ? "Kicsinyítés" : "Zoom Out"}
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      
                      <span className="text-[10px] font-bold text-brand-600 font-sans tracking-wide min-w-[65px] text-center select-none bg-brand-50 border border-brand-100 rounded-md px-1.5 py-1">
                        {calendarZoom === "compact" 
                          ? (language === "ru" ? "Мелкий" : language === "hu" ? "Kompakt" : "Compact")
                          : calendarZoom === "spacious" 
                          ? (language === "ru" ? "Крупный" : language === "hu" ? "Részletes" : "Spacious")
                          : (language === "ru" ? "Обычный" : language === "hu" ? "Normál" : "Normal")}
                      </span>

                      <button
                        onClick={() => {
                          if (calendarZoom === "compact") setCalendarZoom("normal");
                          else if (calendarZoom === "normal") setCalendarZoom("spacious");
                        }}
                        disabled={calendarZoom === "spacious"}
                        className="p-1.5 rounded-lg text-brand-700 bg-white border border-brand-200 hover:bg-brand-50 hover:text-brand-950 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title={language === "ru" ? "Приблизить" : language === "hu" ? "Nagyítás" : "Zoom In"}
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: List Mode search bar */}
              {adminViewMode === "list" && (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t("adminSearchPlaceholder")}
                    className="w-full rounded-xl border border-brand-200 bg-white pl-10 pr-4 py-2.5 text-sm text-brand-950 focus:border-brand-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Status Filters (Always Visible / Useful) */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: t("adminTabAll") },
                  { id: "pending", label: t("adminTabPending") },
                  { id: "confirmed", label: t("adminTabConfirmed") },
                  { id: "cancelled", label: t("adminTabCancelled") },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-brand-900 text-white shadow-sm"
                        : "bg-white border border-brand-200 text-brand-700 hover:bg-brand-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List Mode Sorting & Date Filters Toolbar (Enhancement 4) */}
            {adminViewMode === "list" && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-brand-50/40 p-4 border border-brand-100 rounded-2xl">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Date Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-800 uppercase tracking-wide">
                      {language === "ru" ? "Фильтр по дате:" : language === "hu" ? "Dátum szűrő:" : "Filter by Date:"}
                    </span>
                    <input
                      type="date"
                      value={bookingDateFilter}
                      onChange={(e) => setBookingDateFilter(e.target.value)}
                      className="text-xs p-1.5 border border-brand-200 rounded-lg bg-white text-brand-900 focus:outline-none focus:border-brand-500 cursor-pointer"
                    />
                  </div>

                  {/* Sort Order */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-800 uppercase tracking-wide">
                      {language === "ru" ? "Сортировка:" : language === "hu" ? "Rendezés:" : "Sort Order:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBookingSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                      className="flex items-center gap-1.5 rounded-lg bg-white border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:text-brand-950 hover:bg-brand-50 transition-colors cursor-pointer"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5 text-brand-500" />
                      <span>
                        {bookingSortOrder === "desc"
                          ? (language === "ru" ? "Сначала новые" : language === "hu" ? "Legújabb előre" : "Newest First")
                          : (language === "ru" ? "Сначала старые" : language === "hu" ? "Legrégebbi előre" : "Oldest First")}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Reset Filters button */}
                {(searchTerm || statusFilter !== "all" || bookingDateFilter) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setBookingDateFilter("");
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>{language === "ru" ? "Сбросить фильтры" : language === "hu" ? "Szűrők törlése" : "Reset Filters"}</span>
                  </button>
                )}
              </div>
            )}

            {/* DYNAMIC VIEW CONTAINER */}
            {adminViewMode === "calendar" ? (
              <div className="mt-6 rounded-2xl border border-brand-200/50 bg-white shadow-md overflow-hidden">
                {/* Day Headers Row */}
                <div className="grid grid-cols-[64px_1fr] border-b border-brand-200 bg-brand-50/40 select-none">
                  {/* Local Timezone Code */}
                  <div className="flex items-end justify-center pb-3 text-[10px] font-bold text-brand-400 font-mono">
                    GMT+02
                  </div>
                  
                  {/* 7 columns for week days */}
                  <div className="grid grid-cols-7 border-l border-brand-200 divide-x divide-brand-100">
                    {weekDays.map((day) => {
                      const isTodayStr = getFormattedDateString(day) === getFormattedDateString(new Date());
                      
                      const getDayLabel = (d: Date) => {
                        const dayNum = d.getDay();
                        if (language === "ru") {
                          return ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"][dayNum];
                        }
                        if (language === "hu") {
                          return ["Vas", "Hét", "Kedd", "Sze", "Csüt", "Pén", "Szo"][dayNum];
                        }
                        return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][dayNum];
                      };

                      return (
                        <div key={day.toISOString()} className="flex flex-col items-center py-2.5">
                          <span className="text-[10px] font-bold tracking-wider text-brand-400 font-sans">
                            {getDayLabel(day)}
                          </span>
                          <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                            isTodayStr 
                              ? "bg-brand-500 text-white shadow-sm shadow-brand-200" 
                              : "text-brand-900 font-semibold"
                          }`}>
                            {day.getDate()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scrollable Timeline Grid */}
                <div className="grid grid-cols-[64px_1fr] max-h-[600px] overflow-y-auto relative animate-fade-in" style={{ scrollbarWidth: "thin" }}>
                  
                  {/* Hour Labels Column */}
                  <div className="bg-brand-50/5 relative select-none text-right pr-2 transition-all duration-300 ease-in-out" style={{ height: `${hourHeight * 10}px` }}>
                    {Array.from({ length: 10 }, (_, i) => 10 + i).map((hr) => (
                      <div key={hr} className="relative transition-all duration-300 ease-in-out" style={{ height: `${hourHeight}px` }}>
                        <span className="absolute -top-2.5 right-1.5 text-[9px] font-bold text-brand-400 font-mono tracking-wider">
                          {`${String(hr).padStart(2, "0")}:00`}
                        </span>
                      </div>
                    ))}
                    <div className="absolute bottom-0 right-1.5">
                      <span className="text-[9px] font-bold text-brand-400 font-mono tracking-wider">
                        20:00
                      </span>
                    </div>
                  </div>

                  {/* The Interactive Grid */}
                  <div className="relative border-l border-brand-200 bg-brand-50/10 transition-all duration-300 ease-in-out" style={{ height: `${hourHeight * 10}px` }}>
                    
                    {/* Grid Horizontal Reference Lines */}
                    <div className="absolute inset-0 pointer-events-none">
                      {Array.from({ length: 10 }, (_, i) => 10 + i).map((hr) => (
                        <div key={hr} style={{ height: `${hourHeight}px` }} className="border-b border-brand-100/50 relative transition-all duration-300 ease-in-out">
                          {/* 15, 30, 45 minute subtle dashed lines */}
                          <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-brand-100/20" />
                          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-brand-100/35" />
                          <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-brand-100/20" />
                        </div>
                      ))}
                    </div>

                    {/* Columns representing the 7 days */}
                    <div className="grid grid-cols-7 h-full absolute inset-0 divide-x divide-brand-100/50">
                      {weekDays.map((day, dayIdx) => {
                        const dayDateString = getFormattedDateString(day);
                        
                        // Active bookings on this date matching search & status filters
                        const dayBookingsOnDate = bookings.filter(b => b.date === dayDateString);
                        const dayBookingsList = getFilteredBookings(dayBookingsOnDate, searchTerm, statusFilter);

                        const isTodayColumn = dayDateString === getFormattedDateString(currentTime);

                        // Memoize Layout parameters
                        const dayBookingsWithLayout = (()=>{
                            const getDuration = (b: Booking) => {
                                const pIds = b.procedureIds && b.procedureIds.length > 0 ? b.procedureIds : [b.procedureId];
                                const selectedProcs = procedures.filter(proc => pIds.includes(proc.id));
                                if (selectedProcs.length > 0) {
                                    return selectedProcs.reduce((sum, p) => sum + p.durationMinutes, 0);
                                }
                                return 45;
                            };

                            const parseTimeToMinutes = (timeStr: string): number => {
                                const [h, m] = timeStr.split(":").map(Number);
                                return h * 60 + m;
                            };

                            const layoutsMap: Record<string, { colIndex: number; totalCols: number; duration: number }> = {};
                            const sorted = [...dayBookingsList].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
                            
                            const clusters: Booking[][] = [];
                            sorted.forEach(booking => {
                                let placedInCluster = false;
                                const bStart = parseTimeToMinutes(booking.time);
                                const bEnd = bStart + getDuration(booking);
                                
                                for (const cluster of clusters) {
                                    const overlaps = cluster.some(item => {
                                        const itemStart = parseTimeToMinutes(item.time);
                                        const itemEnd = itemStart + getDuration(item);
                                        return bStart < itemEnd && itemStart < bEnd;
                                    });
                                    
                                    if (overlaps) {
                                        cluster.push(booking);
                                        placedInCluster = true;
                                        break;
                                    }
                                }
                                
                                if (!placedInCluster) {
                                    clusters.push([booking]);
                                }
                            });
                            
                            clusters.forEach(cluster => {
                                const columns: Booking[][] = [];
                                cluster.forEach(booking => {
                                    let colIndex = 0;
                                    let placed = false;
                                    while (!placed) {
                                        if (!columns[colIndex]) {
                                            columns[colIndex] = [booking];
                                            placed = true;
                                        } else {
                                            const lastInCol = columns[colIndex][columns[colIndex].length - 1];
                                            const bStart = parseTimeToMinutes(booking.time);
                                            const lastEnd = parseTimeToMinutes(lastInCol.time) + getDuration(lastInCol);
                                            if (bStart >= lastEnd) {
                                                columns[colIndex].push(booking);
                                                placed = true;
                                            } else {
                                                colIndex++;
                                            }
                                        }
                                    }
                                });
                                
                                cluster.forEach(booking => {
                                    const colIndex = columns.findIndex(col => col.includes(booking));
                                    layoutsMap[booking.id] = {
                                        colIndex,
                                        totalCols: columns.length,
                                        duration: getDuration(booking)
                                    };
                                });
                            });
                            
                            return layoutsMap;
                        })();

                        const parseTimeToMinutes = (timeStr: string): number => {
                            const [h, m] = timeStr.split(":").map(Number);
                            return h * 60 + m;
                        };

                        return (
                          <div key={day.toISOString()} className="relative h-full flex flex-col">
                            
                            {/* 15-minute interactive base click zones */}
                            {Array.from({ length: 10 }, (_, i) => 10 + i).map((hr) => (
                              <div key={hr} style={{ height: `${hourHeight}px` }} className="relative flex flex-col shrink-0 transition-all duration-300 ease-in-out">
                                {[0, 15, 30, 45].map((min) => {
                                  const timeString = `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
                                  return (
                                    <div
                                      key={min}
                                      onClick={() => {
                                        setNewDate(dayDateString);
                                        setNewTime(timeString);
                                        setShowAddDrawer(true);
                                      }}
                                      style={{ height: `${hourHeight / 4}px` }}
                                      className="hover:bg-brand-500/15 cursor-pointer transition-all duration-300 relative group border-t border-brand-200/5 first:border-t-0"
                                      title={
                                        language === "ru" 
                                          ? `Забронировать на ${timeString}` 
                                          : language === "hu" 
                                          ? `Foglalás ${timeString}-ra` 
                                          : `Book at ${timeString}`
                                      }
                                    >
                                      {/* Hover guides */}
                                      <div className="absolute inset-0 bg-brand-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                                    </div>
                                  );
                                })}
                              </div>
                            ))}

                            {/* Booking Cards on this Day Column */}
                            {dayBookingsList.map((b) => {
                              const layout = dayBookingsWithLayout[b.id] || { colIndex: 0, totalCols: 1, duration: 90 };
                              const widthPercent = 100 / layout.totalCols;
                              const leftPercent = layout.colIndex * widthPercent;
                              
                              const bStart = parseTimeToMinutes(b.time);
                              const bDuration = layout.duration;
                              
                              if (bStart < 600 || bStart >= 1320) return null;

                              const topPx = ((bStart - 600) / 60) * hourHeight;
                              const heightPx = (bDuration / 60) * hourHeight;

                              const pIds = (Array.isArray(b.procedureIds) && b.procedureIds.length > 0) ? b.procedureIds : [b.procedureId];
                              const selectedProcs = procedures.filter(proc => pIds.includes(proc.id));
                              const procLabel = selectedProcs.length > 0 
                                ? selectedProcs.map(proc => language === "ru" ? proc.nameRu : language === "hu" ? proc.nameHu : proc.nameEn).join(" + ")
                                : "Unknown";

                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCalendarBooking(b);
                                  }}
                                  style={{
                                    top: `${topPx + 2}px`,
                                    height: `${heightPx - 4}px`,
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent - 1}%`,
                                  }}
                                  className={`absolute rounded-lg border px-2 py-1.5 text-left flex flex-col justify-between overflow-hidden shadow-sm transition-all hover:shadow-md hover:scale-[1.01] hover:z-10 group cursor-pointer ${
                                    b.status === "confirmed"
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-950 hover:border-emerald-300"
                                      : b.status === "cancelled"
                                      ? "bg-rose-50 border-rose-100 text-rose-900 line-through opacity-60 hover:opacity-100"
                                      : "bg-amber-50 border-amber-200 text-amber-950 hover:border-amber-300"
                                  }`}
                                >
                                  <div className="h-full flex flex-col justify-between">
                                    <div className="overflow-hidden">
                                      {/* Mini header info */}
                                      <div className="flex items-center gap-1 text-[8px] font-bold tracking-wider uppercase mb-0.5 shrink-0">
                                        {b.status === "confirmed" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                        {b.status === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />}
                                        {b.status === "cancelled" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />}
                                        <span className={`line-clamp-1 ${b.status === "confirmed" ? "text-emerald-700" : b.status === "pending" ? "text-amber-700" : "text-rose-700"}`}>
                                          {b.status === "confirmed" ? t("adminStatsConfirmed") : b.status === "cancelled" ? t("adminStatsCancelled") : t("bookingReceiptStatusPending")}
                                        </span>
                                      </div>
                                      <h4 className="text-[11px] font-bold leading-tight line-clamp-1 group-hover:text-brand-600 transition-colors">
                                        {b.firstName} {b.lastName}
                                      </h4>
                                      <p className="text-[9px] font-semibold leading-none text-brand-700/95 line-clamp-1 mt-0.5 flex items-center gap-1 flex-wrap">
                                        {pIds.length > 1 && (
                                          <span className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded-[3px] text-[8px] font-bold shrink-0">
                                            {pIds.length}x
                                          </span>
                                        )}
                                        <span className="truncate">{procLabel}</span>
                                      </p>
                                    </div>

                                    {heightPx >= 48 && (
                                      <div className="flex items-center justify-between text-[8px] text-brand-600/90 border-t border-brand-200/40 pt-1 mt-1 shrink-0 font-mono">
                                        <span className="font-semibold flex items-center gap-0.5">
                                          <Clock className="h-2 w-2 inline text-brand-400" /> {b.time}
                                        </span>
                                        <span>
                                          {bDuration} {t("bookingMinutes")}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}

                            {/* Red Current Time Line Indicator */}
                            {isTodayColumn && (
                              (() => {
                                const now = currentTime;
                                const currentMins = now.getHours() * 60 + now.getMinutes();
                                if (currentMins >= 600 && currentMins < 1320) {
                                  const lineTop = ((currentMins - 600) / 60) * hourHeight;
                                  return (
                                    <div 
                                      style={{ top: `${lineTop}px` }} 
                                      className="absolute inset-x-0 h-0.5 bg-rose-500 pointer-events-none z-20 flex items-center"
                                    >
                                      <div className="h-2 w-2 rounded-full bg-rose-500 absolute -left-[4px] ring-2 ring-white shadow-sm" />
                                    </div>
                                  );
                                }
                                return null;
                              })()
                            )}

                          </div>
                        );
                      })}
                    </div>

                  </div>

                </div>
              </div>
            ) : (
              /* TAB 1: LIST VIEW */
              <div className="mt-6 overflow-hidden rounded-2xl border border-brand-200/50 bg-white shadow-sm">
                {processedBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-brand-500">
                    <AlertCircle className="h-10 w-10 text-brand-300 mb-2" />
                    <p className="text-sm font-semibold">{t("adminNoRecords")}</p>
                    <p className="text-xs text-brand-400 mt-1">{t("adminNoRecordsDesc")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-brand-100 bg-brand-50/50 text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                          <th className="px-6 py-4">{t("adminTableClient")}</th>
                          <th className="px-6 py-4">{t("adminTableProcedure")}</th>
                          <th className="px-6 py-4">{t("adminTableDateTime")}</th>
                          <th className="px-6 py-4">{t("adminTablePhone")}</th>
                          <th className="px-6 py-4">{t("adminTableStatus")}</th>
                          <th className="px-6 py-4 text-right">{t("adminTableActions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-100 text-sm text-brand-900">
                        {processedBookings.map((booking) => (
                          <tr 
                            key={booking.id} 
                            className={`hover:bg-brand-50/30 transition-colors ${
                              booking.status === "pending" ? "bg-amber-50/5" : ""
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="font-semibold text-brand-950">
                                {booking.firstName} {booking.lastName}
                              </div>
                              {booking.comment && (
                                <div className="text-[11px] text-brand-600 max-w-xs mt-1 bg-brand-50/60 p-1.5 rounded border border-brand-100">
                                  📝 {booking.comment}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 font-medium text-brand-800">
                              {(() => {
                                const pIds = (Array.isArray(booking.procedureIds) && booking.procedureIds.length > 0) ? booking.procedureIds : [booking.procedureId];
                                const selectedProcs = procedures.filter(proc => pIds.includes(proc.id));
                                if (selectedProcs.length === 0) return "Unknown";
                                const isMulti = pIds.length > 1;
                                return (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="font-semibold text-brand-900 leading-snug">
                                      {selectedProcs.map((p) => {
                                        if (language === "ru") return p.nameRu;
                                        if (language === "hu") return p.nameHu;
                                        return p.nameEn;
                                      }).join(" + ")}
                                    </div>
                                    {isMulti && (
                                      <div className="flex">
                                        <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200 uppercase tracking-wide shrink-0">
                                          ⚡ {language === "ru" ? "Несколько процедур" : language === "hu" ? "Több szolgáltatás" : "Multi-Procedure"} ({pIds.length})
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 font-semibold text-brand-900">
                                <Calendar className="h-3.5 w-3.5 text-brand-500" />
                                {formatDate(booking.date)}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-brand-600 mt-1">
                                <Clock className="h-3.5 w-3.5 text-brand-400" />
                                {booking.time}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5">
                                <a 
                                  href={`tel:${booking.phone}`} 
                                  className="flex items-center gap-1 font-semibold text-brand-950 hover:text-brand-600 transition-colors"
                                >
                                  <Phone className="h-3.5 w-3.5 text-brand-400" />
                                  <span>{booking.phone}</span>
                                </a>
                                <div className="flex items-center gap-2 mt-1">
                                  <a
                                    href={getWhatsAppUrl(booking)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer shadow-sm"
                                    title="Send WhatsApp Message"
                                  >
                                    <MessageSquare className="h-3 w-3 text-emerald-500" />
                                    <span>WhatsApp</span>
                                  </a>
                                  <button
                                    onClick={() => handleCopyBookingInfo(booking)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer shadow-sm"
                                    title="Copy Booking Details"
                                  >
                                    {copiedBookingId === booking.id ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-600" />
                                        <span className="text-emerald-700 font-semibold">{language === "ru" ? "Скопировано" : language === "hu" ? "Másolva" : "Copied"}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3 text-brand-500" />
                                        <span>{language === "ru" ? "Копировать" : language === "hu" ? "Másolás" : "Copy"}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(booking.status)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {booking.status === "pending" && (
                                  <>
                                    <button
                                      onClick={() => onUpdateStatus(booking.id, "confirmed")}
                                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer"
                                    >
                                      {t("adminBtnConfirm")}
                                    </button>
                                    <button
                                      onClick={() => onUpdateStatus(booking.id, "cancelled")}
                                      className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-200 transition-colors cursor-pointer"
                                    >
                                      {t("adminBtnDecline")}
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => {
                                    showConfirm(
                                      language === "ru" ? "Удаление записи" : language === "hu" ? "Időpont törlése" : "Delete Booking",
                                      t("adminConfirmDeleteMsg"),
                                      () => onDeleteBooking(booking.id)
                                    );
                                  }}
                                  className="rounded-full p-2 text-brand-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                                  title={t("adminTooltipDelete")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 2: EDIT PROCEDURES */}
        {activeTab === "procedures" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-brand-600 font-semibold uppercase tracking-wider">
                  💡 {language === "ru" ? "Управление услугами" : language === "hu" ? "Szolgáltatások kezelése" : "Manage Services"}
                </p>
                <h3 className="text-sm font-semibold text-brand-950 mt-1">
                  {language === "ru" ? "Добавляйте, редактируйте и удаляйте услуги для Book Online" : language === "hu" ? "Adjon hozzá, szerkesszen és töröljön szolgáltatásokat" : "Add, edit and delete services available for booking"}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedProcedureIds.length > 0 && (
                  <button
                    onClick={() => {
                      showConfirm(
                        language === "ru" ? "Удаление услуг" : language === "hu" ? "Szolgáltatások törlése" : "Delete Services",
                        language === "ru"
                          ? `Удалить выбранные услуги (${selectedProcedureIds.length})? Это действие необратимо.`
                          : language === "hu"
                            ? `Törli a kiválasztott szolgáltatásokat (${selectedProcedureIds.length})? Ez nem vonható vissza.`
                            : `Delete the selected services (${selectedProcedureIds.length})? This cannot be undone.`,
                        () => handleDeleteProceduresNow(selectedProcedureIds)
                      );
                    }}
                    disabled={procDeletingIds.length > 0}
                    className="flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>
                      {language === "ru"
                        ? `Удалить выбранные (${selectedProcedureIds.length})`
                        : language === "hu"
                          ? `Kiválasztottak törlése (${selectedProcedureIds.length})`
                          : `Delete selected (${selectedProcedureIds.length})`}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => {
                    const newId = self.crypto && self.crypto.randomUUID ? self.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                      const r = Math.random() * 16 | 0;
                      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                    });
                    const newProc: Procedure = {
                      id: newId,
                      nameEn: "New Service",
                      nameRu: "Новая услуга",
                      nameHu: "Új szolgáltatás",
                      price: 5000,
                      durationMinutes: 60,
                      descriptionEn: "Description...",
                      descriptionRu: "Описание...",
                      descriptionHu: "Leírás...",
                      isHidden: false
                    };
                    setLocalProcedures(prev => [newProc, ...prev]);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-xs font-bold transition-colors shadow-sm cursor-pointer shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{language === "ru" ? "Добавить услугу" : language === "hu" ? "Új szolgáltatás" : "Add Service"}</span>
                </button>
              </div>
            </div>

            {procSaveSuccess && (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-600 border border-emerald-100">
                ✓ {language === "ru" ? "Изменения успешно сохранены!" : language === "hu" ? "Módosítások sikeresen mentve!" : "Changes saved successfully!"}
              </div>
            )}

            {procDeleteMessage && (
              <div className={`rounded-lg p-3 text-xs font-semibold border ${
                procDeleteMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}>
                {procDeleteMessage.type === "success" ? "✓ " : "⚠️ "}{procDeleteMessage.text}
              </div>
            )}

            {/* Services Table */}
            <div className="overflow-x-auto border border-brand-200/50 rounded-xl bg-white shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-brand-100 bg-brand-50/50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={localProcedures.length > 0 && selectedProcedureIds.length === localProcedures.length}
                        onChange={toggleSelectAllProcedures}
                        className="h-3.5 w-3.5 rounded border-brand-300 text-brand-600 focus:ring-brand-400 cursor-pointer"
                        aria-label={language === "ru" ? "Выбрать все услуги" : language === "hu" ? "Összes kijelölése" : "Select all services"}
                      />
                    </th>
                    <th className="text-left px-4 py-3 font-bold text-brand-700 uppercase tracking-wider text-[10px]">
                      {language === "ru" ? "Услуга (EN / RU / HU)" : language === "hu" ? "Szolgáltatás" : "Service (EN/RU/HU)"}
                    </th>
                    <th className="text-center px-4 py-3 font-bold text-brand-700 uppercase tracking-wider text-[10px]">
                      {language === "ru" ? "Цена (Ft)" : "Price (Ft)"}
                    </th>
                    <th className="text-center px-4 py-3 font-bold text-brand-700 uppercase tracking-wider text-[10px]">
                      {language === "ru" ? "Длительность" : language === "hu" ? "Időtartam" : "Duration"}
                    </th>
                    <th className="text-center px-4 py-3 font-bold text-brand-700 uppercase tracking-wider text-[10px]">
                      {language === "ru" ? "Скрыто" : "Hidden"}
                    </th>
                    <th className="text-center px-4 py-3 font-bold text-brand-700 uppercase tracking-wider text-[10px]">
                      {language === "ru" ? "Действия" : "Actions"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {localProcedures.map((proc) => (
                    <tr
                      key={proc.id}
                      className={`hover:bg-brand-50/30 transition-colors ${procDeletingIds.includes(proc.id) ? "opacity-40 pointer-events-none" : ""} ${selectedProcedureIds.includes(proc.id) ? "bg-brand-50/60" : ""}`}
                    >
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={selectedProcedureIds.includes(proc.id)}
                          onChange={() => toggleProcedureSelected(proc.id)}
                          className="h-3.5 w-3.5 mt-1 rounded border-brand-300 text-brand-600 focus:ring-brand-400 cursor-pointer"
                          aria-label={language === "ru" ? `Выбрать услугу ${proc.nameEn}` : `Select ${proc.nameEn}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-start justify-between">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={proc.nameEn}
                              onChange={(e) => handleProcedureFieldChange(proc.id, "nameEn", e.target.value)}
                              placeholder="English name"
                              className="block w-full text-xs font-semibold text-brand-950 focus:outline-none border-b border-transparent hover:border-brand-300 py-1"
                            />
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                value={proc.nameRu}
                                onChange={(e) => handleProcedureFieldChange(proc.id, "nameRu", e.target.value)}
                                placeholder="Русский"
                                className="flex-1 text-[11px] text-brand-600 focus:outline-none border-b border-transparent hover:border-brand-300 py-0.5"
                              />
                              <input
                                type="text"
                                value={proc.nameHu}
                                onChange={(e) => handleProcedureFieldChange(proc.id, "nameHu", e.target.value)}
                                placeholder="Magyar"
                                className="flex-1 text-[11px] text-brand-600 focus:outline-none border-b border-transparent hover:border-brand-300 py-0.5"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTranslateProcedure(proc.id)}
                            disabled={translatingProcIds.includes(proc.id)}
                            className="p-1 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 self-center"
                            title={language === "ru" ? "Перевести на все языки с помощью Gemini AI" : "Translate to all languages using Gemini AI"}
                          >
                            <span>{translatingProcIds.includes(proc.id) ? "⏳" : "🪄"}</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={proc.price}
                          onChange={(e) => handleProcedureFieldChange(proc.id, "price", parseFloat(e.target.value) || 0)}
                          className="w-full text-xs font-bold text-brand-950 text-center focus:outline-none border-b border-transparent hover:border-brand-300 py-1"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={proc.durationMinutes}
                            onChange={(e) => handleProcedureFieldChange(proc.id, "durationMinutes", parseInt(e.target.value) || 0)}
                            className="w-16 text-xs font-bold text-brand-950 text-center focus:outline-none border-b border-transparent hover:border-brand-300 py-1"
                          />
                          <span className="text-brand-500 text-[10px] font-semibold">
                            {language === "ru" ? "мин" : language === "hu" ? "perc" : "min"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={proc.isHidden || false}
                          onChange={(e) => handleProcedureFieldChange(proc.id, "isHidden", e.target.checked)}
                          className="h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-400 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            showConfirm(
                              language === "ru" ? "Удаление услуги" : language === "hu" ? "Szolgáltatás törlése" : "Delete Service",
                              language === "ru" ? `Удалить "${proc.nameEn}"? Это действие необратимо.` : language === "hu" ? `Biztosan töröljük a "${proc.nameEn}" szolgáltatást? Ez nem vonható vissza.` : `Delete "${proc.nameEn}"? This cannot be undone.`,
                              () => handleDeleteProceduresNow([proc.id])
                            );
                          }}
                          disabled={procDeletingIds.includes(proc.id)}
                          className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-900 hover:bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200/40 transition-colors cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">
                            {procDeletingIds.includes(proc.id)
                              ? (language === "ru" ? "Удаление..." : language === "hu" ? "Törlés..." : "Deleting...")
                              : (language === "ru" ? "Удалить" : "Delete")}
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-[11px] text-brand-500 max-w-md leading-relaxed">
                {language === "ru"
                  ? "Удаление услуг происходит сразу. Кнопка ниже сохраняет только изменения названия, цены и длительности."
                  : language === "hu"
                    ? "A szolgáltatások törlése azonnal megtörténik. Az alábbi gomb только изменения названия, цены и длительности."
                    : "Deleting services happens immediately. The button below only saves changes to name, price and duration."}
              </p>
              <button
                type="button"
                onClick={handleSaveProcedures}
                className="flex items-center gap-1.5 rounded-full bg-brand-500 hover:bg-brand-600 px-6 py-3 text-xs font-bold text-white transition-colors shadow-md cursor-pointer shrink-0"
              >
                <Save className="h-4 w-4" />
                <span>{language === "ru" ? "Сохранить все изменения" : language === "hu" ? "Minden módosítás mentése" : "Save All Changes"}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* TAB PORTFOLIO */}
        {activeTab === "portfolio" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 border border-brand-200/50 rounded-2xl shadow-sm">
              <div>
                <p className="text-xs text-brand-600 font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-500" />
                  {language === "ru" ? "Галерея работ" : language === "hu" ? "Portfólió menedzser" : "Portfolio Manager"}
                </p>
                <h3 className="text-lg font-serif font-semibold text-brand-950 mt-1">
                  {language === "ru" ? "Управление фотографиями галереи" : language === "hu" ? "Galéria fotók kezelése" : "Manage Gallery Photos"}
                </h3>
                <p className="text-xs text-brand-500 mt-1">
                  {language === "ru" 
                    ? "Загружайте фотографии с компьютера, меняйте порядок стрелочками и переводите описания на разные языки." 
                    : language === "hu" 
                      ? "Töltsön fel képeket, változtassa meg a sorrendet a nyilakkal, és fordítsa le a szövegeket különböző nyelvekre." 
                      : "Upload photos, change display order using arrows, and translate titles/descriptions into different languages."}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const newId = self.crypto.randomUUID ? self.crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                      const r = Math.random() * 16 | 0;
                      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                    });
                    const newWork = { 
                      id: newId, 
                      titleEn: "New Work", 
                      titleRu: "Новая работа", 
                      titleHu: "Új munka", 
                      descriptionEn: "", 
                      descriptionRu: "", 
                      descriptionHu: "", 
                      image: "", 
                      categoryEn: "Manicure", 
                      categoryRu: "Маникюр", 
                      categoryHu: "Manikőr" 
                    };
                    setLocalPortfolio(prev => [newWork, ...prev]);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{language === "ru" ? "Добавить работу" : language === "hu" ? "Új munka" : "Add New Work"}</span>
                </button>
              </div>
            </div>

            {/* Language Toolbar & Settings */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-brand-50/50 p-4 border border-brand-100 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-800 uppercase tracking-wide">
                  {language === "ru" ? "Язык редактирования:" : language === "hu" ? "Szerkesztés nyelve:" : "Editing Language:"}
                </span>
                <div className="inline-flex rounded-lg border border-brand-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setPortfolioEditLang("ru")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      portfolioEditLang === "ru"
                        ? "bg-brand-500 text-white shadow-sm"
                        : "text-brand-600 hover:text-brand-900"
                    }`}
                  >
                    🇷🇺 {language === "ru" ? "Русский" : "RU"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioEditLang("en")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      portfolioEditLang === "en"
                        ? "bg-brand-500 text-white shadow-sm"
                        : "text-brand-600 hover:text-brand-900"
                    }`}
                  >
                    🇬🇧 {language === "ru" ? "Английский" : "EN"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioEditLang("hu")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      portfolioEditLang === "hu"
                        ? "bg-brand-500 text-white shadow-sm"
                        : "text-brand-600 hover:text-brand-900"
                    }`}
                  >
                    🇭🇺 {language === "ru" ? "Венгерский" : "HU"}
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-brand-600 italic">
                {language === "ru" 
                  ? "💡 Текст сохраняется для выбранного выше языка. Вы можете перевести его на каждый." 
                  : "💡 Changes apply to the selected tab language. Toggle tabs to localized entries."}
              </div>
            </div>

            {/* Master Multi-Image Bulk Upload Zone */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleBulkUpload(e.dataTransfer.files);
              }}
              onClick={() => {
                const input = document.getElementById("master-bulk-file-input");
                if (input) input.click();
              }}
              className="border-2 border-dashed border-brand-300 hover:border-brand-500 bg-brand-50/20 hover:bg-brand-50/40 rounded-2xl p-6 transition-all text-center cursor-pointer group relative overflow-hidden"
            >
              <input 
                id="master-bulk-file-input"
                type="file" 
                multiple 
                accept="image/*" 
                onChange={(e) => handleBulkUpload(e.target.files)}
                className="hidden" 
              />
              {isBulkUploading ? (
                <div className="space-y-3 py-2">
                  <div className="flex items-center justify-center gap-2 text-brand-600 font-bold text-sm animate-pulse">
                    <Activity className="h-5 w-5 text-brand-500 animate-spin" />
                    <span>
                      {language === "ru" 
                        ? `Оптимизация и сжатие: ${bulkUploadProgress}%` 
                        : language === "hu"
                          ? `Optimalizálás és tömörítés: ${bulkUploadProgress}%`
                          : `Optimizing & Compressing: ${bulkUploadProgress}%`}
                    </span>
                  </div>
                  <div className="w-full max-w-md mx-auto bg-brand-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${bulkUploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-brand-400">
                    {language === "ru" 
                      ? "Пожалуйста, подождите. Ваши фотографии обрабатываются прямо на вашем устройстве..." 
                      : "Please wait. Your high-res photos are being optimized and compressed on your device..."}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-brand-950">
                      {language === "ru" 
                        ? "Пакетная загрузка фотографий (Bulk Drag & Drop)" 
                        : language === "hu"
                          ? "Csoportos képfeltöltés (Húzza ide a képeket)"
                          : "Batch Multi-Photo Upload (Drag & Drop)"}
                    </p>
                    <p className="text-[11px] text-brand-500 mt-1">
                      {language === "ru" 
                        ? "Перетащите несколько фотографий сюда или нажмите для выбора. Все файлы будут мгновенно оптимизированы." 
                        : language === "hu"
                          ? "Húzzon ide több fotót egyszerre, или kattintson a feltöltéshez. A képek automatikusan tömörítésre kerülnek."
                          : "Drop multiple images here or click to select. All photos will be auto-optimized on-the-fly."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Search and Category Filters Panel (Enhancement 1) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 border border-brand-200/50 rounded-2xl shadow-sm">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
                <input
                  type="text"
                  value={portfolioSearch}
                  onChange={(e) => setPortfolioSearch(e.target.value)}
                  placeholder={language === "ru" ? "Поиск по названию, описанию или категории..." : "Search by title, description, or category..."}
                  className="w-full rounded-xl border border-brand-200 bg-white pl-10 pr-4 py-2 text-xs text-brand-950 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-semibold text-brand-800 uppercase tracking-wide shrink-0">
                    {language === "ru" ? "Категория:" : "Category:"}
                  </span>
                  <select
                    value={portfolioCategoryFilter}
                    onChange={(e) => setPortfolioCategoryFilter(e.target.value)}
                    className="text-xs p-2 border border-brand-200 rounded-xl bg-white text-brand-900 focus:outline-none focus:border-brand-500 w-full sm:w-auto"
                  >
                    <option value="all">{language === "ru" ? "Все категории" : "All Categories"}</option>
                    {portfolioCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Bulk Select Toggle button */}
                <button
                  type="button"
                  onClick={() => {
                    if (portfolioSelectedIds.length === filteredLocalPortfolio.length) {
                      setPortfolioSelectedIds([]);
                    } else {
                      setPortfolioSelectedIds(filteredLocalPortfolio.map(p => p.id));
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 transition-colors cursor-pointer w-full sm:w-auto justify-center"
                >
                  <CheckSquare className="h-3.5 w-3.5 text-brand-500" />
                  <span>
                    {portfolioSelectedIds.length === filteredLocalPortfolio.length && filteredLocalPortfolio.length > 0
                      ? (language === "ru" ? "Снять все" : "Deselect All") 
                      : (language === "ru" ? "Выбрать все" : "Select All")}
                  </span>
                </button>

                {/* View Mode Toggle (Grid vs Table) */}
                <div className="inline-flex rounded-xl border border-brand-200 bg-white p-1 shadow-sm shrink-0 w-full sm:w-auto justify-center">
                  <button
                    type="button"
                    onClick={() => setPortfolioViewMode("grid")}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 p-2 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
                      portfolioViewMode === "grid"
                        ? "bg-brand-500 text-white shadow-sm"
                        : "text-brand-500 hover:text-brand-800 hover:bg-brand-50"
                    }`}
                    title={language === "ru" ? "Вид сеткой" : "Grid View"}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="sm:hidden text-xs font-semibold">{language === "ru" ? "Сетка" : "Grid"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioViewMode("table")}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 p-2 sm:p-1.5 rounded-lg transition-all cursor-pointer ${
                      portfolioViewMode === "table"
                        ? "bg-brand-500 text-white shadow-sm"
                        : "text-brand-500 hover:text-brand-800 hover:bg-brand-50"
                    }`}
                    title={language === "ru" ? "Вид списком" : "Table View"}
                  >
                    <List className="h-4 w-4" />
                    <span className="sm:hidden text-xs font-semibold">{language === "ru" ? "Список" : "Table"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Actions Floating Bar (Enhancement 2) */}
            {portfolioSelectedIds.length > 0 && (
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-brand-950 text-white px-6 py-4 rounded-3xl shadow-xl border border-brand-800 animate-in fade-in slide-in-from-bottom-2 z-20">
                {/* Selected Info Segment */}
                <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto">
                  <div className="bg-brand-900 border border-brand-800 p-2.5 rounded-xl">
                    <CheckSquare className="h-5 w-5 text-brand-300" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wide">
                      {language === "ru" ? "Выбрано элементов" : language === "hu" ? "Kijelölt elemek" : "Selected elements"}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {portfolioSelectedIds.length} / {localPortfolio.length}
                    </p>
                  </div>
                </div>

                {/* Middle Action Segment: Bulk Category Update */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 w-full lg:w-auto bg-brand-900/60 p-2.5 rounded-2xl border border-brand-900">
                  <span className="text-xs font-semibold text-brand-300 px-1 whitespace-nowrap">
                    {language === "ru" ? "Изменить категорию:" : language === "hu" ? "Kategória:" : "Set Category:"}
                  </span>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={bulkCategoryPreset}
                      onChange={(e) => setBulkCategoryPreset(e.target.value as any)}
                      className="text-xs p-2 rounded-xl bg-brand-950 border border-brand-800 text-brand-100 focus:outline-none focus:border-brand-500 min-w-[130px]"
                    >
                      <option value="manicure">{language === "ru" ? "Маникюр" : language === "hu" ? "Manikőr" : "Manicure"}</option>
                      <option value="pedicure">{language === "ru" ? "Педикюр" : language === "hu" ? "Pedikűr" : "Pedicure"}</option>
                      <option value="nail_art">{language === "ru" ? "Дизайн ногтей" : language === "hu" ? "Köröm díszítés" : "Nail Art"}</option>
                      <option value="custom">{language === "ru" ? "Своя..." : language === "hu" ? "Egyedi..." : "Custom..."}</option>
                    </select>

                    {bulkCategoryPreset === "custom" && (
                      <input
                        type="text"
                        value={bulkCategoryCustom}
                        onChange={(e) => setBulkCategoryCustom(e.target.value)}
                        placeholder={language === "ru" ? "Категория..." : language === "hu" ? "Kategória..." : "Category..."}
                        className="text-xs p-2 rounded-xl bg-brand-950 border border-brand-800 text-white placeholder-brand-500 focus:outline-none focus:border-brand-500 w-36"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        bulkUpdateCategory(
                          bulkCategoryPreset, 
                          bulkCategoryPreset === "custom" ? bulkCategoryCustom : undefined
                        );
                      }}
                      className="rounded-xl bg-brand-500 hover:bg-brand-600 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer text-white shadow-sm hover:scale-105 active:scale-95 flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{language === "ru" ? "Применить" : language === "hu" ? "Alkalmaz" : "Apply"}</span>
                    </button>
                  </div>
                </div>

                {/* Right Action Segment: Multi-language Copy, Delete, Clear */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 w-full lg:w-auto border-t lg:border-t-0 border-brand-900 pt-3 lg:pt-0 shrink-0">
                  {/* Language sync */}
                  <button
                    type="button"
                    onClick={() => {
                      bulkCopyToAllLanguages();
                    }}
                    title={language === "ru" ? "Применить тексты текущего языка ко всем другим языкам для всех выбранных" : "Sync current language details to all other languages for selected items"}
                    className="flex items-center gap-1.5 rounded-full bg-brand-900 hover:bg-brand-850 hover:text-white border border-brand-800 px-4 py-2 text-xs font-bold transition-all cursor-pointer text-brand-200"
                  >
                    <Copy className="h-3.5 w-3.5 text-brand-400" />
                    <span>{language === "ru" ? "Синхр. языки" : language === "hu" ? "Nyelvek szinkr." : "Sync Languages"}</span>
                  </button>

                  {/* Bulk Delete */}
                  <button
                    type="button"
                    onClick={() => {
                      showConfirm(
                        language === "ru" ? "Удалить выбранные работы" : "Delete Selected Items",
                        language === "ru" 
                          ? `Вы уверены, что хотите удалить ${portfolioSelectedIds.length} выбранных элементов?` 
                          : `Are you sure you want to delete ${portfolioSelectedIds.length} selected items?`,
                        () => {
                          setLocalPortfolio(prev => prev.filter(p => !portfolioSelectedIds.includes(p.id)));
                          setPortfolioSelectedIds([]);
                        }
                      );
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 hover:scale-105 active:scale-95 px-4 py-2 text-xs font-bold transition-all cursor-pointer text-white shadow-sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{language === "ru" ? "Удалить" : language === "hu" ? "Törlés" : "Delete"}</span>
                  </button>

                  {/* Deselect All */}
                  <button
                    type="button"
                    onClick={() => setPortfolioSelectedIds([])}
                    className="rounded-full bg-brand-900 hover:bg-brand-850 hover:text-white border border-brand-800/80 px-4 py-2 text-xs font-bold transition-all cursor-pointer text-brand-300"
                  >
                    {language === "ru" ? "Сбросить выбор" : language === "hu" ? "Kijelölés megszüntetése" : "Deselect"}
                  </button>
                </div>
              </div>
            )}

            {portfolioSaveSuccess && (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-600 border border-emerald-100 animate-pulse">
                ✓ {language === "ru" ? "Портфолио успешно сохранено на сервере!" : language === "hu" ? "A portfólió sikeresen elmentve!" : "Portfolio saved successfully!"}
              </div>
            )}

            {/* Portfolio Grid or Table Display */}
            {filteredLocalPortfolio.length === 0 ? (
              <div className="text-center py-12 bg-white border border-dashed border-brand-200 rounded-2xl">
                <ImageIcon className="h-12 w-12 text-brand-300 mx-auto animate-bounce" />
                <p className="text-sm font-semibold text-brand-600 mt-2">
                  {language === "ru" ? "Работы не найдены по заданным фильтрам." : "No portfolio items found matching current filters."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPortfolioSearch("");
                    setPortfolioCategoryFilter("all");
                  }}
                  className="mt-4 px-4 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-full cursor-pointer"
                >
                  {language === "ru" ? "Сбросить поиск" : "Reset Filter"}
                </button>
              </div>
            ) : portfolioViewMode === "grid" ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredLocalPortfolio.map((item) => {
                  const currentTitle = portfolioEditLang === "en" ? item.titleEn : portfolioEditLang === "ru" ? item.titleRu : item.titleHu;
                  const currentCategory = portfolioEditLang === "en" ? item.categoryEn : portfolioEditLang === "ru" ? item.categoryRu : item.categoryHu;
                  const currentDesc = portfolioEditLang === "en" ? item.descriptionEn : portfolioEditLang === "ru" ? item.descriptionRu : item.descriptionHu;
                  const actualIdx = localPortfolio.findIndex(p => p.id === item.id);

                  const handleFieldChange = (field: 'title' | 'category' | 'description', value: string) => {
                    const copy = [...localPortfolio];
                    const targetIdx = copy.findIndex(p => p.id === item.id);
                    if (targetIdx !== -1) {
                      if (field === 'title') {
                        if (portfolioEditLang === "en") copy[targetIdx].titleEn = value;
                        else if (portfolioEditLang === "ru") copy[targetIdx].titleRu = value;
                        else if (portfolioEditLang === "hu") copy[targetIdx].titleHu = value;
                      } else if (field === 'category') {
                        if (portfolioEditLang === "en") copy[targetIdx].categoryEn = value;
                        else if (portfolioEditLang === "ru") copy[targetIdx].categoryRu = value;
                        else if (portfolioEditLang === "hu") copy[targetIdx].categoryHu = value;
                      } else if (field === 'description') {
                        if (portfolioEditLang === "en") copy[targetIdx].descriptionEn = value;
                        else if (portfolioEditLang === "ru") copy[targetIdx].descriptionRu = value;
                        else if (portfolioEditLang === "hu") copy[targetIdx].descriptionHu = value;
                      }
                      setLocalPortfolio(copy);
                    }
                  };

                  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const compressed = await compressImage(file);
                      const copy = [...localPortfolio];
                      const targetIdx = copy.findIndex(p => p.id === item.id);
                      if (targetIdx !== -1) {
                        copy[targetIdx].image = compressed;
                        setLocalPortfolio(copy);
                      }
                    }
                  };

                  const isSelected = portfolioSelectedIds.includes(item.id);

                  return (
                    <div 
                      key={item.id} 
                      className={`border rounded-2xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden relative group flex flex-col justify-between ${
                        isSelected ? "ring-2 ring-brand-600 border-brand-600 bg-brand-50/10" : "border-brand-200"
                      }`}
                    >
                      {/* Checkbox Overlay for Bulk Mode */}
                      <div className="absolute top-3 left-3 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPortfolioSelectedIds(prev => 
                              prev.includes(item.id) 
                                ? prev.filter(id => id !== item.id) 
                                : [...prev, item.id]
                            );
                          }}
                          className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all shadow-sm border ${
                            isSelected
                              ? "bg-brand-600 border-brand-600 text-white"
                              : "bg-white/90 border-brand-200 text-transparent hover:text-brand-500 hover:bg-white"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Drag & Drop Upload Zone + Preview */}
                      <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            const compressed = await compressImage(file);
                            const copy = [...localPortfolio];
                            const targetIdx = copy.findIndex(p => p.id === item.id);
                            if (targetIdx !== -1) {
                              copy[targetIdx].image = compressed;
                              setLocalPortfolio(copy);
                            }
                          }
                        }}
                        className="h-52 bg-brand-50/40 relative flex flex-col items-center justify-center border-b border-brand-100 overflow-hidden cursor-pointer group/image"
                        onClick={() => document.getElementById(`file-input-${item.id}`)?.click()}
                      >
                        {item.image ? (
                          <>
                            <img src={item.image} alt="Work preview" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
                              <Upload className="h-6 w-6 animate-pulse" />
                              <span className="text-xs font-bold">{language === "ru" ? "Заменить фото" : "Change Image"}</span>
                              <span className="text-[10px] text-white/70">{language === "ru" ? "Перетащите сюда или кликните" : "Drag & drop or click"}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-2 text-brand-500">
                              <Upload className="h-6 w-6" />
                            </div>
                            <p className="text-xs font-semibold text-brand-800">{language === "ru" ? "Загрузить фото работы" : "Upload Photo"}</p>
                            <p className="text-[10px] text-brand-500 mt-0.5">{language === "ru" ? "Перетащите сюда или кликните" : "Drag & drop or click to upload"}</p>
                          </div>
                        )}
                        <input 
                          id={`file-input-${item.id}`}
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleFileSelect} 
                        />
                      </div>

                      {/* Action Overlays: Reordering and Deletion */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={actualIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveUp(actualIdx);
                          }}
                          className={`h-8 w-8 rounded-full bg-white text-brand-700 hover:bg-brand-500 hover:text-white flex items-center justify-center transition-all shadow-sm border border-brand-100 ${actualIdx === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                          title={language === "ru" ? "Переместить выше" : "Move up"}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={actualIdx === localPortfolio.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveDown(actualIdx);
                          }}
                          className={`h-8 w-8 rounded-full bg-white text-brand-700 hover:bg-brand-500 hover:text-white flex items-center justify-center transition-all shadow-sm border border-brand-100 ${actualIdx === localPortfolio.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                          title={language === "ru" ? "Переместить ниже" : "Move down"}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            showConfirm(
                              language === "ru" ? "Удалить работу" : "Delete Item",
                              language === "ru" ? `Вы уверены, что хотите удалить эту работу?` : `Are you sure you want to delete this item?`,
                              () => setLocalPortfolio(localPortfolio.filter(p => p.id !== item.id))
                            );
                          }}
                          className="h-8 w-8 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all shadow-sm border border-rose-100 cursor-pointer"
                          title={language === "ru" ? "Удалить" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Info & Inputs Area */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          {/* Title Input */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                                {language === "ru" ? "Название" : "Title"} ({portfolioEditLang.toUpperCase()})
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleTranslatePortfolioItem(item.id)}
                                  disabled={translatingIds.includes(item.id)}
                                  className="text-[10px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-2 py-0.5 rounded flex items-center gap-1 hover:text-brand-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={language === "ru" ? "Перевести на все языки с помощью Gemini AI" : "Translate to all languages using Gemini AI"}
                                >
                                  <span>{translatingIds.includes(item.id) ? "⏳" : "🪄"}</span>
                                  <span>{language === "ru" ? "Перевести" : "Translate"}</span>
                                </button>
                                <span className="text-[10px] text-brand-500 italic bg-brand-100/50 px-1.5 py-0.5 rounded">
                                  {portfolioEditLang === "ru" ? "🇷🇺 Русский" : portfolioEditLang === "en" ? "🇬🇧 English" : "🇭🇺 Magyar"}
                                </span>
                              </div>
                            </div>
                            <input
                              type="text"
                              placeholder={language === "ru" ? "Название работы" : "Title of the work"}
                              value={currentTitle || ""}
                              onChange={(e) => handleFieldChange('title', e.target.value)}
                              className="w-full text-sm font-semibold p-2 border border-brand-200 rounded-lg bg-brand-50/10 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                            />
                          </div>

                          {/* Category Input */}
                          <div>
                            <label className="block text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1">
                              {language === "ru" ? "Категория" : "Category"} ({portfolioEditLang.toUpperCase()})
                            </label>
                            {(() => {
                              const matchedProc = localProcedures.find(
                                p => p.nameEn === item.categoryEn || p.nameRu === item.categoryRu || p.nameHu === item.categoryHu
                              );
                              
                              let selectValue = "";
                              if (matchedProc) {
                                selectValue = matchedProc.id;
                              } else if (currentCategory) {
                                selectValue = "__custom__";
                              }

                              const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                                const val = e.target.value;
                                const copy = [...localPortfolio];
                                const targetIdx = copy.findIndex(p => p.id === item.id);
                                if (targetIdx === -1) return;

                                if (val === "__custom__") {
                                  if (portfolioEditLang === "en") copy[targetIdx].categoryEn = "";
                                  else if (portfolioEditLang === "ru") copy[targetIdx].categoryRu = "";
                                  else if (portfolioEditLang === "hu") copy[targetIdx].categoryHu = "";
                                } else if (val === "") {
                                  copy[targetIdx].categoryEn = "";
                                  copy[targetIdx].categoryRu = "";
                                  copy[targetIdx].categoryHu = "";
                                } else {
                                  const found = localProcedures.find(p => p.id === val);
                                  if (found) {
                                    copy[targetIdx].categoryEn = found.nameEn;
                                    copy[targetIdx].categoryRu = found.nameRu;
                                    copy[targetIdx].categoryHu = found.nameHu;
                                  }
                                }
                                setLocalPortfolio(copy);
                              };

                              return (
                                <div className="space-y-1.5">
                                  <select
                                    value={selectValue}
                                    onChange={handleSelectChange}
                                    className="w-full text-xs p-2 border border-brand-200 rounded-lg bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer"
                                  >
                                    <option value="">{language === "ru" ? "-- Выберите категорию --" : "-- Select Category --"}</option>
                                    {localProcedures.map(p => {
                                      const label = portfolioEditLang === "ru" ? p.nameRu : portfolioEditLang === "hu" ? p.nameHu : p.nameEn;
                                      return (
                                        <option key={p.id} value={p.id}>
                                          {label}
                                        </option>
                                      );
                                    })}
                                    <option value="__custom__">{language === "ru" ? "Своя категория..." : "Custom category..."}</option>
                                  </select>

                                  {selectValue === "__custom__" && (
                                    <input
                                      type="text"
                                      value={currentCategory || ""}
                                      onChange={(e) => handleFieldChange('category', e.target.value)}
                                      placeholder={language === "ru" ? "Введите категорию вручную" : "Enter custom category"}
                                      className="w-full text-xs p-2 border border-brand-200 rounded-lg bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    />
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Description Input */}
                          <div>
                            <label className="block text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-1">
                              {language === "ru" ? "Описание работы" : "Description"} ({portfolioEditLang.toUpperCase()})
                            </label>
                            <textarea
                              rows={2}
                              value={currentDesc || ""}
                              onChange={(e) => handleFieldChange('description', e.target.value)}
                              placeholder={language === "ru" ? "Детали, дизайн, материалы..." : "Design details, materials..."}
                              className="w-full text-xs p-2 border border-brand-200 rounded-lg bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                            />
                          </div>
                        </div>

                        {/* Custom Direct URL field */}
                        <div className="pt-2">
                          <details className="cursor-pointer group/details">
                            <summary className="text-[10px] text-brand-400 hover:text-brand-600 select-none list-none flex items-center gap-1">
                              <span>🔗</span>
                              <span>{language === "ru" ? "Указать URL изображения напрямую" : "Specify Image URL directly"}</span>
                            </summary>
                            <div className="mt-1.5">
                              <input
                                type="text"
                                placeholder="https://example.com/image.jpg"
                                value={item.image || ""}
                                onChange={(e) => {
                                  const copy = [...localPortfolio];
                                  const targetIdx = copy.findIndex(p => p.id === item.id);
                                  if (targetIdx !== -1) {
                                    copy[targetIdx].image = e.target.value;
                                    setLocalPortfolio(copy);
                                  }
                                }}
                                className="w-full text-[11px] p-1.5 border border-brand-100 rounded bg-brand-50/20 focus:outline-none focus:border-brand-400"
                              />
                            </div>
                          </details>
                        </div>

                        {/* Helper Tools */}
                        <div className="mt-3 pt-3 border-t border-brand-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => copyToAllLanguages(actualIdx)}
                            className="text-[10px] text-brand-600 hover:text-brand-950 font-bold flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                            title={language === "ru" ? "Скопировать текущий текст во все языки" : "Apply current text to all languages"}
                          >
                            <Copy className="h-3 w-3" />
                            <span>{language === "ru" ? "Во все языки" : "To all languages"}</span>
                          </button>
                          
                          <span className="text-[9px] text-brand-400 font-mono">
                            ID: {item.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Compact Table/List View */
              <div className="bg-white border border-brand-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-brand-100 bg-brand-50/50 text-[11px] font-bold text-brand-700 uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">
                          <input 
                            type="checkbox"
                            checked={portfolioSelectedIds.length === filteredLocalPortfolio.length && filteredLocalPortfolio.length > 0}
                            onChange={() => {
                              if (portfolioSelectedIds.length === filteredLocalPortfolio.length) {
                                setPortfolioSelectedIds([]);
                              } else {
                                setPortfolioSelectedIds(filteredLocalPortfolio.map(p => p.id));
                              }
                            }}
                            className="rounded border-brand-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-4 w-20">{language === "ru" ? "Фото" : "Photo"}</th>
                        <th className="py-3 px-4 w-1/4">{language === "ru" ? "Название" : "Title"}</th>
                        <th className="py-3 px-4 w-1/5">{language === "ru" ? "Категория" : "Category"}</th>
                        <th className="py-3 px-4 w-1/4">{language === "ru" ? "Описание" : "Description"}</th>
                        <th className="py-3 px-4 w-28 text-center">{language === "ru" ? "Порядок" : "Order"}</th>
                        <th className="py-3 px-4 w-28 text-right">{language === "ru" ? "Действия" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-100 text-xs text-brand-900">
                      {filteredLocalPortfolio.map((item) => {
                        const currentTitle = portfolioEditLang === "en" ? item.titleEn : portfolioEditLang === "ru" ? item.titleRu : item.titleHu;
                        const currentCategory = portfolioEditLang === "en" ? item.categoryEn : portfolioEditLang === "ru" ? item.categoryRu : item.categoryHu;
                        const currentDesc = portfolioEditLang === "en" ? item.descriptionEn : portfolioEditLang === "ru" ? item.descriptionRu : item.descriptionHu;
                        const actualIdx = localPortfolio.findIndex(p => p.id === item.id);
                        const isSelected = portfolioSelectedIds.includes(item.id);

                        const handleFieldChange = (field: 'title' | 'category' | 'description', value: string) => {
                          const copy = [...localPortfolio];
                          const targetIdx = copy.findIndex(p => p.id === item.id);
                          if (targetIdx !== -1) {
                            if (field === 'title') {
                              if (portfolioEditLang === "en") copy[targetIdx].titleEn = value;
                              else if (portfolioEditLang === "ru") copy[targetIdx].titleRu = value;
                              else if (portfolioEditLang === "hu") copy[targetIdx].titleHu = value;
                            } else if (field === 'category') {
                              if (portfolioEditLang === "en") copy[targetIdx].categoryEn = value;
                              else if (portfolioEditLang === "ru") copy[targetIdx].categoryRu = value;
                              else if (portfolioEditLang === "hu") copy[targetIdx].categoryHu = value;
                            } else if (field === 'description') {
                              if (portfolioEditLang === "en") copy[targetIdx].descriptionEn = value;
                              else if (portfolioEditLang === "ru") copy[targetIdx].descriptionRu = value;
                              else if (portfolioEditLang === "hu") copy[targetIdx].descriptionHu = value;
                            }
                            setLocalPortfolio(copy);
                          }
                        };

                        const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const compressed = await compressImage(file);
                            const copy = [...localPortfolio];
                            const targetIdx = copy.findIndex(p => p.id === item.id);
                            if (targetIdx !== -1) {
                              copy[targetIdx].image = compressed;
                              setLocalPortfolio(copy);
                            }
                          }
                        };

                        return (
                          <tr 
                            key={item.id} 
                            className={`hover:bg-brand-50/40 transition-colors ${isSelected ? "bg-brand-50/20" : ""}`}
                          >
                            <td className="py-3 px-4 text-center">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setPortfolioSelectedIds(prev => 
                                    prev.includes(item.id) 
                                      ? prev.filter(id => id !== item.id) 
                                      : [...prev, item.id]
                                  );
                                }}
                                className="rounded border-brand-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 cursor-pointer"
                              />
                            </td>
                            
                            <td className="py-3 px-4">
                              <div 
                                className="h-12 w-12 rounded-lg bg-brand-50 border border-brand-100 overflow-hidden relative group/table-img cursor-pointer flex items-center justify-center"
                                onClick={() => document.getElementById(`table-file-input-${item.id}`)?.click()}
                              >
                                {item.image ? (
                                  <>
                                    <img src={item.image} alt="Thumbnail" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/table-img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <Upload className="h-3.5 w-3.5" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-brand-400">
                                    <Upload className="h-4 w-4" />
                                  </div>
                                )}
                                <input 
                                  id={`table-file-input-${item.id}`}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleFileSelect}
                                />
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <input 
                                  type="text"
                                  value={currentTitle || ""}
                                  onChange={(e) => handleFieldChange('title', e.target.value)}
                                  className="flex-1 min-w-0 text-xs font-semibold p-1.5 border border-brand-200 rounded bg-brand-50/10 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                  placeholder={language === "ru" ? "Название работы" : "Title"}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleTranslatePortfolioItem(item.id)}
                                  disabled={translatingIds.includes(item.id)}
                                  className="p-1.5 rounded border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
                                  title={language === "ru" ? "Перевести на все языки с помощью Gemini AI" : "Translate to all languages using Gemini AI"}
                                >
                                  <span>{translatingIds.includes(item.id) ? "⏳" : "🪄"}</span>
                                </button>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {(() => {
                                const matchedProc = localProcedures.find(
                                  p => p.nameEn === item.categoryEn || p.nameRu === item.categoryRu || p.nameHu === item.categoryHu
                                );
                                
                                let selectValue = "";
                                if (matchedProc) {
                                  selectValue = matchedProc.id;
                                } else if (currentCategory) {
                                  selectValue = "__custom__";
                                }

                                const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                                  const val = e.target.value;
                                  const copy = [...localPortfolio];
                                  const targetIdx = copy.findIndex(p => p.id === item.id);
                                  if (targetIdx === -1) return;

                                  if (val === "__custom__") {
                                    if (portfolioEditLang === "en") copy[targetIdx].categoryEn = "";
                                    else if (portfolioEditLang === "ru") copy[targetIdx].categoryRu = "";
                                    else if (portfolioEditLang === "hu") copy[targetIdx].categoryHu = "";
                                  } else if (val === "") {
                                    copy[targetIdx].categoryEn = "";
                                    copy[targetIdx].categoryRu = "";
                                    copy[targetIdx].categoryHu = "";
                                  } else {
                                    const found = localProcedures.find(p => p.id === val);
                                    if (found) {
                                      copy[targetIdx].categoryEn = found.nameEn;
                                      copy[targetIdx].categoryRu = found.nameRu;
                                      copy[targetIdx].categoryHu = found.nameHu;
                                    }
                                  }
                                  setLocalPortfolio(copy);
                                };

                                return (
                                  <div className="space-y-1">
                                    <select
                                      value={selectValue}
                                      onChange={handleSelectChange}
                                      className="w-full text-xs p-1.5 border border-brand-200 rounded bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer"
                                    >
                                      <option value="">{language === "ru" ? "Выбрать..." : "Select..."}</option>
                                      {localProcedures.map(p => {
                                        const label = portfolioEditLang === "ru" ? p.nameRu : portfolioEditLang === "hu" ? p.nameHu : p.nameEn;
                                        return (
                                          <option key={p.id} value={p.id}>
                                            {label}
                                          </option>
                                        );
                                      })}
                                      <option value="__custom__">{language === "ru" ? "Своя..." : "Custom..."}</option>
                                    </select>

                                    {selectValue === "__custom__" && (
                                      <input
                                        type="text"
                                        value={currentCategory || ""}
                                        onChange={(e) => handleFieldChange('category', e.target.value)}
                                        placeholder={language === "ru" ? "Своя..." : "Custom..."}
                                        className="w-full text-xs p-1.5 border border-brand-200 rounded bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                      />
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            <td className="py-3 px-4">
                              <textarea 
                                rows={1}
                                value={currentDesc || ""}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                className="w-full text-xs p-1.5 border border-brand-200 rounded bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-y"
                                placeholder={language === "ru" ? "Опишите работу..." : "Details..."}
                              />
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={actualIdx === 0}
                                  onClick={() => moveUp(actualIdx)}
                                  className={`p-1 rounded bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-500 hover:text-white transition-colors ${actualIdx === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                                  title={language === "ru" ? "Выше" : "Up"}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={actualIdx === localPortfolio.length - 1}
                                  onClick={() => moveDown(actualIdx)}
                                  className={`p-1 rounded bg-brand-50 border border-brand-100 text-brand-700 hover:bg-brand-500 hover:text-white transition-colors ${actualIdx === localPortfolio.length - 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                                  title={language === "ru" ? "Ниже" : "Down"}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => copyToAllLanguages(actualIdx)}
                                  className="p-1 px-2 rounded-full text-[10px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors flex items-center gap-0.5 cursor-pointer"
                                  title={language === "ru" ? "Скопировать во все языки" : "Apply to all languages"}
                                >
                                  <Copy className="h-3 w-3" />
                                  <span className="hidden xl:inline">{language === "ru" ? "Во все" : "To all"}</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    showConfirm(
                                      language === "ru" ? "Удалить работу" : "Delete Item",
                                      language === "ru" ? `Вы уверены, что хотите удалить эту работу?` : `Are you sure you want to delete this item?`,
                                      () => setLocalPortfolio(localPortfolio.filter(p => p.id !== item.id))
                                    );
                                  }}
                                  className="p-1 rounded text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-100 transition-colors cursor-pointer"
                                  title={language === "ru" ? "Удалить" : "Delete"}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SEO & Image Performance Optimization Tips (Enhancement 5) */}
            <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-brand-950 font-serif">
                    {language === "ru" ? "SEO и оптимизация галереи" : language === "hu" ? "SEO és galéria optimalizáció" : "SEO & Gallery Performance"}
                  </h4>
                  <p className="text-xs text-brand-500">
                    {language === "ru" ? "Советы по увеличению трафика и ускорению загрузки сайта." : "Pro-tips to drive more traffic and speed up salon page load times."}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-xs text-brand-700 leading-relaxed">
                <div className="bg-brand-50/40 border border-brand-100 p-3.5 rounded-xl space-y-1">
                  <p className="font-bold text-brand-900 flex items-center gap-1.5">
                    <span>⚡</span> {language === "ru" ? "Авто-сжатие картинок" : "Auto Compression"}
                  </p>
                  <p className="text-[11px] text-brand-600">
                    {language === "ru"
                      ? "Все загружаемые фото автоматически сжимаются на клиенте до 1000px и конвертируются в оптимизированный JPEG, чтобы сайт загружался у клиентов за миллисекунды."
                      : "Uploaded images are instantly compressed to 1000px and converted to client-side optimized JPEG for blazing fast load times."}
                  </p>
                </div>
                <div className="bg-brand-50/40 border border-brand-100 p-3.5 rounded-xl space-y-1">
                  <p className="font-bold text-brand-900 flex items-center gap-1.5">
                    <span>🔍</span> {language === "ru" ? "Локализация для SEO" : "Multi-language SEO"}
                  </p>
                  <p className="text-[11px] text-brand-600">
                    {language === "ru"
                      ? "Заполняйте описания работ на русском, английском и венгерском. Поисковые роботы (Google) ранжируют многоязычные страницы значительно выше."
                      : "Fill out titles and details in all three languages. Google indexation rates are up to 3x higher for localized gallery items."}
                  </p>
                </div>
                <div className="bg-brand-50/40 border border-brand-100 p-3.5 rounded-xl space-y-1">
                  <p className="font-bold text-brand-900 flex items-center gap-1.5">
                    <span>🎨</span> {language === "ru" ? "Специфика Категорий" : "Category Structuring"}
                  </p>
                  <p className="text-[11px] text-brand-600">
                    {language === "ru"
                      ? "Придерживайтесь единых названий категорий (например, 'Manicure', 'Pedicure'), чтобы клиенты могли легко фильтровать ваши работы в главном меню."
                      : "Use consistent category names like 'Manicure' or 'Pedicure'. This makes it seamless for potential clients to sort and explore."}
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-4 border-t border-brand-200/50 pt-6">
              <button
                type="button"
                onClick={handleSavePortfolio}
                className="flex items-center gap-2 rounded-full bg-brand-500 px-8 py-3.5 text-sm font-bold text-white hover:bg-brand-600 shadow-md transition-all hover:scale-[1.02] cursor-pointer animate-pulse"
              >
                <Save className="h-4.5 w-4.5" />
                <span>{language === "ru" ? "Сохранить все изменения в портфолио" : "Save All Portfolio Changes"}</span>
              </button>
            </div>
          </motion.div>
        )}
        {/* TAB 3: EDIT CONTACTS */}
        {activeTab === "contacts" && localContacts && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white border border-brand-200/50 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto space-y-6"
          >
            <div className="flex items-center justify-between border-b border-brand-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center"><MapPin className="h-5 w-5 text-brand-500" /></div>
                <div>
                  <h3 className="font-serif text-xl font-medium text-brand-950">{language === "ru" ? "Контакты и данные салона" : language === "hu" ? "Elérhetőségek és szalon adatok" : "Salon Contact Details"}</h3>
                  <p className="text-xs text-brand-500 mt-1">{language === "ru" ? "Измените адрес, телефоны, график и карту для Будапешта." : language === "hu" ? "Módosítsa a budapesti címét, telefonszámait, nyitvatartását és térképét." : "Configure Budapest branch phone numbers, address and interactive map."}</p>
                </div>
              </div>
              <button
                onClick={handleSaveContacts}
                className="flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors shadow-sm cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{language === "ru" ? "Сохранить" : language === "hu" ? "Mentés" : "Save Info"}</span>
              </button>
            </div>

            {contactsSaveSuccess && (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-600 border border-emerald-100">
                ✓ {language === "ru" ? "Контакты успешно сохранены на сервере!" : "Salon contacts successfully saved on the server!"}
              </div>
            )}

            <div className="grid gap-4 text-xs">
              {/* Phones & Email */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-brand-800 uppercase tracking-wider text-[10px]">{language === "ru" ? "Телефон 1 *" : "Phone 1 *"}</label>
                  <input
                    type="text"
                    required
                    value={localContacts.phone1}
                    onChange={(e) => handleContactsFieldChange("phone1", e.target.value)}
                    className="mt-1 w-full rounded border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-brand-800 uppercase tracking-wider text-[10px]">{language === "ru" ? "Телефон 2" : "Phone 2 (Optional)"}</label>
                  <input
                    type="text"
                    value={localContacts.phone2}
                    onChange={(e) => handleContactsFieldChange("phone2", e.target.value)}
                    className="mt-1 w-full rounded border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-brand-800 uppercase tracking-wider text-[10px]">Email *</label>
                  <input
                    type="email"
                    required
                    value={localContacts.email}
                    onChange={(e) => handleContactsFieldChange("email", e.target.value)}
                    className="mt-1 w-full rounded border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:outline-none focus:border-brand-400"
                  />
                </div>
              </div>

              {/* Instagram & Maps */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-brand-800 uppercase tracking-wider text-[10px]">Instagram Handle</label>
                  <input
                    type="text"
                    value={localContacts.instagram}
                    onChange={(e) => handleContactsFieldChange("instagram", e.target.value)}
                    placeholder="@velvet_nails_budapest"
                    className="mt-1 w-full rounded border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-brand-800 uppercase tracking-wider text-[10px]">Google Maps Embed URL</label>
                  <input
                    type="text"
                    value={localContacts.mapUrl}
                    onChange={(e) => handleContactsFieldChange("mapUrl", e.target.value)}
                    className="mt-1 w-full rounded border border-brand-200 px-3 py-2 text-xs text-brand-950 focus:outline-none focus:border-brand-400"
                  />
                </div>
              </div>

              {/* Salon Address */}
              <div className="space-y-3 pt-3 border-t border-brand-100">
                <div>
                  <label className="block font-bold text-brand-800 uppercase tracking-wider text-[10px]">
                    {language === "ru" ? "Адрес салона (Будапешт) *" : "Salon Address (Budapest) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={localContacts.addressEn}
                    onChange={(e) => handleContactsFieldChange("addressEn", e.target.value)}
                    className="mt-1 w-full rounded border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:outline-none focus:border-brand-400"
                    placeholder="e.g. Budapest, Király u. 12, 1061 Hungary"
                  />
                </div>
              </div>

              {/* Working Hours */}
              <div className="space-y-3 pt-3 border-t border-brand-100">
                <div>
                  <label className="block font-bold text-brand-800 uppercase tracking-wider text-[10px]">
                    {language === "ru" ? "Часы работы *" : "Working Hours *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={localContacts.workingHoursEn}
                    onChange={(e) => handleContactsFieldChange("workingHoursEn", e.target.value)}
                    className="mt-1 w-full rounded border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:outline-none focus:border-brand-400"
                    placeholder="e.g. Mon-Sat: 09:00 - 21:00, Sun: Closed"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-brand-100 pt-4 mt-6">
              <button
                onClick={handleSaveContacts}
                className="flex items-center gap-1.5 rounded-full bg-brand-500 px-6 py-3 text-xs font-bold text-white hover:bg-brand-600 transition-colors shadow-md cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{language === "ru" ? "Сохранить контактные данные" : language === "hu" ? "Elérhetőségek mentése" : "Save Contact Information"}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "settings" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white border border-brand-200/50 rounded-2xl p-6 shadow-sm max-w-lg mx-auto space-y-6"
          >
            <div className="flex items-center gap-3 border-b border-brand-100 pb-4">
              <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center">
                <Lock className="h-5 w-5 text-brand-500" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-medium text-brand-950">
                  {language === "ru" ? "Сменить пароль" : language === "hu" ? "Jelszó módosítása" : "Change Password"}
                </h3>
                <p className="text-xs text-brand-500 mt-0.5">
                  {language === "ru" ? "Обновите пароль администратора." : language === "hu" ? "Frissítse az adminisztrátori jelszót." : "Update your admin access password."}
                </p>
              </div>
            </div>

            {settingsMessage && (
              <div className={`rounded-lg p-3 text-xs font-semibold border ${
                settingsMessage.type === "success" 
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                  : "bg-rose-50 text-rose-600 border-rose-100"
              }`}>
                {settingsMessage.type === "success" ? "✓" : "⚠️"} {settingsMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-800 uppercase tracking-wider mb-1">
                  {language === "ru" ? "Текущий пароль" : language === "hu" ? "Jelenlegi jelszó" : "Current Password"}
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-brand-200 px-4 py-2.5 text-sm text-brand-950 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/50 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-800 uppercase tracking-wider mb-1">
                  {language === "ru" ? "Новый пароль" : language === "hu" ? "Új jelszó" : "New Password"}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-brand-200 px-4 py-2.5 text-sm text-brand-950 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400/50 transition-shadow"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600 transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {language === "ru" ? "Сохранить новый пароль" : language === "hu" ? "Új jelszó mentése" : "Save New Password"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Quick Drawer manual booking */}
        <AnimatePresence>
          {showAddDrawer && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddDrawer(false)}
                className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm cursor-pointer"
              />

              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.35 }}
                className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between z-10"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-brand-200/50 pb-4 mb-6">
                    <h3 className="font-serif text-xl font-light text-brand-950 flex items-center gap-2">
                      <Plus className="h-5 w-5 text-brand-500" />
                      {t("adminDrawerTitle")}
                    </h3>
                    <button
                      onClick={() => setShowAddDrawer(false)}
                      className="rounded-full p-1.5 hover:bg-brand-100 text-brand-400 cursor-pointer"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>

                  {drawerError && (
                    <div className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-600 border border-rose-100 mb-4">
                      ⚠️ {drawerError}
                    </div>
                  )}

                  <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-brand-800">{t("bookingLabelFirstName")}</label>
                        <input
                          type="text"
                          required
                          value={newFirstName}
                          onChange={(e) => setNewFirstName(e.target.value)}
                          placeholder="Anna"
                          className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:border-brand-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-brand-800">{t("bookingLabelLastName")}</label>
                        <input
                          type="text"
                          required
                          value={newLastName}
                          onChange={(e) => setNewLastName(e.target.value)}
                          placeholder="Szabó"
                          className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:border-brand-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-brand-800">{t("bookingLabelPhone")}</label>
                      <input
                        type="tel"
                        required
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+36 (30) 123-4567"
                        className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:border-brand-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-brand-800">{t("bookingLabelEmail")}</label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:border-brand-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-brand-800">{t("bookingLabelProcedure")}</label>
                      <select
                        required
                        value={newProcedure}
                        onChange={(e) => setNewProcedure(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-950 focus:border-brand-400 focus:outline-none cursor-pointer"
                      >
                        {procedures.map((p) => (
                          <option key={p.id} value={p.id}>
                            {language === "ru" ? p.nameRu : language === "hu" ? p.nameHu : p.nameEn} ({p.price.toLocaleString(language === "hu" ? "hu-HU" : language === "ru" ? "ru-RU" : "en-US")} Ft)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-brand-800">{t("bookingLabelDate")}</label>
                        <input
                          type="date"
                          required
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:border-brand-400 focus:outline-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-brand-800">{t("bookingLabelTime")}</label>
                        <select
                          required
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-950 focus:border-brand-400 focus:outline-none cursor-pointer"
                        >
                          {timeSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-brand-800">{t("adminDrawerClientComment")}</label>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="E.g. booked via phone call"
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-brand-200 px-3 py-2 text-sm text-brand-950 focus:border-brand-400 focus:outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={drawerLoading}
                      className="w-full rounded-full bg-brand-500 py-3 text-sm font-bold text-white shadow hover:bg-brand-600 transition-colors disabled:bg-brand-300 cursor-pointer animate-none"
                    >
                      {drawerLoading ? t("adminDrawerBtnSubmitting") : t("adminDrawerBtnSubmit")}
                    </button>
                  </form>
                </div>
                
                <div className="text-center text-[10px] text-brand-400 border-t border-brand-100 pt-4 mt-6">
                  {t("adminDrawerFooter")}
                </div>
              </motion.div>
            </div>
          )}

          {selectedCalendarBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedCalendarBooking(null)}
                className="absolute inset-0 bg-brand-950/65 backdrop-blur-sm cursor-pointer"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-brand-100"
              >
                {/* Header with status color background */}
                <div className={`p-6 text-white relative ${
                  selectedCalendarBooking.status === "confirmed"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                    : selectedCalendarBooking.status === "cancelled"
                    ? "bg-gradient-to-r from-rose-500 to-red-600"
                    : "bg-gradient-to-r from-amber-500 to-orange-600"
                }`}>
                  <button
                    onClick={() => setSelectedCalendarBooking(null)}
                    className="absolute top-4 right-4 text-white/80 hover:text-white rounded-full p-1 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>

                  <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-2.5 py-1 rounded-full text-white inline-block mb-3 backdrop-blur-sm">
                    {selectedCalendarBooking.status === "confirmed"
                      ? t("adminStatsConfirmed")
                      : selectedCalendarBooking.status === "cancelled"
                      ? t("adminStatsCancelled")
                      : t("bookingReceiptStatusPending")}
                  </span>

                  <h3 className="text-2xl font-serif font-light">
                    {selectedCalendarBooking.firstName} {selectedCalendarBooking.lastName}
                  </h3>
                </div>

                {/* Content body */}
                <div className="p-6 space-y-4 text-sm text-brand-900">
                  {/* Service info */}
                  <div className="flex items-start gap-3 border-b border-brand-100 pb-4">
                    <Sparkles className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-brand-500 font-bold uppercase tracking-wider">{t("adminTableProcedure")}</p>
                      <h4 className="font-semibold text-brand-950 text-base mt-0.5 flex flex-col gap-1.5 items-start">
                        <span>
                          {(() => {
                            const pIds = selectedCalendarBooking.procedureIds && selectedCalendarBooking.procedureIds.length > 0 
                              ? selectedCalendarBooking.procedureIds 
                              : [selectedCalendarBooking.procedureId];
                            const selectedProcs = procedures.filter(proc => pIds.includes(proc.id));
                            if (selectedProcs.length === 0) return "Unknown";
                            return selectedProcs.map(p => {
                              if (language === "ru") return p.nameRu;
                              if (language === "hu") return p.nameHu;
                              return p.nameEn;
                            }).join(" + ");
                          })()}
                        </span>
                        {(() => {
                          const pIds = selectedCalendarBooking.procedureIds && selectedCalendarBooking.procedureIds.length > 0 
                            ? selectedCalendarBooking.procedureIds 
                            : [selectedCalendarBooking.procedureId];
                          return pIds.length > 1 ? (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200 uppercase tracking-wide shrink-0">
                              ⚡ {language === "ru" ? "Несколько процедур" : language === "hu" ? "Több szolgáltatás" : "Multi-Procedure"} ({pIds.length})
                            </span>
                          ) : null;
                        })()}
                      </h4>
                      {(() => {
                        const pIds = selectedCalendarBooking.procedureIds && selectedCalendarBooking.procedureIds.length > 0 
                          ? selectedCalendarBooking.procedureIds 
                          : [selectedCalendarBooking.procedureId];
                        const selectedProcs = procedures.filter(proc => pIds.includes(proc.id));
                        if (selectedProcs.length === 0) return null;
                        const totalDuration = selectedProcs.reduce((sum, p) => sum + p.durationMinutes, 0);
                        const totalPrice = selectedProcs.reduce((sum, p) => sum + p.price, 0);
                        return (
                          <div className="flex items-center gap-3 text-xs text-brand-600 mt-1.5 font-medium">
                            <span className="bg-brand-50 border border-brand-100 px-2 py-0.5 rounded">
                              ⌛ {totalDuration} {t("bookingMinutes")}
                            </span>
                            <span className="bg-brand-50 border border-brand-100 px-2 py-0.5 rounded font-mono text-brand-800">
                              💰 {totalPrice.toLocaleString(language === "hu" ? "hu-HU" : "en-US")} Ft
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Time & Date */}
                  <div className="grid grid-cols-2 gap-4 border-b border-brand-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-brand-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">{t("bookingLabelDate")}</p>
                        <p className="font-semibold text-brand-900 mt-0.5">{formatDate(selectedCalendarBooking.date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-brand-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">{t("bookingLabelTime")}</p>
                        <p className="font-semibold text-brand-900 mt-0.5 font-mono">{selectedCalendarBooking.time}</p>
                      </div>
                    </div>
                  </div>

                  {/* Phone number with Quick Actions */}
                  <div className="border-b border-brand-100 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-brand-500 shrink-0" />
                        <div>
                          <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">{t("adminTablePhone")}</p>
                          <p className="font-semibold text-brand-900 mt-0.5">{selectedCalendarBooking.phone}</p>
                        </div>
                      </div>
                      <a
                        href={`tel:${selectedCalendarBooking.phone}`}
                        className="rounded-full bg-brand-50 hover:bg-brand-100 border border-brand-200/60 p-2 text-brand-700 hover:text-brand-950 transition-colors cursor-pointer"
                        title="Call Client"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pl-8">
                      <a
                        href={getWhatsAppUrl(selectedCalendarBooking)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full transition-colors cursor-pointer shadow-sm"
                        title="Send WhatsApp Message"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                        <span>WhatsApp</span>
                      </a>
                      <button
                        onClick={() => handleCopyBookingInfo(selectedCalendarBooking)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1 rounded-full transition-colors cursor-pointer shadow-sm"
                        title="Copy Booking Details"
                      >
                        {copiedBookingId === selectedCalendarBooking.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-semibold">{language === "ru" ? "Скопировано" : language === "hu" ? "Másolva" : "Copied"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-brand-500" />
                            <span>{language === "ru" ? "Копировать" : language === "hu" ? "Másolás" : "Copy"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Comment */}
                  {selectedCalendarBooking.comment && (
                    <div className="bg-brand-50/50 rounded-xl p-3 border border-brand-100">
                      <p className="text-[10px] text-brand-500 font-bold uppercase tracking-wider mb-1">📝 {t("adminDrawerClientComment")}</p>
                      <p className="text-xs text-brand-800 leading-relaxed italic">
                        "{selectedCalendarBooking.comment}"
                      </p>
                    </div>
                  )}

                  {/* Footer actions */}
                  <div className="flex items-center justify-between pt-2 gap-3">
                    <div className="flex items-center gap-2">
                      {selectedCalendarBooking.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              onUpdateStatus(selectedCalendarBooking.id, "confirmed");
                              setSelectedCalendarBooking(null);
                            }}
                            className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 text-xs font-bold transition-colors shadow-md cursor-pointer"
                          >
                            {t("adminBtnConfirm")}
                          </button>
                          <button
                            onClick={() => {
                              onUpdateStatus(selectedCalendarBooking.id, "cancelled");
                              setSelectedCalendarBooking(null);
                            }}
                            className="rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 px-5 py-2.5 text-xs font-bold transition-colors cursor-pointer"
                          >
                            {t("adminBtnDecline")}
                          </button>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        showConfirm(
                          language === "ru" ? "Удаление записи" : language === "hu" ? "Időpont törlése" : "Delete Booking",
                          t("adminConfirmDeleteMsg"),
                          () => {
                            onDeleteBooking(selectedCalendarBooking.id);
                            setSelectedCalendarBooking(null);
                          }
                        );
                      }}
                      className="rounded-full hover:bg-rose-50 text-rose-600 hover:text-rose-700 px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-transparent hover:border-rose-200/50 ml-auto cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{language === "ru" ? "Удалить" : "Delete"}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        {/* Custom Non-blocking Confirm Dialog Modal */}
        <AnimatePresence>
          {confirmDialog.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm"
              />
              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="relative w-full max-w-md overflow-hidden rounded-2xl border border-brand-200/60 bg-white p-6 shadow-2xl z-10"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-serif text-lg font-bold text-brand-950">
                      {confirmDialog.title}
                    </h3>
                    <p className="text-sm text-brand-600 leading-relaxed">
                      {confirmDialog.message}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    className="rounded-full border border-brand-200 hover:bg-brand-50 text-brand-700 px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {language === "ru" ? "Отмена" : language === "hu" ? "Mégse" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={confirmDialog.onConfirm}
                    className="rounded-full bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    {language === "ru" ? "Подтвердить" : language === "hu" ? "Megerősítés" : "Confirm"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
