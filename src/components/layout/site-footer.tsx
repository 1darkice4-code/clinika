import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { CLINIC_CONTACTS } from "@/config/clinic";

export interface SiteFooterProps {
  phone?: string;
  email?: string;
  address?: string;
}

export function SiteFooter({
  phone = CLINIC_CONTACTS.phone,
  email = CLINIC_CONTACTS.email,
  address = CLINIC_CONTACTS.address
}: SiteFooterProps) {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-14 text-sm text-muted-foreground sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="inline-flex items-center gap-2 font-semibold text-foreground">
            <BrandMark />
            <span className="brand-word-tight text-xl">Сияние</span>
          </p>
          <p className="mt-3 max-w-xs leading-6">
            Небольшая клиника эстетической медицины в Чите. Консультации и процедуры по записи.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-foreground">
            Документы
          </p>
          <div className="mt-3 flex flex-col gap-1.5">
            <Link href="/legal/privacy-policy" className="transition hover:text-metal-strong">
              Политика конфиденциальности
            </Link>
            <Link
              href="/legal/personal-data-consent"
              className="transition hover:text-metal-strong"
            >
              Согласие на обработку данных
            </Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-foreground">
            Контакты
          </p>
          <p className="mt-3">{address}</p>
          <a href={`tel:${phone}`} className="mt-1.5 block transition hover:text-metal-strong">
            {phone}
          </a>
          <a href={`mailto:${email}`} className="mt-1.5 block transition hover:text-metal-strong">
            {email}
          </a>
        </div>
      </div>
    </footer>
  );
}
