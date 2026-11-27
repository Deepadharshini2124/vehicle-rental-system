
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ArrowLeft,
  CarFront,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
  LoaderCircle,
  CircleAlert,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
} from "lucide-react";

import {
  getPublicSettings,
  getCustomerToken,
  type PublicSettings,
} from "@/lib/api";

export default function TermsAndConditionsPage() {
  const [settings, setSettings] =
    useState<PublicSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [backHref, setBackHref] = useState("/login");

  useEffect(() => {
    const controller = new AbortController();

    setBackHref(getCustomerToken() ? "/home" : "/login");
    setLoading(true);
    setError("");

    async function loadSettings() {
      try {
        const { settings } = await getPublicSettings(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setSettings(settings);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSettings(null);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Terms & Conditions"
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => controller.abort();
  }, [reloadKey]);

  const businessName =
    settings?.businessName || "Vehicle Rental System";

  const policies = settings
    ? [
        {
          label: "Minimum Rental",
          value: `${settings.minRentalDays} ${
            settings.minRentalDays === 1 ? "Day" : "Days"
          }`,
          icon: CalendarDays,
        },
        {
          label: "Maximum Rental",
          value: `${settings.maxRentalDays} ${
            settings.maxRentalDays === 1 ? "Day" : "Days"
          }`,
          icon: CalendarDays,
        },
        {
          label: "Cancellation Policy",
          value: settings.allowCancellation
            ? "Pending Bookings Only"
            : "Cancellation Disabled",
          icon: ShieldCheck,
        },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">

          <Link
            href={backHref}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <CarFront size={25} />
            </div>

            <div className="min-w-0">
              <p
                title={businessName}
                className="truncate font-bold"
              >
                {businessName}
              </p>

              <p className="text-xs text-slate-500">
                Cars & Bikes
              </p>
            </div>
          </Link>

          <Link
            href={backHref}
            className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft size={17} />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">

        {/* Page Heading */}

        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <ClipboardList size={30} />
          </div>

          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
            Terms & Conditions
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Please review our rental policies and conditions
            before submitting your booking request.
          </p>
        </div>

        {/* Loading */}

        {loading && (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
            <LoaderCircle
              size={32}
              className="animate-spin text-blue-600"
            />

            <p className="text-sm text-slate-500">
              Loading Terms & Conditions...
            </p>
          </div>
        )}

        {/* Error */}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-100 bg-white p-8 text-center"
          >
            <CircleAlert
              size={40}
              className="mx-auto text-red-500"
            />

            <h2 className="mt-4 text-lg font-bold">
              Unable to Load Terms
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setReloadKey(prev => prev + 1)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && settings && (
          <div className="space-y-6">

            {/* Rental Policy */}

            <section className="grid gap-4 sm:grid-cols-3">
              {policies.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon size={22} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      {label}
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            {/* Dynamic Terms & Conditions */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-bold">
                Rental Terms & Conditions
              </h2>

              <p className="mt-2 break-words text-sm text-slate-500">
                {businessName}
              </p>

              <div className="my-6 border-t border-slate-100" />

              {settings.termsAndConditions?.trim() ? (
                <div className="whitespace-pre-wrap break-words text-sm leading-8 text-slate-700">
                  {settings.termsAndConditions}
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-700">
                  Terms & Conditions have not been configured.
                  Please contact the rental provider for more
                  information before booking.
                </div>
              )}
            </section>

            {/* Booking Information */}

            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
              <h2 className="flex items-center gap-2 font-bold text-blue-900">
                <ShieldCheck size={22} />
                Important Booking Information
              </h2>

              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-blue-800">
                <li>
                  All booking requests are subject to admin approval.
                </li>

                <li>
                  Rental dates must satisfy the current rental policy.
                </li>

                <li>
                  {settings.allowCancellation
                    ? "Only pending bookings can be cancelled by customers."
                    : "Customer cancellation is currently disabled. Contact the rental provider for assistance."}
                </li>

                <li>
                  No online payment is required.
                </li>
              </ul>
            </section>

            {/* Contact Details */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold">
                Need Clarification?
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Contact {businessName} for rental assistance.
              </p>

              <div className="mt-5 space-y-4 text-sm">

                {settings.businessPhone && (
                  <a
                    href={`tel:${settings.businessPhone}`}
                    className="flex items-center gap-3 text-slate-600 hover:text-blue-600"
                  >
                    <Phone
                      size={18}
                      className="shrink-0 text-blue-600"
                    />

                    {settings.businessPhone}
                  </a>
                )}

                {settings.businessEmail && (
                  <a
                    href={`mailto:${settings.businessEmail}`}
                    className="flex items-center gap-3 text-slate-600 hover:text-blue-600"
                  >
                    <Mail
                      size={18}
                      className="shrink-0 text-blue-600"
                    />

                    <span className="break-all">
                      {settings.businessEmail}
                    </span>
                  </a>
                )}

                {settings.businessAddress && (
                  <div className="flex items-start gap-3 text-slate-600">
                    <MapPin
                      size={18}
                      className="mt-1 shrink-0 text-blue-600"
                    />

                    <p className="whitespace-pre-line break-words">
                      {settings.businessAddress}
                    </p>
                  </div>
                )}

                {!settings.businessPhone &&
                  !settings.businessEmail &&
                  !settings.businessAddress && (
                    <p className="text-slate-500">
                      Contact details have not been configured.
                    </p>
                  )}
              </div>
            </section>

            <div className="text-center">
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <ArrowLeft size={17} />
                {backHref === "/home" ? "Back to Home" : "Back to Login"}
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}

      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
        © {businessName}. All rights reserved.
      </footer>
    </div>
  );
}
