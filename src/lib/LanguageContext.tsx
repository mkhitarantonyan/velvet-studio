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

  const setTransCookie = (lang: Language) => {
    const domain = window.location.hostname;
    const val = lang === "en" ? "" : "/en/" + lang;
    
    // Set cookie for path=/
    document.cookie = `googtrans=${val}; path=/;`;
    document.cookie = `googtrans=${val}; path=/; domain=${domain};`;
    
    // Set for main domain if applicable
    const parts = domain.split(".");
    if (parts.length > 2) {
      const mainDomain = "." + parts.slice(-2).join(".");
      document.cookie = `googtrans=${val}; path=/; domain=${mainDomain};`;
    }
  };

  const setLanguage = (lang: Language) => {
    if (lang === language) return;
    
    localStorage.setItem("velvet_salon_lang", lang);
    setTransCookie(lang);
    setLanguageState(lang);

    // Try to trigger Google Translate dynamically without reloading the page
    const selectEl = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (selectEl) {
      try {
        selectEl.value = lang;
        selectEl.dispatchEvent(new Event("change"));
      } catch (err) {
        console.warn("Failed to dynamically switch Google Translate:", err);
      }
    }
  };

  useEffect(() => {
    // Synchronize cookie on load
    setTransCookie(language);

    // Inject CSS to hide Google Translate bar and banners seamlessly
    const styleId = "google-translate-hide-css";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .goog-te-banner-frame.skiptranslate, 
        .goog-te-banner-frame,
        iframe.goog-te-banner-frame,
        #goog-gt-tt, 
        .goog-te-balloon-frame {
          display: none !important;
          visibility: hidden !important;
        }
        body {
          top: 0px !important;
        }
        .goog-tooltip {
          display: none !important;
        }
        .goog-tooltip:hover {
          display: none !important;
        }
        .goog-text-highlight {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Add Google Translate element container
    if (!document.getElementById("google_translate_element")) {
      const div = document.createElement("div");
      div.id = "google_translate_element";
      div.style.display = "none";
      document.body.appendChild(div);
    }

    // Define init function
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,ru,hu',
        layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
      }, 'google_translate_element');
    };

    // Load Google Translate script
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.type = "text/javascript";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
    }
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
