
"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  ShieldCheck,
  Save,
  LoaderCircle,
  CircleCheck,
  CircleAlert,
  RefreshCw,
  LockKeyhole,
  Eye,
  EyeOff,
  KeyRound,
  ChevronRight,
} from "lucide-react";

import {
  getCustomerToken,
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
  formatDate,
  type CustomerProfile,
} from "@/lib/api";

// ==========================================
// TYPES
// ==========================================

type ProfileForm = {
  name: string;
  phone: string;
  address: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type PasswordField = keyof PasswordForm;

// ==========================================
// INITIAL VALUES
// ==========================================

const initialForm: ProfileForm = {
  name: "",
  phone: "",
  address: "",
};

const initialPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const initialPasswordVisibility = {
  currentPassword: false,
  newPassword: false,
  confirmPassword: false,
};

// ==========================================
// COMMON STYLES
// ==========================================

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50 disabled:text-slate-500";

const labelClass =
  "mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700";

const primaryButtonClass =
  "flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function toForm(profile: CustomerProfile): ProfileForm {
  return {
    name: profile.name,
    phone: profile.phone,
    address: profile.address || "",
  };
}

// ==========================================
// FEEDBACK MESSAGE COMPONENT
// ==========================================

function FeedbackMessage({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  if (!message) return null;

  const isSuccess = type === "success";

  const Icon = isSuccess
    ? CircleCheck
    : CircleAlert;

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <Icon size={20} className="shrink-0" />

      <span>{message}</span>
    </div>
  );
}

// ==========================================
// PASSWORD INPUT COMPONENT
// ==========================================

function PasswordInput({
  id,
  label,
  value,
  placeholder,
  visible,
  autoComplete,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  autoComplete: "current-password" | "new-password";
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        <LockKeyhole size={16} />

        {label}

        <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="none"
          maxLength={
            autoComplete === "current-password"
              ? 4096
              : 72
          }
          required
          className={`${inputClass} pr-12`}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          {visible ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// CUSTOMER PROFILE PAGE
// ==========================================

export default function CustomerProfilePage() {
  const router = useRouter();

  // Profile state.

  const [profile, setProfile] =
    useState<CustomerProfile | null>(null);

  const [form, setForm] =
    useState<ProfileForm>(initialForm);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // Password state.

  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(initialPasswordForm);

  const [passwordVisibility, setPasswordVisibility] =
    useState(initialPasswordVisibility);

  const [passwordSaving, setPasswordSaving] =
    useState(false);

  const [passwordError, setPasswordError] =
    useState("");

  const [passwordSuccess, setPasswordSuccess] =
    useState("");

  const isBusy = saving || passwordSaving;

  // ==========================================
  // LOAD CUSTOMER PROFILE
  // ==========================================

  useEffect(() => {
    const token = getCustomerToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await getCustomerProfile(
          controller.signal
        );

        if (controller.signal.aborted) return;

        if (getCustomerToken() !== token) {
          router.replace("/login");
          return;
        }

        setProfile(response.profile);

        setForm(toForm(response.profile));

      } catch (err) {
        if (controller.signal.aborted) return;

        if (!getCustomerToken()) {
          router.replace("/login");
          return;
        }

        setProfile(null);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your profile"
        );

      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => controller.abort();

  }, [router, reloadKey]);

  // ==========================================
  // CHECK UNSAVED PROFILE CHANGES
  // ==========================================

  const hasChanges =
    profile !== null &&
    (
      form.name.trim() !== profile.name ||
      form.phone.trim() !== profile.phone ||
      form.address.trim() !== (profile.address || "")
    );

  // ==========================================
  // CHECK PASSWORD FORM
  // ==========================================

  const hasPasswordChanges =
    Boolean(passwordForm.currentPassword) ||
    Boolean(passwordForm.newPassword) ||
    Boolean(passwordForm.confirmPassword);

  const passwordFormComplete =
    Boolean(passwordForm.currentPassword) &&
    Boolean(passwordForm.newPassword) &&
    Boolean(passwordForm.confirmPassword);

  // ==========================================
  // HANDLE PROFILE INPUT
  // ==========================================

  function handleChange(
    field: keyof ProfileForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  // ==========================================
  // HANDLE PASSWORD INPUT
  // ==========================================

  function handlePasswordChange(
    field: PasswordField,
    value: string
  ) {
    setPasswordForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  }

  // ==========================================
  // TOGGLE PASSWORD VISIBILITY
  // ==========================================

  function togglePasswordVisibility(
    field: PasswordField
  ) {
    setPasswordVisibility((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  }

  // ==========================================
  // RESET PROFILE CHANGES
  // ==========================================

  function handleReset() {
    if (!profile || isBusy) return;

    setForm(toForm(profile));

    setError("");
    setSuccess("");
  }

  // ==========================================
  // CLEAR PASSWORD FORM
  // ==========================================

  function clearPasswordForm() {
    setPasswordForm(initialPasswordForm);

    setPasswordVisibility(
      initialPasswordVisibility
    );
  }

  function handlePasswordReset() {
    if (isBusy) return;

    clearPasswordForm();

    setPasswordError("");
    setPasswordSuccess("");
  }

  // ==========================================
  // REFRESH PROFILE
  // ==========================================

  function handleRefresh() {
    if (isBusy || loading) return;

    if (
      (hasChanges || hasPasswordChanges) &&
      !window.confirm(
        "Discard your unsaved changes and refresh?"
      )
    ) {
      return;
    }

    clearPasswordForm();

    setPasswordError("");
    setPasswordSuccess("");

    setReloadKey((previous) => previous + 1);
  }

  // ==========================================
  // SCROLL TO CHANGE PASSWORD
  // ==========================================

  function scrollToPassword() {
    document
      .getElementById("change-password")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  // ==========================================
  // UPDATE CUSTOMER PROFILE
  // ==========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isBusy || loading || !hasChanges) {
      return;
    }

    setError("");
    setSuccess("");

    const token = getCustomerToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const name = form.name.trim();

    const phone = form.phone.trim();

    const address = form.address.trim();

    // Validate name.

    if (!name || name.length > 100) {
      setError(
        "Please enter a valid full name."
      );

      return;
    }

    // Validate phone.

    if (!/^[0-9]{10,15}$/.test(phone)) {
      setError(
        "Please enter a valid phone number with 10 to 15 digits."
      );

      return;
    }

    // Validate address.

    if (address.length > 2000) {
      setError(
        "Address cannot exceed 2000 characters."
      );

      return;
    }

    setSaving(true);

    try {
      const response = await updateCustomerProfile({
        name,
        phone,
        address: address || null,
      });

      if (getCustomerToken() !== token) {
        router.replace("/login");
        return;
      }

      setProfile(response.profile);

      setForm(toForm(response.profile));

      setSuccess(
        response.message ||
          "Profile updated successfully."
      );

    } catch (err) {
      if (!getCustomerToken()) {
        router.replace("/login");
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update your profile."
      );

    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // CHANGE CUSTOMER PASSWORD
  // ==========================================

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isBusy || loading) return;

    setPasswordError("");
    setPasswordSuccess("");

    const token = getCustomerToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordForm;

    // Validate required fields.

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordError(
        "Please fill in all password fields."
      );

      return;
    }

    // Validate minimum password length.

    if (
      newPassword.length < 8 ||
      !newPassword.trim()
    ) {
      setPasswordError(
        "New password must contain at least 8 characters."
      );

      return;
    }

    // Validate bcrypt password byte limit.

    if (
      new TextEncoder().encode(newPassword).length > 72
    ) {
      setPasswordError(
        "New password must not exceed 72 bytes."
      );

      return;
    }

    // Validate current password size.

    if (
      new TextEncoder().encode(currentPassword).length >
      4096
    ) {
      setPasswordError(
        "Invalid current password."
      );

      return;
    }

    // Prevent same password.

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from your current password."
      );

      return;
    }

    // Validate password confirmation.

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "New password and confirm password do not match."
      );

      return;
    }

    setPasswordSaving(true);

    try {
      const response =
        await changeCustomerPassword({
          currentPassword,
          newPassword,
          confirmPassword,
        });

      if (getCustomerToken() !== token) {
        clearPasswordForm();

        router.replace("/login");

        return;
      }

      // Clear passwords after successful update.

      clearPasswordForm();

      setPasswordSuccess(
        response.message ||
          "Password changed successfully."
      );

    } catch (err) {
      if (!getCustomerToken()) {
        clearPasswordForm();

        router.replace("/login");

        return;
      }

      // Hide password values after failure.

      setPasswordVisibility(
        initialPasswordVisibility
      );

      setPasswordError(
        err instanceof Error
          ? err.message
          : "Failed to change your password."
      );

    } finally {
      setPasswordSaving(false);
    }
  }

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <LoaderCircle
          size={32}
          className="animate-spin text-blue-600"
        />

        <p className="text-sm text-slate-500">
          Loading your profile...
        </p>
      </div>
    );
  }

  // ==========================================
  // ERROR STATE
  // ==========================================

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">

          <CircleAlert
            size={42}
            className="mx-auto mb-4 text-red-500"
          />

          <h2 className="text-xl font-bold text-slate-900">
            Unable to load profile
          </h2>

          <p
            role="alert"
            className="mt-2 text-sm text-slate-500"
          >
            {error || "Something went wrong."}
          </p>

          <button
            type="button"
            onClick={handleRefresh}
            className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            <RefreshCw size={17} />

            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // PROFILE INITIALS
  // ==========================================

  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  // ==========================================
  // PROFILE PAGE UI
  // ==========================================

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">

      {/* Page Header */}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            My Profile
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage your personal information and account security.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isBusy}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} />

          Refresh
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">

        {/* ==========================================
            LEFT SIDE - PROFILE SUMMARY
        ========================================== */}

        <aside className="space-y-4 lg:sticky lg:top-24">

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

            {/* Profile Cover */}

            <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-500" />

            <div className="px-6 pb-6">

              {/* Profile Avatar */}

              <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-3xl font-bold text-blue-700">
                {initials || "C"}
              </div>

              {/* Customer Name */}

              <h2 className="mt-4 break-words text-xl font-bold text-slate-900">
                {profile.name}
              </h2>

              <p className="mt-1 break-all text-sm text-slate-500">
                {profile.email}
              </p>

              {/* Account Status */}

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">

                <ShieldCheck size={15} />

                Active Account
              </div>

              <div className="mt-6 space-y-5 border-t border-slate-100 pt-6">

                {/* Mobile Number */}

                <div className="flex items-center gap-3">

                  <div className="rounded-lg bg-slate-100 p-2.5 text-slate-500">
                    <Phone size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Mobile Number
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {profile.phone}
                    </p>
                  </div>
                </div>

                {/* Address */}

                <div className="flex items-start gap-3">

                  <div className="rounded-lg bg-slate-100 p-2.5 text-slate-500">
                    <MapPin size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      Address
                    </p>

                    <p className="mt-1 break-words text-sm font-medium text-slate-900">
                      {profile.address || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Member Since */}

                <div className="flex items-center gap-3">

                  <div className="rounded-lg bg-slate-100 p-2.5 text-slate-500">
                    <CalendarDays size={18} />
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Member Since
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {formatDate(profile.createdAt)}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Change Password Shortcut */}

          <button
            type="button"
            onClick={scrollToPassword}
            className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
          >
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <KeyRound size={20} />
            </div>

            <div className="min-w-0 flex-1">

              <p className="text-sm font-semibold text-slate-900">
                Change Password
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Manage account security
              </p>
            </div>

            <ChevronRight
              size={18}
              className="text-slate-400 transition group-hover:text-blue-600"
            />
          </button>

        </aside>

        {/* ==========================================
            RIGHT SIDE - PROFILE AND SECURITY
        ========================================== */}

        <div className="min-w-0 space-y-6">

          {/* ==========================================
              PERSONAL INFORMATION
          ========================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

            {/* Section Header */}

            <div className="flex items-center gap-3 border-b border-slate-100 p-5 sm:p-6">

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <UserRound size={22} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Personal Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update your contact and personal details.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="space-y-6 p-5 sm:p-6">

                {/* Profile Feedback */}

                <FeedbackMessage
                  type="success"
                  message={success}
                />

                <FeedbackMessage
                  type="error"
                  message={error}
                />

                <fieldset
                  disabled={isBusy}
                  className="space-y-6"
                >

                  {/* Full Name */}

                  <div>
                    <label
                      htmlFor="profile-name"
                      className={labelClass}
                    >
                      <UserRound size={16} />

                      Full Name

                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      id="profile-name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={(event) =>
                        handleChange(
                          "name",
                          event.target.value
                        )
                      }
                      maxLength={100}
                      placeholder="Enter your full name"
                      required
                      className={inputClass}
                    />
                  </div>

                  {/* Email Address */}

                  <div>
                    <label
                      htmlFor="profile-email"
                      className={labelClass}
                    >
                      <Mail size={16} />

                      Email Address
                    </label>

                    <div className="relative">

                      <input
                        id="profile-email"
                        type="email"
                        value={profile.email}
                        readOnly
                        className={`${inputClass} cursor-not-allowed bg-slate-50 pr-12 text-slate-500`}
                      />

                      <LockKeyhole
                        size={17}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      Your registered email address cannot be changed.
                    </p>
                  </div>

                  {/* Mobile Number */}

                  <div>
                    <label
                      htmlFor="profile-phone"
                      className={labelClass}
                    >
                      <Phone size={16} />

                      Mobile Number

                      <span className="text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      id="profile-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) =>
                        handleChange(
                          "phone",
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 15)
                        )
                      }
                      minLength={10}
                      maxLength={15}
                      placeholder="Enter your mobile number"
                      required
                      className={inputClass}
                    />
                  </div>

                  {/* Address */}

                  <div>
                    <label
                      htmlFor="profile-address"
                      className={labelClass}
                    >
                      <MapPin size={16} />

                      Address
                    </label>

                    <textarea
                      id="profile-address"
                      autoComplete="street-address"
                      value={form.address}
                      onChange={(event) =>
                        handleChange(
                          "address",
                          event.target.value
                        )
                      }
                      rows={4}
                      maxLength={2000}
                      placeholder="Enter your complete address"
                      className={`${inputClass} resize-y`}
                    />

                    <p className="mt-1 text-right text-xs text-slate-400">
                      {form.address.length}/2000
                    </p>
                  </div>

                </fieldset>
              </div>

              {/* Profile Form Actions */}

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 p-5 sm:p-6">

                <p className="text-xs text-slate-500">
                  {hasChanges
                    ? "You have unsaved changes."
                    : "Your profile is up to date."}
                </p>

                <div className="flex flex-wrap items-center gap-3">

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!hasChanges || isBusy}
                    className={secondaryButtonClass}
                  >
                    Cancel Changes
                  </button>

                  <button
                    type="submit"
                    disabled={!hasChanges || isBusy}
                    className={primaryButtonClass}
                  >
                    {saving ? (
                      <>
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />

                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={17} />

                        Save Changes
                      </>
                    )}
                  </button>

                </div>
              </div>
            </form>
          </section>

          {/* ==========================================
              CHANGE PASSWORD SECTION
          ========================================== */}

          <section
            id="change-password"
            className="scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >

            {/* Section Header */}

            <div className="flex items-center gap-3 border-b border-slate-100 p-5 sm:p-6">

              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <LockKeyhole size={22} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Change Password
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Update your password to keep your account secure.
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit}>

              <div className="space-y-6 p-5 sm:p-6">

                {/* Password Success Message */}

                <FeedbackMessage
                  type="success"
                  message={passwordSuccess}
                />

                {/* Password Error Message */}

                <FeedbackMessage
                  type="error"
                  message={passwordError}
                />

                <fieldset
                  disabled={isBusy}
                  className="space-y-6"
                >

                  {/* Current Password */}

                  <PasswordInput
                    id="current-password"
                    label="Current Password"
                    value={passwordForm.currentPassword}
                    placeholder="Enter your current password"
                    visible={
                      passwordVisibility.currentPassword
                    }
                    autoComplete="current-password"
                    onChange={(value) =>
                      handlePasswordChange(
                        "currentPassword",
                        value
                      )
                    }
                    onToggle={() =>
                      togglePasswordVisibility(
                        "currentPassword"
                      )
                    }
                  />

                  {/* New Password */}

                  <div>
                    <PasswordInput
                      id="new-password"
                      label="New Password"
                      value={passwordForm.newPassword}
                      placeholder="Enter your new password"
                      visible={
                        passwordVisibility.newPassword
                      }
                      autoComplete="new-password"
                      onChange={(value) =>
                        handlePasswordChange(
                          "newPassword",
                          value
                        )
                      }
                      onToggle={() =>
                        togglePasswordVisibility(
                          "newPassword"
                        )
                      }
                    />

                    <p className="mt-2 text-xs text-slate-500">
                      Minimum 8 characters. Maximum 72 bytes.
                    </p>
                  </div>

                  {/* Confirm New Password */}

                  <div>
                    <PasswordInput
                      id="confirm-password"
                      label="Confirm New Password"
                      value={
                        passwordForm.confirmPassword
                      }
                      placeholder="Re-enter your new password"
                      visible={
                        passwordVisibility.confirmPassword
                      }
                      autoComplete="new-password"
                      onChange={(value) =>
                        handlePasswordChange(
                          "confirmPassword",
                          value
                        )
                      }
                      onToggle={() =>
                        togglePasswordVisibility(
                          "confirmPassword"
                        )
                      }
                    />

                    {/* Password Match Indicator */}

                    {passwordForm.confirmPassword &&
                      (
                        passwordForm.newPassword ===
                        passwordForm.confirmPassword
                      ? (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">

                          <CircleCheck size={14} />

                          Passwords match
                        </p>
                      ) : (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500">

                          <CircleAlert size={14} />

                          Passwords do not match
                        </p>
                      )
                    )}
                  </div>

                </fieldset>

                {/* Password Security Information */}

                <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">

                  <ShieldCheck
                    size={21}
                    className="mt-0.5 shrink-0 text-blue-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-blue-800">
                      Keep your account secure
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-blue-700">
                      Choose a strong, unique password that you do not use for other accounts. Never share your password with anyone.
                    </p>
                  </div>
                </div>

              </div>

              {/* Password Form Actions */}

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/50 p-5 sm:p-6">

                <p className="text-xs text-slate-500">
                  Your personal information will remain unchanged.
                </p>

                <div className="flex flex-wrap items-center gap-3">

                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={
                      !hasPasswordChanges || isBusy
                    }
                    className={secondaryButtonClass}
                  >
                    Clear
                  </button>

                  <button
                    type="submit"
                    disabled={
                      !passwordFormComplete || isBusy
                    }
                    className={primaryButtonClass}
                  >
                    {passwordSaving ? (
                      <>
                        <LoaderCircle
                          size={17}
                          className="animate-spin"
                        />

                        Updating...
                      </>
                    ) : (
                      <>
                        <LockKeyhole size={17} />

                        Update Password
                      </>
                    )}
                  </button>

                </div>
              </div>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
}
