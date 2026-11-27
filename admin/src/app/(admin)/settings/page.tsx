
"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  Settings as SettingsIcon,
  Building2,
  CalendarDays,
  FileText,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import {
  getAdminToken,
  getSettings,
  updateSettings,
} from "@/lib/api";

import type {
  Settings,
  UpdateSettingsPayload,
} from "@/lib/api";

type SettingsForm = {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  minRentalDays: string;
  maxRentalDays: string;
  allowCancellation: boolean;
  termsAndConditions: string;
};

const initialForm: SettingsForm = {
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  businessAddress: "",
  minRentalDays: "1",
  maxRentalDays: "366",
  allowCancellation: true,
  termsAndConditions: "",
};

function toForm(settings: Settings): SettingsForm {
  return {
    businessName: settings.businessName,
    businessEmail: settings.businessEmail ?? "",
    businessPhone: settings.businessPhone ?? "",
    businessAddress: settings.businessAddress ?? "",
    minRentalDays: String(settings.minRentalDays),
    maxRentalDays: String(settings.maxRentalDays),
    allowCancellation: settings.allowCancellation,
    termsAndConditions: settings.termsAndConditions ?? "",
  };
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100";

const labelClass =
  "mb-2 block text-sm font-medium text-gray-700";

export default function SettingsPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<SettingsForm>(initialForm);

  const [original, setOriginal] =
    useState<SettingsForm>(initialForm);

  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasChanges =
    JSON.stringify(form) !== JSON.stringify(original);

  // ========================================
  // LOAD SETTINGS
  // ========================================

  async function loadSettings() {
    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setLoaded(false);
    setError("");
    setSuccess("");

    try {
      const response = await getSettings();

      const values = toForm(response.settings);

      setForm(values);
      setOriginal(values);
      setLoaded(true);
    } catch (err) {
      if (!getAdminToken()) {
        router.replace("/login");
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load settings"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========================================
  // HANDLE INPUT CHANGES
  // ========================================

  function handleChange<K extends keyof SettingsForm>(
    field: K,
    value: SettingsForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSuccess("");
    setError("");
  }

  // ========================================
  // RESET FORM
  // ========================================

  function handleReset() {
    setForm({ ...original });
    setError("");
    setSuccess("");
  }

  // ========================================
  // SAVE SETTINGS
  // ========================================

  async function handleSave(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!loaded || saving || !hasChanges) {
      return;
    }

    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    setError("");
    setSuccess("");

    const minDays = Number(form.minRentalDays);
    const maxDays = Number(form.maxRentalDays);

    if (!form.businessName.trim()) {
      setError("Business name is required.");
      return;
    }

    if (
      !Number.isInteger(minDays) ||
      !Number.isInteger(maxDays) ||
      minDays < 1 ||
      maxDays > 366 ||
      minDays > maxDays
    ) {
      setError(
        "Enter a valid rental duration between 1 and 366 days."
      );
      return;
    }

    const payload: UpdateSettingsPayload = {
      businessName: form.businessName.trim(),

      businessEmail:
        form.businessEmail.trim() || null,

      businessPhone:
        form.businessPhone.trim() || null,

      businessAddress:
        form.businessAddress.trim() || null,

      minRentalDays: minDays,

      maxRentalDays: maxDays,

      allowCancellation:
        form.allowCancellation,

      termsAndConditions:
        form.termsAndConditions.trim() || null,
    };

    setSaving(true);

    try {
      const response = await updateSettings(payload);

      const updatedForm = toForm(response.settings);

      setForm(updatedForm);
      setOriginal(updatedForm);

      setSuccess("Settings saved successfully.");
    } catch (err) {
      if (!getAdminToken()) {
        router.replace("/login");
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  }

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">

      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <SettingsIcon size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Settings
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your business details and rental preferences.
            </p>
          </div>

        </div>

        <button
          type="button"
          disabled={loading || saving}
          onClick={() => {
            if (
              hasChanges &&
              !window.confirm(
                "Discard unsaved changes and refresh?"
              )
            ) {
              return;
            }

            void loadSettings();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />

          Refresh
        </button>

      </div>

      {/* SUCCESS MESSAGE */}

      {success && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          <CheckCircle2 size={20} className="shrink-0" />

          {success}
        </div>
      )}

      {/* ERROR MESSAGE */}

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={20} className="shrink-0" />

          {error}
        </div>
      )}

      {/* LOADING STATE */}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">

          <div className="flex items-center gap-3 text-sm text-gray-500">

            <Loader2
              size={22}
              className="animate-spin text-blue-600"
            />

            Loading settings...

          </div>

        </div>
      ) : !loaded ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">

          <p className="text-sm text-gray-500">
            Unable to load settings.
          </p>

          <button
            type="button"
            onClick={() => void loadSettings()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Try Again
          </button>

        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="space-y-6"
        >

          <fieldset
            disabled={saving}
            className="space-y-6"
          >

            {/* BUSINESS INFORMATION */}

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

              <div className="flex items-center gap-3 border-b border-gray-100 p-5">

                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                  <Building2 size={21} />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    Business Information
                  </h2>

                  <p className="text-sm text-gray-500">
                    Manage your company and contact details.
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">

                <div className="md:col-span-2">

                  <label
                    htmlFor="businessName"
                    className={labelClass}
                  >
                    Business Name
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="businessName"
                    type="text"
                    required
                    maxLength={150}
                    value={form.businessName}
                    onChange={(e) =>
                      handleChange(
                        "businessName",
                        e.target.value
                      )
                    }
                    placeholder="Enter business name"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label
                    htmlFor="businessEmail"
                    className={labelClass}
                  >
                    Business Email
                  </label>

                  <input
                    id="businessEmail"
                    type="email"
                    maxLength={150}
                    value={form.businessEmail}
                    onChange={(e) =>
                      handleChange(
                        "businessEmail",
                        e.target.value
                      )
                    }
                    placeholder="business@example.com"
                    className={inputClass}
                  />

                </div>

                <div>

                  <label
                    htmlFor="businessPhone"
                    className={labelClass}
                  >
                    Business Phone
                  </label>

                  <input
                    id="businessPhone"
                    type="tel"
                    maxLength={16}
                    value={form.businessPhone}
                    onChange={(e) =>
                      handleChange(
                        "businessPhone",
                        e.target.value
                      )
                    }
                    placeholder="+919876543210"
                    className={inputClass}
                  />

                </div>

                <div className="md:col-span-2">

                  <label
                    htmlFor="businessAddress"
                    className={labelClass}
                  >
                    Business Address
                  </label>

                  <textarea
                    id="businessAddress"
                    rows={3}
                    maxLength={2000}
                    value={form.businessAddress}
                    onChange={(e) =>
                      handleChange(
                        "businessAddress",
                        e.target.value
                      )
                    }
                    placeholder="Enter your business address"
                    className={`${inputClass} resize-y`}
                  />

                </div>

              </div>

            </section>

            {/* RENTAL SETTINGS */}

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

              <div className="flex items-center gap-3 border-b border-gray-100 p-5">

                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                  <CalendarDays size={21} />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    Rental Settings
                  </h2>

                  <p className="text-sm text-gray-500">
                    Configure rental duration and cancellation preferences.
                  </p>
                </div>

              </div>

              <div className="space-y-5 p-5">

                <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  Rental preferences can be saved now.
                  Enforcement in customer bookings is pending.
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <div>

                    <label
                      htmlFor="minRentalDays"
                      className={labelClass}
                    >
                      Minimum Rental Days
                    </label>

                    <input
                      id="minRentalDays"
                      type="number"
                      min={1}
                      max={366}
                      step={1}
                      required
                      value={form.minRentalDays}
                      onChange={(e) =>
                        handleChange(
                          "minRentalDays",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <p className="mt-2 text-xs text-gray-500">
                      Minimum duration for a new rental.
                    </p>

                  </div>

                  <div>

                    <label
                      htmlFor="maxRentalDays"
                      className={labelClass}
                    >
                      Maximum Rental Days
                    </label>

                    <input
                      id="maxRentalDays"
                      type="number"
                      min={1}
                      max={366}
                      step={1}
                      required
                      value={form.maxRentalDays}
                      onChange={(e) =>
                        handleChange(
                          "maxRentalDays",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <p className="mt-2 text-xs text-gray-500">
                      Maximum duration for a new rental.
                    </p>

                  </div>

                </div>

                {/* CANCELLATION TOGGLE */}

                <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">

                  <div>
                    <h3
                      id="cancellation-label"
                      className="text-sm font-semibold text-gray-900"
                    >
                      Allow Booking Cancellation
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Allow customers to cancel pending bookings
                      once this policy is integrated.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-labelledby="cancellation-label"
                    aria-checked={form.allowCancellation}
                    onClick={() =>
                      handleChange(
                        "allowCancellation",
                        !form.allowCancellation
                      )
                    }
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      form.allowCancellation
                        ? "bg-blue-600"
                        : "bg-gray-300"
                    }`}
                  >

                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        form.allowCancellation
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />

                  </button>

                </div>

              </div>

            </section>

            {/* TERMS AND CONDITIONS */}

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

              <div className="flex items-center gap-3 border-b border-gray-100 p-5">

                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                  <FileText size={21} />
                </div>

                <div>
                  <h2 className="font-semibold text-gray-900">
                    Terms & Conditions
                  </h2>

                  <p className="text-sm text-gray-500">
                    Manage your vehicle rental terms.
                  </p>
                </div>

              </div>

              <div className="p-5">

                <label
                  htmlFor="termsAndConditions"
                  className={labelClass}
                >
                  Rental Terms & Conditions
                </label>

                <textarea
                  id="termsAndConditions"
                  rows={8}
                  maxLength={10000}
                  value={form.termsAndConditions}
                  onChange={(e) =>
                    handleChange(
                      "termsAndConditions",
                      e.target.value
                    )
                  }
                  placeholder="Enter rental rules, customer responsibilities, vehicle return conditions and other terms..."
                  className={`${inputClass} resize-y`}
                />

                <div className="mt-2 flex justify-between gap-3 text-xs text-gray-500">

                  <span>
                    Customer panel integration pending.
                  </span>

                  <span>
                    {form.termsAndConditions.length}/10000
                  </span>

                </div>

              </div>

            </section>

          </fieldset>

          {/* SAVE ACTIONS */}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

            <div>

              <p className="text-sm font-medium text-gray-700">
                {hasChanges
                  ? "You have unsaved changes"
                  : "All settings are up to date"}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Save changes to update your business settings.
              </p>

            </div>

            <div className="flex items-center gap-3">

              <button
                type="button"
                disabled={saving || !hasChanges}
                onClick={handleReset}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>

              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >

                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={17} />
                )}

                {saving
                  ? "Saving..."
                  : "Save Changes"}

              </button>

            </div>

          </div>

        </form>
      )}

    </div>
  );
}
