import React from "react";
import { Procedure } from "../types";
import { Clock, Tag, PlusCircle } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../lib/LanguageContext";

interface ProceduresProps {
  procedures: Procedure[];
  onSelectProcedure: (procedureName: string) => void;
}

export default function Procedures({ procedures, onSelectProcedure }: ProceduresProps) {
  const { t, formatPrice } = useLanguage();

  return (
    <section id="procedures" className="bg-brand-50/50 py-16 sm:py-24 border-y border-brand-200/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center">
          <h2 className="font-serif text-3xl font-light tracking-tight text-brand-950 sm:text-4xl">
            {t("servicesTitle1")} <span className="font-serif italic text-brand-500 font-normal">{t("servicesTitle2")}</span>
          </h2>
          <div className="mx-auto mt-2 h-0.5 w-16 bg-brand-300" />
          <p className="mx-auto mt-4 max-w-2xl text-sm text-brand-700">
            {t("servicesDesc")}
          </p>
        </div>

        {/* Procedures Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {procedures.map((procedure, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              key={procedure.id}
              className="flex flex-col justify-between rounded-2xl border border-brand-200/50 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-serif text-lg font-medium text-brand-950 leading-snug">
                    {t(procedure, "name")}
                  </h3>
                </div>

                {/* Sub info */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-brand-600">
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock className="h-3.5 w-3.5 text-brand-400" />
                    {procedure.durationMinutes} {t("bookingMinutes")}
                  </span>
                  <span className="flex items-center gap-1 shrink-0 bg-brand-50/80 border border-brand-100/60 px-2 py-0.5 rounded text-brand-700 font-mono text-[11px] font-semibold">
                    {formatPrice(procedure.price)}
                  </span>
                </div>

                {/* Description */}
                <p className="mt-4 text-xs text-brand-700 leading-relaxed">
                  {t(procedure, "description")}
                </p>
              </div>

              {/* Booking CTA for this exact service */}
              <div className="mt-6 border-t border-brand-100 pt-4 flex items-center justify-between">
                <span className="text-[10px] text-brand-500">{t("servicesSterileNotice")}</span>
                <button
                  onClick={() => onSelectProcedure(procedure.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold text-brand-800 hover:bg-brand-500 hover:text-white transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>{t("servicesSelect")}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pricing Notice */}
        <div className="mt-12 space-y-3 max-w-xl mx-auto">
          <div className="rounded-xl bg-brand-100/40 p-4 border border-brand-200/40 text-center">
            <p className="text-xs text-brand-700 font-medium">
              {t("servicesComplexNotice")}
            </p>
          </div>
          
          <div className="rounded-xl bg-amber-50/40 p-4 border border-amber-200/30 text-center">
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              {t({
                en: "⚠️ Please note: All shown prices are preliminary estimates (calculated at ~400 HUF = 1 EUR). The final price may be adjusted during your appointment depending on custom additions, specialized design, or additional materials required for your specific service.",
                ru: "⚠️ Пожалуйста, обратите внимание: все указанные цены являются предварительными и ориентировочными (расчет по курсу ~400 Ft = 1 €). Окончательная стоимость может быть скорректирована во время сеанса в зависимости от сложности, дизайна или дополнительных материалов.",
                hu: "⚠️ Kérjük, vegye figyelembe: minden feltüntetett ár előzetes kalkuláció (~400 Ft = 1 € árfolyamon számolva). A végleges ár a kezelés során módosulhat a plusz szolgáltatások, egyedi dizájn vagy felhasznált anyagok függvényében."
              })}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
