import React from "react";
import { Sparkles, Calendar, Globe } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../lib/LanguageContext";
import { Language } from "../lib/translations";

interface HeaderProps {
  onOpenBooking: () => void;
  activeSection: string;
}

export default function Header({ onOpenBooking, activeSection }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "ru", label: "RU" },
    { code: "hu", label: "HU" }
  ];

  return (
    <header className="sticky top-0 z-45 w-full border-b border-brand-200/40 bg-brand-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo */}
        <a href="#hero" className="flex items-center space-x-1.5 sm:space-x-2">
          <img 
            src="/src/assets/images/logo-02.png" 
            alt="Smart Nail Studio logo" 
            className="h-8 w-8 sm:h-9 sm:w-9" />
          <div className="flex flex-col min-w-0">
            <span className="font-serif text-lg sm:text-xl font-bold tracking-widest text-brand-900 uppercase leading-none">
              {t("logoTitle")}
            </span>
            <span className="text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.25em] text-brand-600 font-medium uppercase mt-0.5 truncate">
              {t("logoSubtitle")}
            </span>
          </div>
        </a>

        {/* Navigation - Hidden on small screens */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-brand-800">
          <a
            href="#portfolio"
            className={`transition-colors hover:text-brand-500 relative py-1 ${
              activeSection === "portfolio" ? "text-brand-600" : ""
            }`}
          >
            {t("navGallery")}
            {activeSection === "portfolio" && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-500"
              />
            )}
          </a>
          <a
            href="#procedures"
            className={`transition-colors hover:text-brand-500 relative py-1 ${
              activeSection === "procedures" ? "text-brand-600" : ""
            }`}
          >
            {t("navServices")}
            {activeSection === "procedures" && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-500"
              />
            )}
          </a>
          <a
            href="#contacts"
            className={`transition-colors hover:text-brand-500 relative py-1 ${
              activeSection === "contacts" ? "text-brand-600" : ""
            }`}
          >
            {t("navContacts")}
            {activeSection === "contacts" && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-500"
              />
            )}
          </a>
        </nav>

        {/* Action Buttons & Language Selector */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          
          {/* Language Selector */}
          <div className="flex items-center bg-white/60 border border-brand-200/60 rounded-full p-0.5 sm:p-1 shadow-sm gap-0.5">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={`flex items-center rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                  language === lang.code
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-brand-700 hover:bg-brand-100"
                }`}
                title={lang.label}
              >
                <span>{lang.label}</span>
              </button>
            ))}
          </div>

          {/* Book button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onOpenBooking}
            className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-brand-500 px-3 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-brand-600 transition-colors shrink-0"
          >
            <Calendar className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">{t("bookButton")}</span>
            <span className="sm:hidden">{t("bookButtonMobile")}</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
