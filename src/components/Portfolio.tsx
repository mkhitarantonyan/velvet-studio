import React, { useState } from "react";
import { PORTFOLIO } from "../data";
import { PortfolioItem } from "../types";
import { Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../lib/LanguageContext";

export default function Portfolio() {
  const { language, t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const getLocalizedCategory = (item: PortfolioItem) => {
    if (language === "ru") return item.categoryRu;
    if (language === "hu") return item.categoryHu;
    return item.categoryEn;
  };

  const getLocalizedTitle = (item: PortfolioItem) => {
    if (language === "ru") return item.titleRu;
    if (language === "hu") return item.titleHu;
    return item.titleEn;
  };

  const getLocalizedDesc = (item: PortfolioItem) => {
    if (language === "ru") return item.descriptionRu;
    if (language === "hu") return item.descriptionHu;
    return item.descriptionEn;
  };

  // Categories translation map for the tabs
  const categoriesList = [
    { key: "All", label: t("galleryAll") },
    { key: "Minimalism", label: t("galleryMinimalism") },
    { key: "Classics", label: t("galleryClassics") },
    { key: "Art", label: t("galleryArt") }
  ];

  const filteredPortfolio = selectedCategory === "All"
    ? PORTFOLIO
    : PORTFOLIO.filter(item => item.categoryEn === selectedCategory);

  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);

  return (
    <section id="portfolio" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center">
          <h2 className="font-serif text-3xl font-light tracking-tight text-brand-950 sm:text-4xl">
            {t("galleryTitle1")} <span className="font-serif italic text-brand-500 font-normal">{t("galleryTitle2")}</span>
          </h2>
          <div className="mx-auto mt-2 h-0.5 w-16 bg-brand-300" />
          <p className="mx-auto mt-4 max-w-2xl text-sm text-brand-700">
            {t("galleryDesc")}
          </p>
        </div>

        {/* Category Filters */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {categoriesList.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`rounded-full px-5 py-2 text-xs font-semibold tracking-wide transition-all ${
                selectedCategory === cat.key
                  ? "bg-brand-500 text-white shadow-md shadow-brand-200"
                  : "bg-brand-50 text-brand-700 hover:bg-brand-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid of Works */}
        <motion.div
          layout
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredPortfolio.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                key={item.id}
                onClick={() => setActiveItem(item)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-brand-100 bg-brand-50 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="aspect-4/3 w-full overflow-hidden bg-brand-200">
                  <img
                    src={item.image}
                    alt={getLocalizedTitle(item)}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Info Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-brand-950/80 via-brand-950/20 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                      {getLocalizedCategory(item)}
                    </span>
                    <div className="rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm">
                      <Eye className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-white">
                    {getLocalizedTitle(item)}
                  </h3>
                  <p className="text-[11px] text-brand-100 line-clamp-1 mt-0.5">
                    {getLocalizedDesc(item)}
                  </p>
                </div>

                {/* Static Card Footer for Mobile (always visible fallback) */}
                <div className="p-3 bg-white sm:group-hover:bg-brand-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-brand-900">{getLocalizedTitle(item)}</h3>
                    <span className="text-[10px] font-medium text-brand-600 bg-brand-100/60 px-2 py-0.5 rounded">
                      {getLocalizedCategory(item)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Lightbox / Zoom-In Modal */}
        <AnimatePresence>
          {activeItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveItem(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/85 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-2xl w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                {/* Close Button */}
                <button
                  onClick={() => setActiveItem(null)}
                  className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="md:flex">
                  {/* Photo */}
                  <div className="md:w-1/2 aspect-4/3 md:aspect-auto md:h-96">
                    <img
                      src={activeItem.image}
                      alt={getLocalizedTitle(activeItem)}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  {/* Text Description */}
                  <div className="p-6 md:w-1/2 flex flex-col justify-center">
                    <span className="inline-block rounded bg-brand-100 px-2.5 py-0.5 text-[10px] font-bold text-brand-800 uppercase tracking-wider self-start">
                      {getLocalizedCategory(activeItem)}
                    </span>
                    <h3 className="mt-3 font-serif text-2xl font-light text-brand-950">
                      {getLocalizedTitle(activeItem)}
                    </h3>
                    <div className="mt-2 h-0.5 w-12 bg-brand-300" />
                    <p className="mt-4 text-sm leading-relaxed text-brand-700">
                      {getLocalizedDesc(activeItem)}
                    </p>
                    <div className="mt-8 border-t border-brand-100 pt-4">
                      <p className="text-xs text-brand-500">
                        {t("galleryModalSlogan")}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
