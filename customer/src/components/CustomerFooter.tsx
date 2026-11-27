
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CarFront,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  ArrowUp,
  ShieldCheck,
  CalendarDays,
  Clock3,
  Headphones,
} from "lucide-react";

import {
  getPublicSettings,
  type PublicSettings,
} from "@/lib/api";

// ==========================================
// QUICK LINKS
// ==========================================

const quickLinks = [
  { name: "Home", href: "/home" },
  { name: "Explore Vehicles", href: "/vehicles" },
  { name: "My Bookings", href: "/my-bookings" },
  { name: "My Profile", href: "/profile" },
];

// ==========================================
// CUSTOMER FOOTER
// ==========================================

export default function CustomerFooter() {
  const pathname = usePathname();

  const [settings, setSettings] =
    useState<PublicSettings | null>(null);

  // ==========================================
  // LOAD BUSINESS SETTINGS
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    getPublicSettings(controller.signal)
      .then(({ settings }) => {
        if (!controller.signal.aborted) {
          setSettings(settings);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSettings(null);
        }
      });

    return () => controller.abort();
  }, [pathname]);

  const businessName =
    settings?.businessName || "Vehicle Rental";

  // ==========================================
  // BACK TO TOP
  // ==========================================

  function scrollToTop() {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  // ==========================================
  // FOOTER UI
  // ==========================================

  return (
    <footer className="border-t border-white/10 bg-[#102A36] text-slate-300">

      {/* ======================================
          MAIN FOOTER
      ====================================== */}

      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-16">

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1fr_1.1fr] lg:gap-8">

          {/* ==================================
              BUSINESS INFORMATION
          ================================== */}

          <div className="min-w-0">

            <Link
              href="/home"
              className="inline-flex items-center gap-3"
            >

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#155E75] text-[#67E8F9]">

                <CarFront size={29} strokeWidth={1.8} />

              </div>

              <div className="min-w-0">

                <h2 className="break-words text-lg font-bold leading-tight text-white">
                  {businessName}
                </h2>

                <p className="mt-1 text-xs font-semibold tracking-wide text-[#22D3EE]">
                  Cars & Bikes
                </p>

              </div>

            </Link>

            <p className="mt-5 text-sm leading-7 text-slate-400">

              Your journey starts here. Discover the
              freedom of self-drive car and bike rentals.
              Choose your ride and make every kilometre
              count.

            </p>

            {/* Business Highlights */}

            <div className="mt-6 space-y-3">

              <div className="flex items-center gap-2.5 text-xs text-slate-300">

                <ShieldCheck
                  size={17}
                  className="shrink-0 text-[#22D3EE]"
                />

                Simple booking process

              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-300">

                <Clock3
                  size={17}
                  className="shrink-0 text-[#22D3EE]"
                />

                Flexible rental duration

              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-300">

                <Headphones
                  size={17}
                  className="shrink-0 text-[#22D3EE]"
                />

                Customer assistance

              </div>

            </div>

          </div>

          {/* ==================================
              QUICK LINKS
          ================================== */}

          <div>

            <h3 className="text-base font-bold text-white">
              Quick Links
            </h3>

            <div className="mb-6 mt-3 h-0.5 w-8 rounded-full bg-[#22D3EE]" />

            <nav
              aria-label="Footer navigation"
              className="space-y-4"
            >

              {quickLinks.map(({ name, href }) => (

                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-[#22D3EE]"
                >

                  <ChevronRight
                    size={15}
                    className="shrink-0 text-[#22D3EE] transition-transform group-hover:translate-x-1"
                  />

                  {name}

                </Link>

              ))}

            </nav>

          </div>

          {/* ==================================
              RENTAL INFORMATION
          ================================== */}

          <div>

            <h3 className="text-base font-bold text-white">
              Rental Information
            </h3>

            <div className="mb-6 mt-3 h-0.5 w-8 rounded-full bg-[#22D3EE]" />

            <div className="space-y-4 text-sm text-slate-400">

              {settings ? (

                <>

                  {/* Minimum Rental */}

                  <div className="flex items-start gap-3">

                    <CalendarDays
                      size={17}
                      className="mt-0.5 shrink-0 text-[#22D3EE]"
                    />

                    <div>

                      <p className="text-xs text-slate-400">
                        Minimum Rental
                      </p>

                      <p className="mt-1 font-medium text-slate-200">
                        {settings.minRentalDays}{" "}
                        {settings.minRentalDays === 1
                          ? "Day"
                          : "Days"}
                      </p>

                    </div>

                  </div>

                  {/* Maximum Rental */}

                  <div className="flex items-start gap-3">

                    <CalendarDays
                      size={17}
                      className="mt-0.5 shrink-0 text-[#22D3EE]"
                    />

                    <div>

                      <p className="text-xs text-slate-400">
                        Maximum Rental
                      </p>

                      <p className="mt-1 font-medium text-slate-200">
                        {settings.maxRentalDays}{" "}
                        {settings.maxRentalDays === 1
                          ? "Day"
                          : "Days"}
                      </p>

                    </div>

                  </div>

                  {/* Cancellation Policy */}

                  <div className="flex items-start gap-3">

                    <ShieldCheck
                      size={17}
                      className="mt-0.5 shrink-0 text-[#22D3EE]"
                    />

                    <div>

                      <p className="text-xs text-slate-400">
                        Cancellation Policy
                      </p>

                      <p className="mt-1 font-medium leading-relaxed text-slate-200">

                        {settings.allowCancellation
                          ? "Pending bookings only"
                          : "Contact rental provider"}

                      </p>

                    </div>

                  </div>

                </>

              ) : (

                <p className="text-xs leading-relaxed text-slate-400">
                  Rental policies are temporarily unavailable.
                </p>

              )}

              {/* Payment Information */}

              <p className="text-xs leading-relaxed text-slate-400">
                No online payment required.
              </p>

              <Link
                href="/terms-and-conditions"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#22D3EE] transition hover:text-cyan-200"
              >

                Terms & Conditions

                <ChevronRight size={15} />

              </Link>

            </div>

          </div>

          {/* ==================================
              CONTACT DETAILS
          ================================== */}

          <div className="min-w-0">

            <h3 className="text-base font-bold text-white">
              Contact Us
            </h3>

            <div className="mb-6 mt-3 h-0.5 w-8 rounded-full bg-[#22D3EE]" />

            <div className="space-y-5 text-sm">

              {/* Business Phone */}

              {settings?.businessPhone && (

                <a
                  href={`tel:${settings.businessPhone}`}
                  className="group flex items-start gap-3"
                >

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#22D3EE] transition group-hover:bg-[#155E75]">

                    <Phone size={18} />

                  </div>

                  <div className="min-w-0">

                    <p className="text-xs text-slate-400">
                      Call Us
                    </p>

                    <p className="mt-1 break-words font-medium text-slate-200 transition group-hover:text-[#22D3EE]">
                      {settings.businessPhone}
                    </p>

                  </div>

                </a>

              )}

              {/* Business Email */}

              {settings?.businessEmail && (

                <a
                  href={`mailto:${settings.businessEmail}`}
                  className="group flex items-start gap-3"
                >

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#22D3EE] transition group-hover:bg-[#155E75]">

                    <Mail size={18} />

                  </div>

                  <div className="min-w-0">

                    <p className="text-xs text-slate-400">
                      Email Us
                    </p>

                    <p className="mt-1 break-all font-medium text-slate-200 transition group-hover:text-[#22D3EE]">
                      {settings.businessEmail}
                    </p>

                  </div>

                </a>

              )}

              {/* Business Address */}

              {settings?.businessAddress && (

                <div className="flex items-start gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#22D3EE]">

                    <MapPin size={19} />

                  </div>

                  <div className="min-w-0">

                    <p className="text-xs text-slate-400">
                      Office Address
                    </p>

                    <p className="mt-1 whitespace-pre-line break-words leading-relaxed text-slate-200">
                      {settings.businessAddress}
                    </p>

                  </div>

                </div>

              )}

              {/* Settings Error */}

              {!settings && (

                <p className="text-sm leading-relaxed text-slate-400">
                  Contact details are temporarily unavailable.
                </p>

              )}

              {/* Empty Contact Details */}

              {settings &&
                !settings.businessPhone &&
                !settings.businessEmail &&
                !settings.businessAddress && (

                  <p className="text-sm leading-relaxed text-slate-400">
                    Contact details have not been configured.
                  </p>

                )}

            </div>

          </div>

        </div>

      </div>

      {/* ======================================
          BOTTOM FOOTER
      ====================================== */}

      <div className="border-t border-white/10 bg-black/10">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 py-5 text-center sm:px-8 md:flex-row md:text-left lg:px-10">

          {/* Copyright */}

          <p className="text-xs leading-relaxed text-slate-400">

            &copy; {businessName}. All rights reserved.

          </p>

          <div className="flex flex-wrap items-center justify-center gap-5">

            <Link
              href="/terms-and-conditions"
              className="text-xs text-slate-400 transition hover:text-[#22D3EE]"
            >
              Terms & Conditions
            </Link>

            {/* Back to Top Button */}

            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              title="Back to top"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-[#22D3EE] transition hover:border-[#22D3EE] hover:bg-[#155E75] focus-visible:outline-cyan-300"
            >

              <ArrowUp size={19} />

            </button>

          </div>

        </div>

      </div>

    </footer>
  );
}
