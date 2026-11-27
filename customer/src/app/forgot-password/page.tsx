
"use client";

import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  Mail,
  ShieldCheck,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowLeft,
  LoaderCircle,
  CircleAlert,
  CircleCheck,
  Check,
} from "lucide-react";

import {
  forgotCustomerPassword,
  verifyCustomerResetOTP,
  resetCustomerPassword,
} from "@/lib/api";

type Step = "email" | "otp" | "password" | "success";

const steps = [
  { id: "email", label: "Email" },
  { id: "otp", label: "Verify" },
  { id: "password", label: "Reset" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-blue-500 disabled:bg-slate-50";

const buttonClass =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [otp, setOTP] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [now, setNow] = useState(0);
  const [resendDeadline, setResendDeadline] = useState(0);
  const [otpDeadline, setOtpDeadline] = useState(0);
  const [resetDeadline, setResetDeadline] = useState(0);

  const requestLock = useRef(false);

  // ==========================================
  // COUNTDOWN TIMER
  // ==========================================

  useEffect(() => {
    if (step !== "otp" && step !== "password") {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  const resendSeconds = Math.max(
    0,
    Math.ceil((resendDeadline - now) / 1000)
  );

  const otpSeconds = Math.max(
    0,
    Math.ceil((otpDeadline - now) / 1000)
  );

  const resetSeconds = Math.max(
    0,
    Math.ceil((resetDeadline - now) / 1000)
  );

  const currentStep = steps.findIndex(
    (item) => item.id === step
  );

  // ==========================================
  // REQUEST OTP
  // ==========================================

  async function requestOTP(isResend = false) {
    if (requestLock.current) return;

    if (
      isResend &&
      Date.now() < resendDeadline
    ) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    setError("");
    setMessage("");

    if (!normalizedEmail) {
      setError("Please enter your email address");
      return;
    }

    requestLock.current = true;
    setLoading(true);

    try {
      const response =
        await forgotCustomerPassword(normalizedEmail);

      const currentTime = Date.now();

      setEmail(normalizedEmail);
      setOTP("");
      setResetToken("");
      setNow(currentTime);

      setOtpDeadline(
        currentTime + response.expiresIn * 1000
      );

      setResendDeadline(
        currentTime + response.resendAfter * 1000
      );

      setMessage(response.message);
      setStep("otp");

    } catch (err) {
      setError(getErrorMessage(err));

    } finally {
      requestLock.current = false;
      setLoading(false);
    }
  }

  function handleEmailSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    void requestOTP();
  }

  // ==========================================
  // VERIFY OTP
  // ==========================================

  async function handleVerifyOTP(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (requestLock.current) return;

    setError("");
    setMessage("");

    if (!/^[0-9]{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    if (Date.now() >= otpDeadline) {
      setError("OTP expired. Please request a new OTP.");
      return;
    }

    requestLock.current = true;
    setLoading(true);

    try {
      const response = await verifyCustomerResetOTP(
        email,
        otp
      );

      const currentTime = Date.now();

      setResetToken(response.resetToken);
      setResetDeadline(
        currentTime + response.expiresIn * 1000
      );

      setNow(currentTime);
      setOTP("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("OTP verified successfully");
      setStep("password");

    } catch (err) {
      setError(getErrorMessage(err));

    } finally {
      requestLock.current = false;
      setLoading(false);
    }
  }

  // ==========================================
  // RESET PASSWORD
  // ==========================================

  async function handleResetPassword(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (requestLock.current) return;

    setError("");
    setMessage("");

    if (!resetToken || Date.now() >= resetDeadline) {
      setError(
        "Reset session expired. Please start again."
      );
      return;
    }

    if (
      newPassword.length < 8 ||
      !newPassword.trim()
    ) {
      setError(
        "Password must contain at least 8 characters"
      );
      return;
    }

    if (
      new TextEncoder().encode(newPassword).length > 72
    ) {
      setError("Password must not exceed 72 bytes");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    requestLock.current = true;
    setLoading(true);

    try {
      await resetCustomerPassword({
        email,
        resetToken,
        newPassword,
        confirmPassword,
      });

      setResetToken("");
      setNewPassword("");
      setConfirmPassword("");
      setOTP("");
      setResetDeadline(0);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setStep("success");

    } catch (err) {
      setError(getErrorMessage(err));

    } finally {
      requestLock.current = false;
      setLoading(false);
    }
  }

  // ==========================================
  // RESTART PASSWORD RESET
  // ==========================================

  function restart() {
    if (requestLock.current) return;

    setStep("email");
    setOTP("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setOtpDeadline(0);
    setResetDeadline(0);
    setError("");
    setMessage("");
  }

  const pageTitle = {
    email: "Forgot Password?",
    otp: "Verify OTP",
    password: "Reset Password",
    success: "Password Updated!",
  }[step];

  const pageDescription = {
    email: "Enter your registered email address",
    otp: "Enter your 6-digit verification code",
    password: "Create a new password for your account",
    success: "You can now login with your new password",
  }[step];

  const HeaderIcon = {
    email: Mail,
    otp: ShieldCheck,
    password: LockKeyhole,
    success: CircleCheck,
  }[step];

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">

      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">

        {/* Page Header */}

        <div className="mb-7 text-center">

          <div
            className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-white ${
              step === "success"
                ? "bg-green-600"
                : "bg-blue-600"
            }`}
          >
            <HeaderIcon size={32} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {pageTitle}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {pageDescription}
          </p>

        </div>

        {/* Progress Steps */}

        {step !== "success" && (
          <div className="mb-7 flex items-start">

            {steps.map((item, index) => (
              <div
                key={item.id}
                className="relative flex flex-1 flex-col items-center"
              >

                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-1/2 top-4 h-0.5 w-full ${
                      index < currentStep
                        ? "bg-blue-600"
                        : "bg-slate-200"
                    }`}
                  />
                )}

                <div
                  aria-current={
                    index === currentStep
                      ? "step"
                      : undefined
                  }
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    index <= currentStep
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {index < currentStep ? (
                    <Check size={16} />
                  ) : (
                    index + 1
                  )}
                </div>

                <span
                  className={`mt-2 text-xs font-medium ${
                    index <= currentStep
                      ? "text-blue-600"
                      : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>

              </div>
            ))}

          </div>
        )}

        {/* Error Message */}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          >
            <CircleAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}

        {message && step !== "success" && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            <CircleCheck size={18} className="shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* STEP 1: EMAIL */}

        {step === "email" && (
          <form
            onSubmit={handleEmailSubmit}
            className="space-y-5"
          >

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>

              <div className="relative">

                <Mail
                  size={18}
                  className="absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your email"
                  autoComplete="email"
                  maxLength={150}
                  required
                  disabled={loading}
                  className={inputClass}
                />

              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={buttonClass}
            >
              {loading && (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              )}

              {loading ? "Requesting OTP..." : "Get OTP"}
            </button>

          </form>
        )}

        {/* STEP 2: VERIFY OTP */}

        {step === "otp" && (
          <form
            onSubmit={handleVerifyOTP}
            className="space-y-5"
          >

            <div className="rounded-xl bg-slate-50 p-3 text-center">

              <p className="text-xs text-slate-500">
                Registered Email
              </p>

              <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                {email}
              </p>

              <button
                type="button"
                onClick={restart}
                disabled={loading}
                className="mt-2 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
              >
                Change Email
              </button>

            </div>

            {/* Development Only */}

            {process.env.NODE_ENV === "development" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                Development mode: Check the backend terminal
                for the OTP. Email delivery is not enabled.
              </div>
            )}

            <div>

              <label
                htmlFor="otp"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Verification Code
              </label>

              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => {
                  setOTP(
                    e.target.value
                      .replace(/[^0-9]/g, "")
                      .slice(0, 6)
                  );
                  setError("");
                }}
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 px-4 py-4 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-50"
              />

              <p
                className={`mt-2 text-center text-xs ${
                  otpSeconds > 0
                    ? "text-slate-500"
                    : "text-red-600"
                }`}
              >
                {otpSeconds > 0
                  ? `OTP validity estimate: ${formatTime(otpSeconds)}`
                  : "OTP may have expired. Request a new OTP."}
              </p>

            </div>

            <button
              type="submit"
              disabled={
                loading ||
                otp.length !== 6 ||
                otpSeconds === 0
              }
              className={buttonClass}
            >
              {loading && (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              )}

              {loading ? "Processing..." : "Verify OTP"}
            </button>

            <div className="text-center text-sm">

              <span className="text-slate-500">
                Need another OTP?{" "}
              </span>

              <button
                type="button"
                onClick={() => void requestOTP(true)}
                disabled={
                  loading || resendSeconds > 0
                }
                className="font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {resendSeconds > 0
                  ? `Resend in ${resendSeconds}s`
                  : "Resend OTP"}
              </button>

            </div>

          </form>
        )}

        {/* STEP 3: NEW PASSWORD */}

        {step === "password" && (
          <form
            onSubmit={handleResetPassword}
            className="space-y-5"
          >

            <div>

              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                New Password
              </label>

              <div className="relative">

                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  disabled={loading}
                  className={`${inputClass} pr-12`}
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-4 top-3.5 text-slate-500"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

              <p className="mt-2 text-xs text-slate-500">
                Minimum 8 characters, maximum 72 bytes.
              </p>

            </div>

            <div>

              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Confirm Password
              </label>

              <div className="relative">

                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  disabled={loading}
                  className={`${inputClass} pr-12`}
                />

                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  aria-pressed={showConfirmPassword}
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  disabled={loading}
                  className="absolute right-4 top-3.5 text-slate-500"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>

              </div>

              {confirmPassword && (
                <p
                  className={`mt-2 text-xs ${
                    newPassword === confirmPassword
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {newPassword === confirmPassword
                    ? "Passwords match"
                    : "Passwords do not match"}
                </p>
              )}

            </div>

            <p className="text-center text-xs text-slate-500">
              {resetSeconds > 0
                ? `Reset session: ${formatTime(resetSeconds)} remaining`
                : "Reset session expired. Please start again."}
            </p>

            <button
              type="submit"
              disabled={
                loading ||
                resetSeconds === 0 ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
              className={buttonClass}
            >
              {loading && (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              )}

              {loading
                ? "Updating Password..."
                : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={restart}
              disabled={loading}
              className="w-full text-center text-sm font-semibold text-slate-500 hover:text-blue-600"
            >
              Start Again
            </button>

          </form>
        )}

        {/* STEP 4: SUCCESS */}

        {step === "success" && (
          <div className="space-y-5">

            <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">

              <CircleCheck
                size={32}
                className="mx-auto mb-3 text-green-600"
              />

              <h2 className="font-semibold text-green-800">
                Password Reset Successful
              </h2>

              <p className="mt-2 text-sm text-green-700">
                Your password has been updated successfully.
                Please login using your new password.
              </p>

            </div>

            <Link
              href="/login"
              className={buttonClass}
            >
              Login Now
            </Link>

          </div>
        )}

        {/* Back to Login */}

        {step !== "success" && (
          <div className="mt-7 text-center">

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>

          </div>
        )}

      </div>
    </main>
  );
}
