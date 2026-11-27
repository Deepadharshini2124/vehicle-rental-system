"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  MapPin,
  MapPinOff,
  CalendarDays,
  RefreshCw,
} from "lucide-react";

import {
  getCustomerToken,
  getMyBookings,
  getVehicleById,
  getVehicleImage,
  getPublicSettings,
  cancelBooking,
  canCancelBooking,
  formatCurrency,
  formatDate,
  getBookingStatusLabel,
  getBookingStatusMessage,
  type Booking,
  type BookingStatus,
  type Vehicle,
  type PublicSettings,
} from "@/lib/api";

// ==========================================
// TYPES
// ==========================================

type FilterStatus = "all" | BookingStatus;

// ==========================================
// CONSTANTS
// ==========================================

const statusStyles: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const filters: FilterStatus[] = [
  "all",
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "rejected",
  "cancelled",
];

const progressStatuses: BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
];

const progressSteps = [
  "Requested",
  "Confirmed",
  "Picked Up",
  "Returned",
];

const cardClass =
  "rounded-2xl border border-slate-200 bg-white";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

// ==========================================
// ERROR HELPER
// ==========================================

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  return error instanceof Error
    ? error.message
    : fallback;
}

// ==========================================
// BOOKING PROGRESS TRACKER
// ==========================================

function BookingProgress({
  status,
}: {
  status: BookingStatus;
}) {
  const currentStep =
    progressStatuses.indexOf(status);

  if (currentStep === -1) return null;

  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
      <div className="flex items-start">
        {progressSteps.map((step, index) => {
          const completed = index <= currentStep;

          return (
            <div
              key={step}
              className="relative flex flex-1 flex-col items-center"
            >
              {index < progressSteps.length - 1 && (
                <div
                  className={`absolute left-1/2 top-4 h-0.5 w-full ${
                    index < currentStep
                      ? "bg-emerald-500"
                      : "bg-slate-200"
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  completed
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {completed ? "✓" : index + 1}
              </div>

              <span
                className={`mt-2 text-center text-[10px] font-medium sm:text-xs ${
                  completed
                    ? "text-emerald-600"
                    : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// VEHICLE IMAGE
// ==========================================

function BookingVehicleImage({
  vehicle,
}: {
  vehicle?: Vehicle | null;
}) {
  const imageUrl = getVehicleImage(vehicle?.image);

  const [failedUrl, setFailedUrl] =
    useState<string | null>(null);

  if (!imageUrl || failedUrl === imageUrl) {
    return (
      <div className="flex h-32 w-full shrink-0 items-center justify-center rounded-xl bg-slate-100 sm:w-44">
        <span className="text-sm font-medium text-slate-400">
          {vehicle?.type === "bike"
            ? "Bike"
            : "Vehicle"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={vehicle?.name || "Rental vehicle"}
      onError={() => setFailedUrl(imageUrl)}
      loading="lazy"
      className="h-32 w-full shrink-0 rounded-xl bg-slate-100 object-cover sm:w-44"
    />
  );
}

// ==========================================
// BOOKING PICKUP LOCATION
// ==========================================

function BookingPickupLocation({
  booking,
}: {
  booking: Booking;
}) {
  // Always use the saved booking snapshot.
  // Never use booking.vehicle.location for history.

  const location = booking.pickupLocation;

  const hasValidLocation =
    location !== null &&
    location !== undefined &&
    location.id === booking.locationId &&
    typeof location.name === "string" &&
    location.name.trim().length > 0 &&
    typeof location.city === "string" &&
    location.city.trim().length > 0 &&
    typeof location.address === "string" &&
    location.address.trim().length > 0;

  // Historical bookings created before
  // pickup location integration.

  if (!hasValidLocation || !location) {
    const isHistoricalBooking =
      booking.locationId === null &&
      booking.pickupLocationName === null &&
      booking.pickupLocationCity === null &&
      booking.pickupLocationAddress === null;

    return (
      <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/70">
            <MapPinOff
              size={20}
              className="text-slate-500"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">
              Pickup & Return Location
            </p>

            <h3 className="mt-1 text-sm font-semibold text-slate-700">
              {isHistoricalBooking
                ? "Location not recorded"
                : "Location details unavailable"}
            </h3>

            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {isHistoricalBooking
                ? "This booking was created before pickup location integration."
                : "The saved pickup location could not be verified."}
            </p>

            {[
              "pending",
              "confirmed",
              "in_progress",
            ].includes(booking.status) && (
              <p className="mt-2 text-xs text-slate-600">
                Please contact the rental provider
                for pickup or return arrangements.
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  // New bookings with saved location snapshot.

  return (
    <section className="mt-5 rounded-xl border border-[#155E75]/15 bg-[#ECFEFF] p-4">
      <div className="flex items-start gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#155E75]/10">
          <MapPin
            size={21}
            className="text-[#155E75]"
          />
        </div>

        <div className="min-w-0 flex-1">

          <p className="text-xs font-semibold text-[#155E75]">
            Pickup & Return Location
          </p>

          <h3 className="mt-1 break-words text-sm font-bold text-[#102A36] sm:text-base">
            {location.name}
          </h3>

          <p className="mt-1 break-words text-sm font-medium text-slate-600">
            {location.city}
          </p>

          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-500 sm:text-sm">
            {location.address}
          </p>

          <p className="mt-3 text-xs font-medium text-[#155E75]">
            Pickup and return at the same location
          </p>

        </div>
      </div>
    </section>
  );
}

// ==========================================
// CANCELLATION NOTICE
// ==========================================

function CancellationNotice({
  settings,
}: {
  settings: PublicSettings | null;
}) {
  return (
    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4">

      <p className="text-sm font-semibold text-amber-800">
        {settings
          ? "Booking cancellation is currently disabled"
          : "Cancellation settings are temporarily unavailable"}
      </p>

      <p className="mt-1 text-xs leading-relaxed text-amber-700">
        {settings
          ? "Please contact the rental provider for cancellation assistance."
          : "Please refresh the page to verify the latest cancellation policy."}
      </p>

      {settings && (
        <div className="mt-3 space-y-1 text-sm text-amber-800">

          <p className="font-medium">
            {settings.businessName}
          </p>

          {settings.businessPhone && (
            <a
              href={`tel:${settings.businessPhone}`}
              className="block hover:underline"
            >
              {settings.businessPhone}
            </a>
          )}

          {settings.businessEmail && (
            <a
              href={`mailto:${settings.businessEmail}`}
              className="block break-all hover:underline"
            >
              {settings.businessEmail}
            </a>
          )}

        </div>
      )}
    </div>
  );
}

// ==========================================
// BOOKING CARD
// ==========================================

function BookingCard({
  booking,
  settings,
  busy,
  cancellingId,
  onCancel,
}: {
  booking: Booking;
  settings: PublicSettings | null;
  busy: boolean;
  cancellingId: number | null;
  onCancel: (booking: Booking) => void;
}) {
  const cancellationAllowed = canCancelBooking(
    booking,
    settings?.allowCancellation === true
  );

  const details = [
    {
      label: "Pickup Date",
      value: formatDate(booking.startDate),
    },
    {
      label: "Return Date",
      value: formatDate(booking.endDate),
    },
    {
      label: "Rental Duration",
      value: `${booking.totalDays} ${
        booking.totalDays === 1
          ? "Day"
          : "Days"
      }`,
    },
    {
      label: "Total Rental Amount",
      value: formatCurrency(booking.totalAmount),
    },
  ];

  return (
    <article className={`${cardClass} p-5 shadow-sm sm:p-6`}>

      {/* BOOKING HEADER */}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

        <div>
          <p className="text-sm font-bold">
            Booking #{booking.id}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Booked on {formatDate(booking.createdAt)}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            statusStyles[booking.status] ||
            "bg-slate-100 text-slate-600"
          }`}
        >
          {getBookingStatusLabel(booking.status)}
        </span>

      </div>

      {/* VEHICLE AND RENTAL DETAILS */}

      <div className="flex flex-col gap-5 sm:flex-row">

        <BookingVehicleImage
          vehicle={booking.vehicle}
        />

        <div className="min-w-0 flex-1">

          <h2 className="break-words text-xl font-bold">
            {booking.vehicle?.name ||
              `Vehicle #${booking.vehicleId}`}
          </h2>

          {booking.vehicle && (
            <p className="mt-1 text-sm capitalize text-slate-500">
              {booking.vehicle.type} ·{" "}
              {booking.vehicle.brand}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">

            {details.map(({ label, value }) => (
              <div key={label}>

                <p className="text-xs text-slate-500">
                  {label}
                </p>

                <p
                  className={`mt-1 ${
                    label === "Total Rental Amount"
                      ? "text-lg font-bold"
                      : "text-sm font-semibold"
                  }`}
                >
                  {value}
                </p>

              </div>
            ))}

          </div>
        </div>
      </div>

      {/* PICKUP AND RETURN LOCATION */}

      <BookingPickupLocation
        booking={booking}
      />

      {/* BOOKING PROGRESS */}

      <BookingProgress
        status={booking.status}
      />

      {/* BOOKING STATUS MESSAGE */}

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          {getBookingStatusMessage(booking.status)}
        </p>
      </div>

      {/* CANCELLATION POLICY NOTICE */}

      {booking.status === "pending" &&
        !cancellationAllowed && (
          <CancellationNotice
            settings={settings}
          />
        )}

      {/* BOOKING ACTIONS */}

      <div className="mt-5 flex flex-wrap justify-end gap-3">

        {booking.vehicle && (
          <Link
            href={`/vehicles/${booking.vehicleId}`}
            className={secondaryButton}
          >
            View Vehicle
          </Link>
        )}

        {cancellationAllowed && (
          <button
            type="button"
            onClick={() => onCancel(booking)}
            disabled={busy}
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancellingId === booking.id
              ? "Cancelling..."
              : "Cancel Booking"}
          </button>
        )}

      </div>
    </article>
  );
}

// ==========================================
// MY BOOKINGS PAGE
// ==========================================

export default function MyBookingsPage() {
  const router = useRouter();

  // ========================================
  // STATE
  // ========================================

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [settings, setSettings] =
    useState<PublicSettings | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [filter, setFilter] =
    useState<FilterStatus>("all");

  const [cancellingId, setCancellingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [settingsError, setSettingsError] =
    useState("");

  const [message, setMessage] =
    useState("");

  // ========================================
  // REQUEST LOCKS
  // ========================================

  const mounted = useRef(false);

  const loadRequest = useRef(0);

  const cancelLock = useRef(false);

  const loadingLock = useRef(false);

  const busy =
    loading ||
    refreshing ||
    cancellingId !== null;

  // ========================================
  // LOAD BOOKINGS
  // ========================================

  const loadBookings = useCallback(
    async (refresh = false) => {
      const token = getCustomerToken();

      if (!token) {
        setBookings([]);
        setSettings(null);

        router.replace(
          "/login?next=%2Fmy-bookings"
        );

        return;
      }

      const requestId = ++loadRequest.current;

      loadingLock.current = true;

      const isCurrentRequest = () =>
        mounted.current &&
        requestId === loadRequest.current;

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setSettingsError("");

      try {
        // Load booking history and settings
        // independently.

        const [bookingResult, settingsResult] =
          await Promise.allSettled([
            getMyBookings(),
            getPublicSettings(),
          ]);

        if (!isCurrentRequest()) return;

        // Prevent stale customer data.

        if (getCustomerToken() !== token) {
          setBookings([]);
          setSettings(null);

          router.replace(
            "/login?next=%2Fmy-bookings"
          );

          return;
        }

        // Settings failure must not hide
        // existing booking history.

        if (settingsResult.status === "fulfilled") {
          setSettings(
            settingsResult.value.settings
          );
        } else {
          setSettings(null);

          setSettingsError(
            "Unable to load cancellation settings. Please refresh the page."
          );
        }

        if (bookingResult.status === "rejected") {
          throw bookingResult.reason;
        }

        const bookingList =
          bookingResult.value.bookings;

        // Fetch missing vehicle details only
        // once per vehicle.

        const vehicleIds = [
          ...new Set(
            bookingList
              .filter(
                (booking) => !booking.vehicle
              )
              .map(
                (booking) => booking.vehicleId
              )
          ),
        ];

        const results = await Promise.allSettled(
          vehicleIds.map(
            (id) => getVehicleById(id)
          )
        );

        if (!isCurrentRequest()) return;

        if (getCustomerToken() !== token) {
          setBookings([]);
          setSettings(null);

          router.replace(
            "/login?next=%2Fmy-bookings"
          );

          return;
        }

        const vehicleMap =
          new Map<number, Vehicle>();

        for (const result of results) {
          if (
            result.status === "fulfilled" &&
            result.value.vehicle
          ) {
            const vehicle =
              result.value.vehicle;

            vehicleMap.set(
              vehicle.id,
              vehicle
            );
          }
        }

        // Preserve saved booking location.
        // Vehicle fallback is only used for
        // current vehicle information.

        setBookings(
          bookingList.map((booking) => ({
            ...booking,

            vehicle:
              booking.vehicle ||
              vehicleMap.get(booking.vehicleId),
          }))
        );

      } catch (err) {
        if (!isCurrentRequest()) return;

        setError(
          getErrorMessage(
            err,
            "Unable to load your bookings"
          )
        );

        if (getCustomerToken() !== token) {
          setBookings([]);
          setSettings(null);

          router.replace(
            "/login?next=%2Fmy-bookings"
          );
        }
      } finally {
        if (isCurrentRequest()) {
          loadingLock.current = false;

          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [router]
  );

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    mounted.current = true;

    void loadBookings();

    return () => {
      mounted.current = false;

      loadRequest.current++;

      loadingLock.current = false;
    };
  }, [loadBookings]);

  // ========================================
  // BOOKING FILTERS
  // ========================================

  const filteredBookings = useMemo(
    () =>
      filter === "all"
        ? bookings
        : bookings.filter(
            (booking) =>
              booking.status === filter
          ),
    [bookings, filter]
  );

  // ========================================
  // BOOKING COUNTS
  // ========================================

  const counts = useMemo(() => {
    const result = {
      total: bookings.length,
      pending: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
    };

    for (const booking of bookings) {
      if (
        progressStatuses.includes(
          booking.status
        ) ||
        booking.status === "rejected" ||
        booking.status === "cancelled"
      ) {
        result[booking.status]++;
      }
    }

    return result;
  }, [bookings]);

  // ========================================
  // SUMMARY CARDS
  // ========================================

  const summaryCards = [
    {
      label: "Total Bookings",
      value: counts.total,
      color: "text-slate-900",
    },
    {
      label: "Pending",
      value: counts.pending,
      color: "text-amber-600",
    },
    {
      label: "Confirmed",
      value: counts.confirmed,
      color: "text-emerald-600",
    },
    {
      label: "In Progress",
      value: counts.in_progress,
      color: "text-blue-600",
    },
    {
      label: "Completed",
      value: counts.completed,
      color: "text-green-600",
    },
  ];

  // ========================================
  // CANCEL BOOKING
  // ========================================

  async function handleCancel(
    booking: Booking
  ) {
    if (
      cancelLock.current ||
      loadingLock.current ||
      busy ||
      !canCancelBooking(
        booking,
        settings?.allowCancellation === true
      )
    ) {
      return;
    }

    const token = getCustomerToken();

    if (!token) {
      router.replace(
        "/login?next=%2Fmy-bookings"
      );

      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel booking #${booking.id}?`
    );

    if (!confirmed) return;

    cancelLock.current = true;

    setCancellingId(booking.id);
    setError("");
    setMessage("");
    setSettingsError("");

    try {
      // Recheck latest admin
      // cancellation policy.

      const { settings: latestSettings } =
        await getPublicSettings().catch(
          (err) => {
            if (mounted.current) {
              setSettings(null);

              setSettingsError(
                "Unable to verify cancellation settings. Please refresh."
              );
            }

            throw err;
          }
        );

      if (!mounted.current) return;

      if (getCustomerToken() !== token) {
        throw new Error(
          "Customer session has changed. Please login again."
        );
      }

      setSettings(latestSettings);

      if (!latestSettings.allowCancellation) {
        throw new Error(
          "Booking cancellation is currently disabled. Please contact the rental provider."
        );
      }

      // Backend performs final cancellation
      // ownership and status validation.

      const response = await cancelBooking(
        booking.id
      );

      if (!mounted.current) return;

      if (getCustomerToken() !== token) {
        throw new Error(
          "Customer session has changed. Please login again."
        );
      }

      if (response.success !== true) {
        throw new Error(
          response.message ||
            "Unable to cancel booking"
        );
      }

      // Update booking status without
      // losing saved pickup location.

      setBookings((previous) =>
        previous.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                ...response.booking,

                vehicle:
                  response.booking?.vehicle ||
                  item.vehicle,

                status: "cancelled",
              }
            : item
        )
      );

      setMessage(
        response.message ||
          "Booking cancelled successfully"
      );

      // Refresh latest booking history.

      await loadBookings(true);

    } catch (err) {
      if (!mounted.current) return;

      if (getCustomerToken() !== token) {
        setBookings([]);
        setSettings(null);

        router.replace(
          "/login?next=%2Fmy-bookings"
        );

        return;
      }

      const cancellationError =
        getErrorMessage(
          err,
          "Failed to cancel booking"
        );

      // Refresh if admin changed
      // booking status or cancellation policy.

      await loadBookings(true);

      if (
        mounted.current &&
        getCustomerToken() === token
      ) {
        setError(cancellationError);
      }
    } finally {
      cancelLock.current = false;

      if (mounted.current) {
        setCancellingId(null);
      }
    }
  }

  // ========================================
  // REFRESH BOOKINGS
  // ========================================

  function handleRefresh() {
    if (
      busy ||
      cancelLock.current ||
      loadingLock.current
    ) {
      return;
    }

    setMessage("");

    void loadBookings(true);
  }

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-6xl space-y-6">

        {/* PAGE HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold text-[#102A36]">
              My Bookings
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View and manage your car and bike rentals.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy}
            className={secondaryButton}
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* SETTINGS ERROR */}

        {settingsError && (
          <div
            role="alert"
            className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700"
          >
            {settingsError}
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {message && (
          <div
            role="status"
            className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">

          {summaryCards.map(
            ({ label, value, color }) => (
              <div
                key={label}
                className={`${cardClass} p-4 sm:p-5`}
              >
                <p className="text-xs font-medium text-slate-500 sm:text-sm">
                  {label}
                </p>

                <p
                  className={`mt-2 text-3xl font-bold ${color}`}
                >
                  {value}
                </p>
              </div>
            )
          )}

        </div>

        {/* BOOKING STATUS FILTERS */}

        <div className="flex flex-wrap gap-2">

          {filters.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              aria-pressed={filter === status}
              className={`whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
                filter === status
                  ? "bg-[#155E75] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {status === "all"
                ? "All Bookings"
                : getBookingStatusLabel(status)}
            </button>
          ))}

        </div>

        {/* LOADING SKELETON */}

        {loading && (
          <div className="space-y-4">

            {[1, 2].map((item) => (
              <div
                key={item}
                className={`${cardClass} animate-pulse p-6`}
              >
                <div className="h-6 w-40 rounded bg-slate-200" />

                <div className="mt-5 h-32 rounded-xl bg-slate-100" />

                <div className="mt-5 h-24 rounded-xl bg-slate-100" />

                <div className="mt-5 h-10 rounded bg-slate-100" />
              </div>
            ))}

          </div>
        )}

        {/* EMPTY STATE */}

        {!loading &&
          !error &&
          filteredBookings.length === 0 && (
            <div className={`${cardClass} px-6 py-16 text-center`}>

              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFEFF]">

                <CalendarDays
                  size={28}
                  className="text-[#155E75]"
                />

              </div>

              <h2 className="text-xl font-bold text-[#102A36]">
                No bookings found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {filter === "all"
                  ? "You have not booked any vehicles yet."
                  : "No bookings match the selected status."}
              </p>

              {filter === "all" ? (
                <Link
                  href="/vehicles"
                  className="mt-6 inline-flex rounded-xl bg-[#155E75] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#104B5D]"
                >
                  Explore Vehicles
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="mt-6 rounded-xl bg-[#155E75] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#104B5D]"
                >
                  View All Bookings
                </button>
              )}

            </div>
          )}

        {/* BOOKING LIST */}

        {!loading &&
          filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              settings={settings}
              busy={busy}
              cancellingId={cancellingId}
              onCancel={(item) =>
                void handleCancel(item)
              }
            />
          ))}

      </div>
    </main>
  );
}