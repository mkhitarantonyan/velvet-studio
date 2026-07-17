import React, { useState } from "react";
import { SalonContacts } from "../types";
import { Phone, Mail, MapPin, Clock, Copy, Check, Instagram } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface ContactsProps {
  contacts: SalonContacts | null;
}

export default function Contacts({ contacts }: ContactsProps) {
  const { language, t } = useLanguage();
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!contacts) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getLocalizedAddress = () => {
    if (language === "ru") return contacts.addressRu;
    if (language === "hu") return contacts.addressHu;
    return contacts.addressEn;
  };

  const getLocalizedHours = () => {
    if (language === "ru") return contacts.workingHoursRu;
    if (language === "hu") return contacts.workingHoursHu;
    return contacts.workingHoursEn;
  };

  return (
    <section id="contacts" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center">
          <h2 className="font-serif text-3xl font-light tracking-tight text-brand-950 sm:text-4xl">
            {t("contactsTitle1")} <span className="font-serif italic text-brand-500 font-normal">{t("contactsTitle2")}</span>
          </h2>
          <div className="mx-auto mt-2 h-0.5 w-16 bg-brand-300" />
          <p className="mx-auto mt-4 max-w-2xl text-sm text-brand-700">
            {t("contactsDesc")}
          </p>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-12 items-stretch">
          
          {/* Contacts Details Card */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-brand-200/50 bg-brand-50/40 p-6 sm:p-8">
            <div className="space-y-8">
              <h3 className="font-serif text-2xl font-light text-brand-950">
                {t("contactsCardTitle")}
              </h3>

              {/* Items List */}
              <div className="space-y-6">
                {/* Phones */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider">{t("contactsPhoneLabel")}</p>
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                      <a href={`tel:${contacts.phone1}`} className="text-sm font-semibold text-brand-900 hover:text-brand-500 transition-colors">
                        {contacts.phone1}
                      </a>
                      <button
                        onClick={() => handleCopy(contacts.phone1, "phone1")}
                        className="text-brand-400 hover:text-brand-600 p-1 self-start cursor-pointer"
                      >
                        {copiedText === "phone1" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {contacts.phone2 && (
                      <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
                        <a href={`tel:${contacts.phone2}`} className="text-sm text-brand-800 hover:text-brand-500 transition-colors">
                          {contacts.phone2}
                        </a>
                        <button
                          onClick={() => handleCopy(contacts.phone2, "phone2")}
                          className="text-brand-400 hover:text-brand-600 p-1 self-start cursor-pointer"
                        >
                          {copiedText === "phone2" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider">{t("contactsEmailLabel")}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <a href={`mailto:${contacts.email}`} className="text-sm font-semibold text-brand-900 hover:text-brand-500 transition-colors">
                        {contacts.email}
                      </a>
                      <button
                        onClick={() => handleCopy(contacts.email, "email")}
                        className="text-brand-400 hover:text-brand-600 p-1 cursor-pointer"
                      >
                        {copiedText === "email" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider">{t("contactsAddressLabel")}</p>
                    <p className="mt-1 text-sm font-medium text-brand-900 leading-relaxed">
                      {getLocalizedAddress()}
                    </p>
                    <span className="mt-1 inline-block text-[11px] text-brand-600">
                      {t("contactsAddressSub")}
                    </span>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider">{t("contactsWorkingHoursLabel")}</p>
                    <p className="mt-1 text-sm font-medium text-brand-900">
                      {getLocalizedHours()}
                    </p>
                    <p className="text-[11px] text-brand-600 mt-0.5">{t("contactsHoursSub")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alert info */}
            <div className="mt-8 border-t border-brand-200/50 pt-6">
              <span className="text-[10px] uppercase tracking-wider text-brand-600 font-bold block mb-1">
                {t("contactsImportantNoticeTitle")}
              </span>
              <p className="text-xs text-brand-700">
                {t("contactsImportantNoticeDesc")}
              </p>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="lg:col-span-7 rounded-3xl overflow-hidden border border-brand-200/50 bg-brand-50 shadow-sm relative h-[400px] lg:h-auto min-h-[350px]">
            <iframe
              src={contacts.mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 w-full h-full grayscale brightness-95 contrast-105"
              title={t("contactsMapTitle")}
            />
          </div>

        </div>
      </div>
    </section>
  );
}
