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
className="group relative flex flex-col justify-between rounded-2xl border border-brand-200/50 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl hover:shadow-brand-950/5"
          >
            {/* Signature accent stripe — thickens on hover, like a nail polish swatch */}
            <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-brand-300 transition-all duration-300 group-hover:h-1.5 group-hover:bg-brand-500" />

              <div>
                {/* Name */}
                <h3 className="font-serif text-xl font-medium text-brand-950 leading-snug pr-2">
                  {t(procedure, "name")}
                </h3>

                {/* Meta row: price and time with interactive hover tooltips */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  
                  {/* Price Tag with Tooltip */}
                  <div className="group/tooltip relative flex items-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-950 pl-3 pr-2.5 py-1 text-xs font-bold text-white cursor-help shadow-sm">
                      <Tag className="h-3.5 w-3.5 text-brand-200" />
                      {formatPrice(procedure.price)}
                      <Info className="h-3 w-3 text-brand-400/80 ml-0.5" />
                    </span>
                    {/* Tooltip Content */}
                    <div className="absolute bottom-full left-1/2 mb-2 hidden w-56 -translate-x-1/2 rounded-xl bg-brand-950 p-3 text-[10px] font-normal leading-relaxed text-brand-100 shadow-xl group-hover/tooltip:block z-30 opacity-0 group-hover/tooltip:opacity-100 transition-opacity">
                      {t("servicesPriceDisclaimer")}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-brand-950" />
                    </div>
                  </div>

                  {/* Time Tag */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/80 px-3 py-1 text-xs font-medium text-brand-600">
                    <Clock className="h-3.5 w-3.5 text-brand-400" />
                    {procedure.durationMinutes} {t("bookingMinutes")}
                  </span>

                  {/* Complex Case Alert Tooltip */}
                  <div className="group/tooltip relative flex items-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 cursor-help transition-colors hover:bg-amber-100">
                      <AlertTriangle className="h-3 w-3" />
                    </span>
                    {/* Tooltip Content */}
                    <div className="absolute bottom-full left-1/2 mb-2 hidden w-48 -translate-x-1/2 rounded-xl bg-amber-950 p-3 text-[10px] font-normal leading-relaxed text-amber-50 shadow-xl group-hover/tooltip:block z-30 text-center opacity-0 group-hover/tooltip:opacity-100 transition-opacity">
                      {complexNotice}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-950" />
                    </div>
                  </div>

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

        </div>
    </section>
  );
}
