import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, TRANSLATIONS } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyOrObj: any, field?: string) => string;
  formatPrice: (price: number, isPreliminary?: boolean) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("velvet_salon_lang");
    if (saved === "en" || saved === "ru" || saved === "hu") return saved;
    return "en"; // Default to English as requested
  });

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    
    localStorage.setItem("velvet_salon_lang", lang);
    setLanguageState(lang);
  };

  useEffect(() => {
    // Set the `lang` attribute on the `<html>` tag for accessibility and SEO.
    document.documentElement.lang = language;
  }, [language]);

  const t = (keyOrObj: any, field?: string): string => {
    if (!keyOrObj) return "";

    // 1. Dynamic database object translation, e.g. t(procedure, "name") -> nameRu, nameHu, nameEn
    if (typeof keyOrObj === "object" && field) {
      const fieldCapitalized = field.charAt(0).toUpperCase() + field.slice(1);
      const langCapitalized = language.charAt(0).toUpperCase() + language.slice(1); // En, Ru, Hu
      
      const exactKey = `${field}${langCapitalized}`;
      if (exactKey in keyOrObj && keyOrObj[exactKey]) {
        return keyOrObj[exactKey];
      }
      
      // Fallback
      const enKey = `${field}En`;
      if (enKey in keyOrObj && keyOrObj[enKey]) {
        return keyOrObj[enKey];
      }
      return keyOrObj[field] || "";
    }

    // 2. Inline language translation, e.g. t({ en: "...", ru: "...", hu: "..." })
    if (typeof keyOrObj === "object" && !field) {
      if (keyOrObj[language]) {
        return keyOrObj[language];
      }
      return keyOrObj["en"] || keyOrObj["hu"] || keyOrObj["ru"] || "";
    }

    // 3. Static translation dictionary lookup
    const dict = TRANSLATIONS[language];
    return dict[keyOrObj] || TRANSLATIONS["en"][keyOrObj] || keyOrObj;
  };

  const formatPrice = (price: number, isPreliminary: boolean = true): string => {
    const formattedHuf = price.toLocaleString(language === "hu" ? "hu-HU" : "en-US");
    // Standard exchange rate: 1 EUR = 400 HUF
    const eurAmount = Math.ceil(price / 400);
    const formattedEur = eurAmount.toLocaleString(language === "hu" ? "hu-HU" : "en-US");
    const prefix = isPreliminary ? "~" : "";
    return `${prefix}${formattedHuf} Ft (${prefix}${formattedEur} €)`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatPrice }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
