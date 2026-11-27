"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
  RefreshCw,
  XCircle,
  Car,
  Play,
  Check,
  MapPin,
  MapPinOff,
  Eye,
  X,
  LoaderCircle,
} from "lucide-react";

import {
  getAdminToken,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  type Booking,
  type BookingStatus,
  type BookingActionStatus,
} from "@/lib/api";

// ==========================================
// CONSTANTS
// ==========================================

const statusStyles: Record<BookingStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  in_progress: "bg-orange-50 text-orange-700",
  completed: "bg-blue-50 text-blue-700",
  rejected: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const statusLabels: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const currency = (value: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));

// ==========================================
// DATE HELPERS
// ==========================================

const getToday = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const canStartRental = (booking: Booking) => {
  const today = getToday();

  return (
    booking.status === "confirmed" &&
    today >= booking.startDate &&
    today < booking.endDate
  );
};

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  return error instanceof Error
    ? error.message
    : fallback;
}

// ==========================================
// STATUS BADGE
// ==========================================

function BookingStatusBadge({
  status,
}: {
  status: BookingStatus;
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        statusStyles[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {statusLabels[status] || "Unknown"}
    </span>
  );
}

// ==========================================
// PICKUP LOCATION COMPONENT
// ==========================================

function BookingLocation({
  booking,
  detailed = false,
}: {
  booking: Booking;
  detailed?: boolean;
}) {
  // Use the saved booking snapshot only.
  // Never use the current vehicle location.

  const location = booking.pickupLocation;

  if (!location) {
    return (
      <div
        className={
          detailed
            ? "rounded-xl border border-slate-200 bg-slate-50 p-4"
            : ""
        }
      >
        <div className="flex items-start gap-2">
          <MapPinOff
            size={17}
            className="mt-0.5 shrink-0 text-slate-400"
          />

          <div>
            <p className="text-xs font-medium text-slate-500">
              Location not recorded
            </p>

            {detailed && (
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                This booking was created before
                pickup location integration.
                Please verify pickup and return
                arrangements with the customer
                if the booking is still active.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        detailed
          ? "rounded-xl border border-amber-200 bg-amber-50 p-4"
          : "min-w-[170px] max-w-[240px]"
      }
    >
      <div className="flex items-start gap-2">
        <MapPin
          size={detailed ? 21 : 16}
          className="mt-0.5 shrink-0 text-amber-600"
        />

        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-slate-900">
            {location.name}
          </p>

          <p className="mt-1 break-words text-xs text-slate-500">
            {location.city}
          </p>

          {detailed && (
            <>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                {location.address}
              </p>

              <p className="mt-3 text-xs font-medium text-amber-700">
                Pickup and return at the same location
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Location ID: #{location.id}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BOOKING DETAILS FIELD
// ==========================================

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value === null ||
        value === undefined ||
        value === ""
          ? "Not provided"
          : value}
      </p>
    </div>
  );
}

// ==========================================
// BOOKING DETAILS MODAL
// ==========================================

function BookingDetailsModal({
  booking,
  loading,
  error,
  onClose,
  onRetry,
}: {
  booking: Booking;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
}) {
  const dialogRef =
    useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      if (dialog.open) {
        dialog.close();
      }

      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="booking-details-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50"
    >
      {/* MODAL HEADER */}

      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
        <div>
          <h2
            id="booking-details-title"
            className="text-xl font-bold"
          >
            Booking #{booking.id}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Rental booking information
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close booking details"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <X size={22} />
        </button>
      </div>

      {/* MODAL CONTENT */}

      <div className="max-h-[65dvh] space-y-5 overflow-y-auto p-5 sm:p-6">
        {loading && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-500"
          >
            <LoaderCircle
              size={17}
              className="animate-spin"
            />

            Loading latest booking details...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 p-4"
          >
            <p className="text-sm text-red-700">
              {error}
            </p>

            <p className="mt-1 text-xs text-red-600">
              Showing previously loaded booking
              information.
            </p>

            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* BOOKING STATUS */}

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-600">
            Booking Status
          </p>

          <BookingStatusBadge
            status={booking.status}
          />
        </div>

        {/* CUSTOMER DETAILS */}

        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="mb-4 text-sm font-bold">
            Customer Information
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailField
              label="Customer ID"
              value={`#${booking.userId}`}
            />

            <DetailField
              label="Customer Name"
              value={booking.contactName}
            />

            <DetailField
              label="Phone Number"
              value={booking.contactPhone}
            />

            <DetailField
              label="Email Address"
              value={booking.contactEmail}
            />
          </div>
        </section>

        {/* RENTAL DETAILS */}

        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="mb-4 text-sm font-bold">
            Rental Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <DetailField
              label="Vehicle ID"
              value={`#${booking.vehicleId}`}
            />

            <DetailField
              label="Rental Duration"
              value={`${booking.totalDays} ${
                booking.totalDays === 1
                  ? "Day"
                  : "Days"
              }`}
            />

            <DetailField
              label="Pickup Date"
              value={booking.startDate}
            />

            <DetailField
              label="Return Date"
              value={booking.endDate}
            />

            <DetailField
              label="Total Rental Amount"
              value={currency(booking.totalAmount)}
            />

            <DetailField
              label="Booked On"
              value={new Date(
                booking.createdAt
              ).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}
            />
          </div>
        </section>

        {/* PICKUP AND RETURN LOCATION */}

        <section>
          <h3 className="mb-3 text-sm font-bold">
            Pickup & Return Location
          </h3>

          <BookingLocation
            booking={booking}
            detailed
          />
        </section>

      </div>

      {/* MODAL FOOTER */}

      <div className="flex justify-end border-t border-slate-200 px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}

// ==========================================
// BOOKING MANAGEMENT PAGE
// ==========================================

export default function BookingManagementPage() {
  const router = useRouter();

  // ========================================
  // STATE
  // ========================================

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<number | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [locationFilter, setLocationFilter] =
    useState("all");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  // Booking details modal state.

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState("");

  // ========================================
  // REQUEST LOCKS
  // ========================================

  const mounted = useRef(false);

  const loadRequest = useRef(0);

  const detailsRequest = useRef(0);

  const loadingLock = useRef(false);

  const mutationLock = useRef(false);

  const actionsDisabled =
    updatingId !== null ||
    loading ||
    refreshing;

  // ========================================
  // LOAD BOOKINGS
  // ========================================

  const loadBookings = useCallback(
    async (refresh = false) => {
      const token = getAdminToken();

      if (!token) {
        setBookings([]);
        setSelectedBooking(null);
        router.replace("/login");
        return;
      }

      const requestId =
        ++loadRequest.current;

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

      try {
        // Use the validated booking API.

        const response =
          await getAllBookings();

        if (!isCurrentRequest()) return;

        if (getAdminToken() !== token) {
          setBookings([]);
          setSelectedBooking(null);
          router.replace("/login");
          return;
        }

        const bookingList =
          response.bookings ??
          response.data ??
          [];

        setBookings(
          [...bookingList].sort(
            (a, b) => b.id - a.id
          )
        );

      } catch (err) {
        if (!isCurrentRequest()) return;

        if (getAdminToken() !== token) {
          setBookings([]);
          setSelectedBooking(null);
          router.replace("/login");
          return;
        }

        const errorMessage =
          getErrorMessage(
            err,
            "Failed to load bookings"
          );

        setError(errorMessage);

        if (
          errorMessage.includes(
            "Session expired"
          )
        ) {
          setBookings([]);
          setSelectedBooking(null);
          router.replace("/login");
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
      detailsRequest.current++;

      loadingLock.current = false;
    };
  }, [loadBookings]);

  // ========================================
  // LOCATION FILTER OPTIONS
  // ========================================

  const locationOptions = useMemo(() => {
    const locations = new Map<
      number,
      {
        id: number;
        name: string;
        city: string;
      }
    >();

    for (const booking of bookings) {
      const location =
        booking.pickupLocation;

      if (
        location &&
        !locations.has(location.id)
      ) {
        locations.set(location.id, {
          id: location.id,
          name: location.name,
          city: location.city,
        });
      }
    }

    return Array.from(
      locations.values()
    ).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [bookings]);

  const hasUnrecordedLocations =
    bookings.some(
      (booking) =>
        booking.pickupLocation === null
    );

  // ========================================
  // SEARCH AND FILTER
  // ========================================

  const filteredBookings = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "all" ||
        booking.status === statusFilter;

      const matchesLocation =
        locationFilter === "all" ||
        (
          locationFilter === "unrecorded" &&
          booking.pickupLocation === null
        ) ||
        (
          booking.locationId !== null &&
          String(booking.locationId) ===
            locationFilter
        );

      const matchesSearch =
        !query ||
        [
          String(booking.id),
          String(booking.vehicleId),
          String(booking.userId),
          booking.contactName ?? "",
          booking.contactPhone ?? "",
          booking.contactEmail ?? "",
          booking.pickupLocation?.name ?? "",
          booking.pickupLocation?.city ?? "",
          booking.pickupLocation?.address ?? "",
        ].some((value) =>
          value.toLowerCase().includes(query)
        );

      return (
        matchesStatus &&
        matchesLocation &&
        matchesSearch
      );
    });
  }, [
    bookings,
    search,
    statusFilter,
    locationFilter,
  ]);

  // ========================================
  // BOOKING COUNTS
  // ========================================

  const counts = useMemo(
    () => ({
      total: bookings.length,

      pending: bookings.filter(
        (b) => b.status === "pending"
      ).length,

      confirmed: bookings.filter(
        (b) => b.status === "confirmed"
      ).length,

      inProgress: bookings.filter(
        (b) => b.status === "in_progress"
      ).length,

      completed: bookings.filter(
        (b) => b.status === "completed"
      ).length,
    }),
    [bookings]
  );

  // ========================================
  // VIEW BOOKING DETAILS
  // ========================================

  async function openBookingDetails(
    booking: Booking
  ) {
    const token = getAdminToken();

    if (!token) {
      setBookings([]);
      setSelectedBooking(null);
      router.replace("/login");
      return;
    }

    const requestId =
      ++detailsRequest.current;

    const isCurrentRequest = () =>
      mounted.current &&
      requestId === detailsRequest.current;

    // Display existing data immediately
    // while loading the latest details.

    setSelectedBooking(booking);
    setDetailsLoading(true);
    setDetailsError("");

    try {
      const response =
        await getBookingById(booking.id);

      if (!isCurrentRequest()) return;

      if (getAdminToken() !== token) {
        setBookings([]);
        setSelectedBooking(null);
        router.replace("/login");
        return;
      }

      setSelectedBooking(
        response.booking
      );

      // Keep the table synchronized.

      setBookings((previous) =>
        previous.map((item) =>
          item.id === booking.id
            ? response.booking
            : item
        )
      );

    } catch (err) {
      if (!isCurrentRequest()) return;

      if (getAdminToken() !== token) {
        setBookings([]);
        setSelectedBooking(null);
        router.replace("/login");
        return;
      }

      setDetailsError(
        getErrorMessage(
          err,
          "Failed to load booking details"
        )
      );
    } finally {
      if (isCurrentRequest()) {
        setDetailsLoading(false);
      }
    }
  }

  function closeBookingDetails() {
    detailsRequest.current++;

    setSelectedBooking(null);
    setDetailsLoading(false);
    setDetailsError("");
  }

  // ========================================
  // UPDATE BOOKING STATUS
  // ========================================

  async function changeStatus(
    booking: Booking,
    status: BookingActionStatus
  ) {
    if (
      actionsDisabled ||
      mutationLock.current ||
      loadingLock.current
    ) {
      return;
    }

    const allowed =
      (
        booking.status === "pending" &&
        ["confirmed", "rejected"].includes(
          status
        )
      ) ||
      (
        booking.status === "confirmed" &&
        status === "in_progress"
      ) ||
      (
        booking.status === "in_progress" &&
        status === "completed"
      );

    if (!allowed) {
      setError(
        "This booking status transition is not allowed."
      );

      return;
    }

    // Prevent confirming an expired
    // pickup date.

    if (
      status === "confirmed" &&
      booking.startDate < getToday()
    ) {
      setError(
        "Cannot confirm a booking with a past pickup date."
      );

      return;
    }

    // Prevent starting rental outside
    // the booking period.

    if (
      status === "in_progress" &&
      !canStartRental(booking)
    ) {
      setError(
        "Rental can only start within the booking period."
      );

      return;
    }

    const confirmationMessages: Record<
      BookingActionStatus,
      string
    > = {
      confirmed:
        `Confirm booking #${booking.id}?`,

      rejected:
        `Reject booking #${booking.id}?`,

      in_progress:
        `Start rental for booking #${booking.id}? ` +
        "Confirm that the vehicle has been handed over to the customer.",

      completed:
        `Complete rental for booking #${booking.id}? ` +
        "Confirm that the customer has returned the vehicle.",
    };

    const location = booking.pickupLocation;

    const locationMessage = location
      ? `\n\nPickup & Return Location:\n${location.name}\n${location.address}`
      : "\n\nPickup location was not recorded for this booking.";

    const includeLocation =
      status === "confirmed" ||
      status === "in_progress" ||
      status === "completed";

    if (
      !window.confirm(
        confirmationMessages[status] +
          (
            includeLocation
              ? locationMessage
              : ""
          )
      )
    ) {
      return;
    }

    const token = getAdminToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    mutationLock.current = true;

    setUpdatingId(booking.id);
    setError("");
    setMessage("");

    try {
      // Use the validated booking
      // status update API.

      const response =
        await updateBookingStatus(
          booking.id,
          status
        );

      if (!mounted.current) return;

      if (getAdminToken() !== token) {
        setBookings([]);
        setSelectedBooking(null);
        router.replace("/login");
        return;
      }

      // Preserve the complete booking
      // including saved location snapshot.

      setBookings((previous) =>
        previous.map((item) =>
          item.id === booking.id
            ? response.booking
            : item
        )
      );

      setSelectedBooking((previous) =>
        previous?.id === booking.id
          ? response.booking
          : previous
      );

      setMessage(
        response.message ||
          `Booking #${booking.id} updated successfully.`
      );

      await loadBookings(true);

    } catch (err) {
      if (!mounted.current) return;

      if (getAdminToken() !== token) {
        setBookings([]);
        setSelectedBooking(null);
        router.replace("/login");
        return;
      }

      const errorMessage =
        getErrorMessage(
          err,
          "Failed to update booking"
        );

      // Refresh because the server may
      // already have applied the update.

      await loadBookings(true);

      if (
        mounted.current &&
        getAdminToken() === token
      ) {
        setError(errorMessage);
      }
    } finally {
      mutationLock.current = false;

      if (mounted.current) {
        setUpdatingId(null);
      }
    }
  }

  // ========================================
  // REFRESH AND CLEAR FILTERS
  // ========================================

  function handleRefresh() {
    if (
      actionsDisabled ||
      loadingLock.current ||
      mutationLock.current
    ) {
      return;
    }

    setMessage("");

    void loadBookings(true);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setLocationFilter("all");
  }

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    locationFilter !== "all";

  // ========================================
  // SUMMARY CARDS
  // ========================================

  const summaryCards = [
    {
      label: "Total Bookings",
      value: counts.total,
      icon: CalendarDays,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Pending",
      value: counts.pending,
      icon: Clock3,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Confirmed",
      value: counts.confirmed,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "In Progress",
      value: counts.inProgress,
      icon: Car,
      color: "bg-orange-50 text-orange-600",
    },
    {
      label: "Completed",
      value: counts.completed,
      icon: CheckCircle2,
      color: "bg-blue-50 text-blue-600",
    },
  ];

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <main className="min-h-full bg-slate-100 p-4 text-slate-900 md:p-6 lg:p-8">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* PAGE HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Booking Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review and manage all car and bike
              rental bookings.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={actionsDisabled}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div
                  className={`inline-flex rounded-xl p-3 ${card.color}`}
                >
                  <Icon size={21} />
                </div>

                <p className="mt-4 text-sm text-slate-500">
                  {card.label}
                </p>

                <p className="mt-1 text-3xl font-bold">
                  {card.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* SEARCH AND FILTERS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4">

          <div className="flex flex-wrap items-center gap-3">

            {/* SEARCH */}

            <div className="relative min-w-0 flex-1 basis-full xl:basis-64">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                aria-label="Search bookings"
                placeholder="Search booking, customer or location"
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-amber-500"
              />
            </div>

            {/* STATUS FILTER */}

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              aria-label="Filter by booking status"
              className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500"
            >
              <option value="all">
                All Statuses
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="confirmed">
                Confirmed
              </option>

              <option value="in_progress">
                In Progress
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>

            {/* LOCATION FILTER */}

            <div className="relative min-w-0 max-w-full">
              <MapPin
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={locationFilter}
                onChange={(event) =>
                  setLocationFilter(
                    event.target.value
                  )
                }
                aria-label="Filter by pickup location"
                className="max-w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm outline-none focus:border-amber-500"
              >
                <option value="all">
                  All Locations
                </option>

                {locationOptions.map(
                  (location) => (
                    <option
                      key={location.id}
                      value={String(location.id)}
                    >
                      {location.name} — {location.city}
                    </option>
                  )
                )}

                {hasUnrecordedLocations && (
                  <option value="unrecorded">
                    Location not recorded
                  </option>
                )}
              </select>
            </div>

            {/* CLEAR FILTERS */}

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <X size={15} />

                Clear
              </button>
            )}

          </div>

          <p className="mt-4 text-xs text-slate-500">
            Showing {filteredBookings.length} of{" "}
            {bookings.length} bookings
          </p>
        </div>

        {/* BOOKINGS TABLE */}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">

          <table className="w-full min-w-[1250px] text-left text-sm">

            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">
                  Booking
                </th>

                <th className="p-4">
                  Customer
                </th>

                <th className="p-4">
                  Vehicle
                </th>

                <th className="p-4">
                  Pickup Location
                </th>

                <th className="p-4">
                  Rental Dates
                </th>

                <th className="p-4">
                  Days
                </th>

                <th className="p-4">
                  Amount
                </th>

                <th className="p-4">
                  Status
                </th>

                <th className="p-4">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                filteredBookings.map((booking) => {
                  const isUpdating =
                    updatingId === booking.id;

                  const canStart =
                    canStartRental(booking);

                  const today = getToday();

                  return (
                    <tr
                      key={booking.id}
                      className="border-t border-slate-100 align-top hover:bg-slate-50/50"
                    >

                      {/* BOOKING ID */}

                      <td className="whitespace-nowrap p-4 font-semibold">
                        #{booking.id}
                      </td>

                      {/* CUSTOMER */}

                      <td className="p-4">
                        <p className="font-medium">
                          {booking.contactName ||
                            `Customer #${booking.userId}`}
                        </p>

                        {booking.contactPhone && (
                          <p className="mt-1 text-xs text-slate-500">
                            {booking.contactPhone}
                          </p>
                        )}
                      </td>

                      {/* VEHICLE */}

                      <td className="whitespace-nowrap p-4">
                        Vehicle #{booking.vehicleId}
                      </td>

                      {/* PICKUP LOCATION */}

                      <td className="p-4">
                        <BookingLocation
                          booking={booking}
                        />
                      </td>

                      {/* RENTAL DATES */}

                      <td className="whitespace-nowrap p-4">
                        <p>{booking.startDate}</p>

                        <p className="mt-1 text-slate-400">
                          to {booking.endDate}
                        </p>
                      </td>

                      {/* TOTAL DAYS */}

                      <td className="p-4">
                        {booking.totalDays}
                      </td>

                      {/* TOTAL AMOUNT */}

                      <td className="whitespace-nowrap p-4 font-semibold">
                        {currency(
                          booking.totalAmount
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="p-4">
                        <BookingStatusBadge
                          status={booking.status}
                        />
                      </td>

                      {/* ACTION BUTTONS */}

                      <td className="min-w-[200px] p-4">

                        <div className="flex flex-wrap gap-2">

                          {/* VIEW DETAILS */}

                          <button
                            type="button"
                            onClick={() =>
                              void openBookingDetails(
                                booking
                              )
                            }
                            disabled={actionsDisabled}
                            className="flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                          >
                            <Eye size={14} />

                            View Details
                          </button>

                          {/* PENDING BOOKINGS */}

                          {booking.status ===
                            "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void changeStatus(
                                    booking,
                                    "confirmed"
                                  )
                                }
                                disabled={
                                  actionsDisabled ||
                                  booking.startDate <
                                    today
                                }
                                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {isUpdating
                                  ? "Updating..."
                                  : "Confirm"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void changeStatus(
                                    booking,
                                    "rejected"
                                  )
                                }
                                disabled={actionsDisabled}
                                className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                              >
                                <XCircle size={14} />

                                Reject
                              </button>
                            </>
                          )}

                          {/* CONFIRMED BOOKINGS */}

                          {booking.status ===
                            "confirmed" && (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() =>
                                  void changeStatus(
                                    booking,
                                    "in_progress"
                                  )
                                }
                                disabled={
                                  actionsDisabled ||
                                  !canStart
                                }
                                className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Play size={14} />

                                {isUpdating
                                  ? "Starting..."
                                  : "Start Rental"}
                              </button>

                              {!canStart && (
                                <p className="text-[11px] text-slate-500">
                                  {today <
                                  booking.startDate
                                    ? `Pickup: ${booking.startDate}`
                                    : "Booking period ended"}
                                </p>
                              )}
                            </div>
                          )}

                          {/* ACTIVE RENTALS */}

                          {booking.status ===
                            "in_progress" && (
                            <button
                              type="button"
                              onClick={() =>
                                void changeStatus(
                                  booking,
                                  "completed"
                                )
                              }
                              disabled={actionsDisabled}
                              className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              <Check size={14} />

                              {isUpdating
                                ? "Completing..."
                                : "Complete Rental"}
                            </button>
                          )}

                          {/* FINISHED BOOKINGS */}

                          {[
                            "completed",
                            "rejected",
                            "cancelled",
                          ].includes(
                            booking.status
                          ) && (
                            <span className="self-center text-xs text-slate-400">
                              No status actions
                            </span>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          {/* LOADING STATE */}

          {loading && (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
              <LoaderCircle
                size={19}
                className="animate-spin"
              />

              Loading bookings...
            </div>
          )}

          {/* EMPTY STATE */}

          {!loading &&
            !error &&
            filteredBookings.length === 0 && (
              <div className="p-10 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <CalendarDays
                    size={25}
                    className="text-slate-400"
                  />
                </div>

                <h3 className="mt-4 font-semibold">
                  No bookings found
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  {hasFilters
                    ? "No bookings match the selected filters."
                    : "Customer bookings will appear here."}
                </p>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-600"
                  >
                    Clear Filters
                  </button>
                )}

              </div>
            )}

        </div>

      </div>

      {/* BOOKING DETAILS MODAL */}

      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          loading={detailsLoading}
          error={detailsError}
          onClose={closeBookingDetails}
          onRetry={() =>
            void openBookingDetails(
              selectedBooking
            )
          }
        />
      )}

    </main>
  );
}