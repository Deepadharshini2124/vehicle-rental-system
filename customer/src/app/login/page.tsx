"use client";

import {
  useState,
  useRef,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  CarFront,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  LoaderCircle,
  CircleAlert,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

import { customerLogin } from "@/lib/api";
import { getSafeRedirect } from "@/lib/authRedirect";

// ==========================================
// CONSTANTS
// ==========================================

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 text-sm text-slate-900 outline-none transition focus:border-[#155E75] focus:ring-2 focus:ring-[#155E75]/10 disabled:cursor-not-allowed disabled:bg-slate-50";

const labelClass =
  "mb-2 block text-sm font-semibold text-slate-700";

// ==========================================
// CUSTOMER LOGIN PAGE
// ==========================================

export default function CustomerLoginPage() {
  const router = useRouter();

  // ==========================================
  // STATE
  // ==========================================

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // Prevent duplicate login requests.

  const loginLock = useRef(false);

  // ==========================================
  // CUSTOMER LOGIN
  // ==========================================

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loginLock.current || loading) {
      return;
    }

    setError("");

    const trimmedEmail = email.trim();

    // ========================================
    // FORM VALIDATION
    // ========================================

    if (!trimmedEmail || !password) {
      setError(
        "Please enter your email and password."
      );

      return;
    }

    if (trimmedEmail.length > 150) {
      setError(
        "Email address is too long."
      );

      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      setError(
        "Please enter a valid email address."
      );

      return;
    }

    // ========================================
    // PRESERVE REQUESTED DESTINATION
    // ========================================

    const query = new URLSearchParams(
      window.location.search
    );

    const destination = getSafeRedirect(
      query.get("next")
    );

    // ========================================
    // AUTHENTICATE CUSTOMER
    // ========================================

    loginLock.current = true;

    setLoading(true);

    let loginSuccessful = false;

    try {
      await customerLogin(
        trimmedEmail,
        password
      );

      // ======================================
      // REDIRECT AFTER SUCCESSFUL LOGIN
      // ======================================

      // Complete booking query parameters
      // are preserved by getSafeRedirect().
      //
      // vehicleId
      // locationId
      // startDate
      // endDate

      router.replace(destination);

      loginSuccessful = true;

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to login. Please try again."
      );

    } finally {
      // Keep the form locked during successful
      // navigation to prevent another login.

      if (!loginSuccessful) {
        loginLock.current = false;

        setLoading(false);
      }
    }
  }

  // ==========================================
  // LOGIN PAGE UI
  // ==========================================

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">

      <div className="w-full max-w-md">

        {/* Back to Home */}

        <Link
          href="/home"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-[#155E75]"
        >
          <ArrowLeft size={17} />

          Back to Home
        </Link>

        {/* Login Card */}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">

          {/* ==================================
              LOGIN HEADER
          ================================== */}

          <div className="mb-8 text-center">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#155E75] text-white shadow-lg shadow-cyan-900/10">
              <CarFront
                size={32}
                strokeWidth={1.8}
              />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#102A36]">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Login to your vehicle rental account
            </p>

          </div>

          {/* ==================================
              ERROR MESSAGE
          ================================== */}

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-600"
            >
              <CircleAlert
                size={18}
                className="mt-0.5 shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {/* ==================================
              LOGIN FORM
          ================================== */}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Email Address */}

            <div>
              <label
                htmlFor="email"
                className={labelClass}
              >
                Email Address
              </label>

              <div className="relative">

                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(
                      event.target.value
                    );

                    setError("");
                  }}
                  placeholder="Enter your email"
                  autoComplete="email"
                  maxLength={150}
                  required
                  disabled={loading}
                  className={`${inputClass} pr-4`}
                />

              </div>
            </div>

            {/* Password */}

            <div>
              <label
                htmlFor="password"
                className={labelClass}
              >
                Password
              </label>

              <div className="relative">

                <LockKeyhole
                  size={18}
                  className="pointer-events-none absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) => {
                    setPassword(
                      event.target.value
                    );

                    setError("");
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className={`${inputClass} pr-12`}
                />

                {/* Show / Hide Password */}

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  aria-pressed={showPassword}
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  disabled={loading}
                  className="absolute right-4 top-3.5 text-slate-500 transition hover:text-[#155E75] disabled:cursor-not-allowed"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

              {/* Forgot Password */}

              <div className="mt-3 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-[#155E75] transition hover:text-[#102A36] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>

            </div>

            {/* ==================================
                LOGIN BUTTON
            ================================== */}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#155E75] py-3.5 text-sm font-semibold text-white transition hover:bg-[#164E63] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              )}

              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>

          {/* ==================================
              REGISTRATION LINK
          ================================== */}

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}

            <Link
              href="/register"
              className="font-semibold text-[#155E75] hover:underline"
            >
              Register
            </Link>
          </p>

          {/* Security Information */}

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-100 pt-5">
            <ShieldCheck
              size={16}
              className="shrink-0 text-[#155E75]"
            />

            <p className="text-xs text-slate-500">
              Login to manage your rental bookings
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}