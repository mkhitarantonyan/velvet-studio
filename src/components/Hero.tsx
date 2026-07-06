import React from "react";
import { ArrowRight, Star, Heart, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../lib/LanguageContext";

interface HeroProps {
  onOpenBooking: () => void;
}

export default function Hero({ onOpenBooking }: HeroProps) {
  const { t } = useLanguage();

  return (
    <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-brand-100/50 via-brand-50 to-white py-16 sm:py-24">
      {/* Abstract luxury shapes */}
      <div className="absolute top-1/4 -right-24 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
      <div className="absolute -left-12 -bottom-12 h-80 w-80 rounded-full bg-brand-300/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
          
          {/* Text Content */}
          <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-7 lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-200/60 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-brand-800"
            >
              <Star className="h-3 w-3 fill-brand-600 text-brand-600" />
              {t("heroTagline")}
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-4 font-serif text-4xl font-light tracking-tight text-brand-950 sm:text-5xl md:text-6xl"
            >
              {t("heroTitle1")} <br className="hidden sm:inline" />
              <span className="font-serif italic text-brand-500 font-normal">{t("heroTitle2")}</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 text-base leading-relaxed text-brand-800 sm:text-lg"
            >
              {t("heroDesc")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-10 flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-4"
            >
              <button
                onClick={onOpenBooking}
                className="flex items-center justify-center gap-2 rounded-full bg-brand-500 px-8 py-4 text-base font-bold text-white shadow-xl hover:bg-brand-600 hover:shadow-brand-300/50 transition-all transform hover:-translate-y-0.5"
              >
                {t("heroBookCTA")}
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#portfolio"
                className="flex items-center justify-center gap-2 rounded-full border border-brand-300 bg-white px-8 py-4 text-base font-semibold text-brand-800 hover:bg-brand-50 transition-colors"
              >
                {t("heroPortfolioCTA")}
              </a>
            </motion.div>

            {/* Micro Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-12 grid grid-cols-1 xs:grid-cols-3 gap-6 xs:gap-4 border-t border-brand-200/60 pt-8 text-left"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-brand-700 font-semibold text-sm">
                  <ShieldCheck className="h-4 w-4 text-brand-500 shrink-0" />
                  {t("badgeSterile")}
                </div>
                <span className="text-[11px] text-brand-600">{t("badgeSterileDesc")}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-brand-700 font-semibold text-sm">
                  <Heart className="h-4 w-4 text-brand-500 shrink-0" />
                  {t("badgeWithLove")}
                </div>
                <span className="text-[11px] text-brand-600">{t("badgeWithLoveDesc")}</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-brand-700 font-semibold text-sm">
                  <Star className="h-4 w-4 text-brand-500 shrink-0" />
                  {t("badgeRating")}
                </div>
                <span className="text-[11px] text-brand-600">{t("badgeRatingDesc")}</span>
              </div>
            </motion.div>
          </div>

          {/* Visual Showcase (Big image) */}
          <div className="mt-16 sm:mt-24 lg:mt-0 lg:col-span-5 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative aspect-4/3 w-full max-w-md overflow-hidden rounded-2xl border-4 border-white bg-brand-100 shadow-2xl"
            >
              <img
                src="/src/assets/images/manicure_nude_chic_1782970221462.jpg"
                alt="Premium Manicure Velvet"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950/40 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-brand-900 uppercase tracking-wider">{t("todayOpenSlots")}</span>
                </div>
                <p className="text-[11px] text-brand-700 mt-1">{t("todayOpenSlotsDesc")}</p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
