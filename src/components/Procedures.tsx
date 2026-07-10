import React from "react";
import { Procedure } from "../types";
import { Clock, Tag, ArrowUpRight, Info, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../lib/LanguageContext";

interface ProceduresProps {
  procedures: Procedure[];
  onSelectProcedure: (procedureName: string) => void;
}

export default function Procedures({ procedures, onSelectProcedure }: ProceduresProps) {
  const { t, formatPrice } = useLanguage();
  console.log("🧩 Процедуры в публичном компоненте:", procedures);

  // The translation string ships with a leading "💡" for older layouts that just
  // dropped it inline. The new notice card below renders its own icon badge, so
  // we strip it here rather than showing the emoji twice.
  const complexNotice = t("servicesComplexNotice").replace(/^\p{Emoji}\s*/u, "");

  return (
    <section id="procedures" className="bg-brand-50/50 py-16 sm:py-24 border-y border-brand-200/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Section Heading */}
        <div className="text-center">
          <h2 className="font-serif text-3xl font-light tracking-tight text-brand-950 sm:text-4xl">
            {t("servicesTitle1")} <span className="font-serif italic text-brand-500 font-normal">{t("servicesTitle2")}</span>
          </h2>
          <div className="mx-auto mt-3 h-px w-16 bg-brand-300" />
          <p className="mx-auto mt-4 max-w-2xl text-sm text-brand-700 leading-relaxed">
            {t("servicesDesc")}
          </p>
        </div>

        {/* Procedures Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {procedures.filter(proc => !proc.isHidden).map((procedure, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              key={procedure.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-brand-200/50 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-950/5"
            >
              {/* Signature accent stripe — thickens on hover, like a nail polish swatch */}
              <span className="absolute inset-x-0 top-0 h-1 bg-brand-300 transition-all duration-300 group-hover:h-1.5 group-hover:bg-brand-500" />

              <div>
                {/* Name */}
                <h3 className="font-serif text-xl font-medium text-brand-950 leading-snug pr-2">
                  {t(procedure, "name")}
                </h3>

                {/* Meta row: price is the number people scan for first, so it gets the strongest chip */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-950 px-3 py-1 text-xs font-bold text-white">
                    <Tag className="h-3.5 w-3.5 text-brand-200" />
                    {formatPrice(procedure.price)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/80 px-3 py-1 text-xs font-medium text-brand-600">
                    <Clock className="h-3.5 w-3.5 text-brand-400" />
                    {procedure.durationMinutes} {t("bookingMinutes")}
                  </span>
                </div>

                {/* Description */}
                <p className="mt-4 text-xs text-brand-700 leading-relaxed">
                  {t(procedure, "description")}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-brand-100 pt-4">
                <span className="inline-flex items-center gap-1 text-[10px] text-brand-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                  {t("servicesSterileNotice")}
                </span>
                <button
                  onClick={() => onSelectProcedure(procedure.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-bold text-brand-800 transition-colors hover:bg-brand-950 hover:text-white"
                >
                  <span>{t("servicesSelect")}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Notices */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2 max-w-3xl mx-auto">
          <div className="flex items-start gap-3 rounded-xl border border-brand-200/40 bg-white p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100">
              <Info className="h-4 w-4 text-brand-600" />
            </div>
            <p className="text-xs text-brand-700 leading-relaxed">
              {complexNotice}
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50/40 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              {t({
                en: "All shown prices are preliminary estimates (calculated at ~400 HUF = 1 EUR). The final price may be adjusted during your appointment depending on custom additions, specialized design, or additional materials required for your specific service.",
                ru: "Все указанные цены являются предварительными и ориентировочными (расчет по курсу ~400 Ft = 1 €). Окончательная стоимость может быть скорректирована во время сеанса в зависимости от сложности, дизайна или дополнительных материалов.",
                hu: "Minden feltüntetett ár előzetes kalkuláció (~400 Ft = 1 € árfolyamon számolva). A végleges ár a kezelés során módosulhat a plusz szolgáltatások, egyedi dizájn vagy felhasznált anyagok függvényében."
              })}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
