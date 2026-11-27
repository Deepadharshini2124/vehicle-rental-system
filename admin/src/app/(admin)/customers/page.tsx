
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Users,
  UserCheck,
  UserX,
  Search,
  RefreshCw,
  X,
  CalendarDays,
  Mail,
  Phone,
  MapPin,
  Eye,
  ShieldCheck,
  ShieldOff,
  UserRound,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  Car,
} from "lucide-react";

import {
  getAdminToken,
  getCustomers,
  getCustomerDetails,
  updateCustomerStatus,
  formatCurrency,
  formatDate,
  getBookingStatusLabel,
  type Customer,
  type Booking,
  type BookingStatus,
} from "@/lib/api";

// ==========================================
// TYPES
// ==========================================

type CustomerStatus = Customer["status"];

type StatusFilter =
  | "all"
  | CustomerStatus;

type BookingFilter =
  | "all"
  | BookingStatus;

// ==========================================
// STATUS LABELS
// ==========================================

function getCustomerStatusLabel(
  status: CustomerStatus
) {
  switch (status) {
    case "active":
      return "Active";

    case "blocked":
      return "Blocked";

    case "legacy":
      return "Legacy";

    default:
      return "Unknown";
  }
}

// ==========================================
// CUSTOMER STATUS BADGE
// ==========================================

function CustomerStatusBadge({
  status,
}: {
  status: CustomerStatus;
}) {
  const colors: Record<string, string> = {
    active:
      "bg-emerald-100 text-emerald-700",

    blocked:
      "bg-red-100 text-red-700",

    legacy:
      "bg-amber-100 text-amber-700",

    unknown:
      "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
        colors[status] ||
        colors.unknown
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {getCustomerStatusLabel(status)}
    </span>
  );
}

// ==========================================
// BOOKING STATUS BADGE
// ==========================================

function BookingStatusBadge({
  status,
}: {
  status: BookingStatus;
}) {
  const colors: Record<
    BookingStatus,
    string
  > = {
    pending:
      "bg-amber-100 text-amber-700",

    confirmed:
      "bg-blue-100 text-blue-700",

    in_progress:
      "bg-orange-100 text-orange-700",

    completed:
      "bg-green-100 text-green-700",

    rejected:
      "bg-red-100 text-red-700",

    cancelled:
      "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
        colors[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {getBookingStatusLabel(status)}
    </span>
  );
}

// ==========================================
// CUSTOMER AVATAR
// ==========================================

function CustomerAvatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  const initials = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700 ${
        large
          ? "h-16 w-16 text-xl"
          : "h-11 w-11 text-sm"
      }`}
    >
      {initials || <UserRound size={20} />}
    </div>
  );
}

// ==========================================
// STAT CARD
// ==========================================

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  style,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Users;
  style: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`inline-flex rounded-xl p-3 ${style}`}
      >
        <Icon size={22} />
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

// ==========================================
// CUSTOMER BOOKING STAT CARD
// ==========================================

function BookingStatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${color}`}
      >
        {value}
      </p>
    </div>
  );
}

// ==========================================
// MAIN CUSTOMER PAGE
// ==========================================

export default function CustomersPage() {
  const router = useRouter();

  // ========================================
  // CUSTOMER STATES
  // ========================================

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [updatingId, setUpdatingId] =
    useState<number | null>(null);

  // ========================================
  // CUSTOMER DETAILS STATES
  // ========================================

  const [
    selectedCustomer,
    setSelectedCustomer,
  ] = useState<Customer | null>(null);

  const [
    customerBookings,
    setCustomerBookings,
  ] = useState<Booking[]>([]);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    detailsError,
    setDetailsError,
  ] = useState("");

  const [
    bookingFilter,
    setBookingFilter,
  ] = useState<BookingFilter>("all");

  // Prevent outdated API responses
  // from reopening or replacing details.

  const detailsRequestId = useRef(0);

  const busy =
    loading ||
    refreshing ||
    updatingId !== null;

  // ========================================
  // LOAD CUSTOMERS
  // ========================================

  const loadCustomers = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        if (!getAdminToken()) {
          router.replace("/login");
          return;
        }

        const response =
          await getCustomers();

        if (
          !response.success ||
          !Array.isArray(response.customers)
        ) {
          throw new Error(
            "Invalid customer list response"
          );
        }

        setCustomers(response.customers);
      } catch (err) {
        if (!getAdminToken()) {
          router.replace("/login");
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load customers"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  // ========================================
  // CUSTOMER STATISTICS
  // ========================================

  const stats = useMemo(() => {
    return {
      total: customers.length,

      active: customers.filter(
        (customer) =>
          customer.status === "active"
      ).length,

      blocked: customers.filter(
        (customer) =>
          customer.status === "blocked"
      ).length,

      legacy: customers.filter(
        (customer) =>
          customer.status === "legacy"
      ).length,

      unknown: customers.filter(
        (customer) =>
          customer.status !== "active" &&
          customer.status !== "blocked" &&
          customer.status !== "legacy"
      ).length,
    };
  }, [customers]);

  // ========================================
  // SEARCH AND FILTER
  // ========================================

  const filteredCustomers = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !query ||
        [
          customer.id,
          customer.name,
          customer.email,
          customer.phone,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query)
        );

      const matchesStatus =
        statusFilter === "all" ||
        customer.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    customers,
    search,
    statusFilter,
  ]);

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  // ========================================
  // VIEW CUSTOMER DETAILS
  // ========================================

  async function viewCustomer(
    customer: Customer
  ) {
    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    const requestId =
      ++detailsRequestId.current;

    setSelectedCustomer(customer);
    setCustomerBookings([]);
    setBookingFilter("all");

    setDetailsLoading(true);
    setDetailsError("");

    try {
      const response =
        await getCustomerDetails(
          customer.id
        );

      if (
        requestId !==
        detailsRequestId.current
      ) {
        return;
      }

      if (
        !response.success ||
        !response.customer ||
        response.customer.id !==
          customer.id ||
        !Array.isArray(response.bookings)
      ) {
        throw new Error(
          "Invalid customer details response"
        );
      }

      setSelectedCustomer(
        response.customer
      );

      setCustomerBookings(
        [...response.bookings].sort(
          (a, b) => b.id - a.id
        )
      );
    } catch (err) {
      if (
        requestId !==
        detailsRequestId.current
      ) {
        return;
      }

      if (!getAdminToken()) {
        router.replace("/login");
        return;
      }

      setDetailsError(
        err instanceof Error
          ? err.message
          : "Failed to fetch customer details"
      );
    } finally {
      if (
        requestId ===
        detailsRequestId.current
      ) {
        setDetailsLoading(false);
      }
    }
  }

  // ========================================
  // CLOSE CUSTOMER DETAILS
  // ========================================

  const closeDetails = useCallback(() => {
    detailsRequestId.current += 1;

    setSelectedCustomer(null);
    setCustomerBookings([]);
    setDetailsLoading(false);
    setDetailsError("");
    setBookingFilter("all");
  }, []);

  const isDetailsOpen =
    selectedCustomer !== null;

  // Close modal using Escape.
  // Prevent background scrolling.

  useEffect(() => {
    if (!isDetailsOpen) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        closeDetails();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isDetailsOpen,
    closeDetails,
  ]);

  // ========================================
  // BLOCK / UNBLOCK CUSTOMER
  // ========================================

  async function changeStatus(
    customer: Customer
  ) {
    if (busy || detailsLoading) {
      return;
    }

    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    if (
      customer.userId == null ||
      (
        customer.status !== "active" &&
        customer.status !== "blocked"
      )
    ) {
      setError(
        "This customer does not have a manageable login account."
      );

      return;
    }

    const nextStatus:
      | "active"
      | "blocked" =
      customer.status === "active"
        ? "blocked"
        : "active";

    const confirmationMessage =
      nextStatus === "blocked"
        ? `Block ${customer.name}?\n\nThis customer will lose account access. Existing bookings will not be cancelled automatically.`
        : `Unblock ${customer.name}?\n\nThis customer will regain account access.`;

    if (
      !window.confirm(
        confirmationMessage
      )
    ) {
      return;
    }

    try {
      setUpdatingId(customer.id);
      setError("");
      setMessage("");

      const response =
        await updateCustomerStatus(
          customer.id,
          nextStatus
        );

      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                status: nextStatus,
              }
            : item
        )
      );

      setSelectedCustomer((current) =>
        current?.id === customer.id
          ? {
              ...current,
              status: nextStatus,
            }
          : current
      );

      setMessage(
        response.message ||
          (
            nextStatus === "blocked"
              ? "Customer blocked successfully"
              : "Customer unblocked successfully"
          )
      );

      await loadCustomers(true);
    } catch (err) {
      if (!getAdminToken()) {
        router.replace("/login");
        return;
      }

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to update customer status";

      setError(errorMessage);

      if (
        selectedCustomer?.id ===
        customer.id
      ) {
        setDetailsError(errorMessage);
      }
    } finally {
      setUpdatingId(null);
    }
  }

  // ========================================
  // CUSTOMER BOOKING STATISTICS
  // ========================================

  const bookingStats = useMemo(() => {
    return {
      total: customerBookings.length,

      pending: customerBookings.filter(
        (booking) =>
          booking.status === "pending"
      ).length,

      confirmed: customerBookings.filter(
        (booking) =>
          booking.status === "confirmed"
      ).length,

      active: customerBookings.filter(
        (booking) =>
          booking.status === "in_progress"
      ).length,

      completed: customerBookings.filter(
        (booking) =>
          booking.status === "completed"
      ).length,

      cancelled: customerBookings.filter(
        (booking) =>
          booking.status === "cancelled"
      ).length,

      rejected: customerBookings.filter(
        (booking) =>
          booking.status === "rejected"
      ).length,
    };
  }, [customerBookings]);

  // ========================================
  // COMPLETED RENTAL VALUE
  // ========================================

  const completedRentalValue =
    useMemo(() => {
      return customerBookings
        .filter(
          (booking) =>
            booking.status === "completed"
        )
        .reduce((total, booking) => {
          const amount = Number(
            booking.totalAmount
          );

          return total + (
            Number.isFinite(amount)
              ? amount
              : 0
          );
        }, 0);
    }, [customerBookings]);

  // ========================================
  // FILTER CUSTOMER BOOKINGS
  // ========================================

  const filteredBookings = useMemo(() => {
    if (bookingFilter === "all") {
      return customerBookings;
    }

    return customerBookings.filter(
      (booking) =>
        booking.status === bookingFilter
    );
  }, [
    customerBookings,
    bookingFilter,
  ]);

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <main className="min-h-full bg-slate-100 p-4 text-slate-900 md:p-6">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* ================================
            PAGE HEADER
        ================================ */}

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Customer Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage registered customers,
              account access and rental history.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadCustomers(true)
            }
            disabled={busy}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50"
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
        </header>

        {/* ================================
            ERROR MESSAGE
        ================================ */}

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                size={18}
                className="shrink-0"
              />

              {error}
            </div>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ================================
            SUCCESS MESSAGE
        ================================ */}

        {message && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />

              {message}
            </div>

            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setMessage("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* ================================
            CUSTOMER STATISTICS
        ================================ */}

        {!loading && (
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">

            <StatCard
              title="Total Customers"
              value={stats.total}
              description="All customer records"
              icon={Users}
              style="bg-blue-100 text-blue-700"
            />

            <StatCard
              title="Active Customers"
              value={stats.active}
              description="Account access enabled"
              icon={UserCheck}
              style="bg-emerald-100 text-emerald-700"
            />

            <StatCard
              title="Blocked Customers"
              value={stats.blocked}
              description="Account access restricted"
              icon={UserX}
              style="bg-red-100 text-red-700"
            />

            <StatCard
              title="Other Customers"
              value={
                stats.legacy +
                stats.unknown
              }
              description={`${stats.legacy} Legacy · ${stats.unknown} Unknown`}
              icon={UserRound}
              style="bg-amber-100 text-amber-700"
            />

          </section>
        )}

        {/* ================================
            CUSTOMER LIST
        ================================ */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* LIST HEADER */}

          <div className="border-b border-slate-100 p-5">

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  All Customers
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {loading
                    ? "Loading customers..."
                    : `Showing ${filteredCustomers.length} of ${customers.length} customers`}
                </p>
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* SEARCH AND STATUS FILTER */}

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">

              <div className="relative md:col-span-2">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  aria-label="Search customers"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search name, email, phone or customer ID..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <select
                aria-label="Filter customer status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as StatusFilter
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">
                  All Statuses
                </option>

                <option value="active">
                  Active
                </option>

                <option value="blocked">
                  Blocked
                </option>

                <option value="legacy">
                  Legacy
                </option>

                <option value="unknown">
                  Unknown
                </option>
              </select>

            </div>
          </div>

          {/* ==============================
              LOADING STATE
          ============================== */}

          {loading ? (
            <div className="flex min-h-60 flex-col items-center justify-center p-8">
              <RefreshCw
                size={28}
                className="animate-spin text-blue-600"
              />

              <p className="mt-4 text-sm text-slate-500">
                Loading customers...
              </p>
            </div>
          ) : filteredCustomers.length === 0 ? (

            /* ============================
                EMPTY STATE
            ============================ */

            <div className="flex min-h-60 flex-col items-center justify-center p-8 text-center">

              <div className="rounded-2xl bg-slate-100 p-5 text-slate-400">
                <Users size={32} />
              </div>

              <h3 className="mt-4 font-bold">
                {error && customers.length === 0
                  ? "Unable to load customers"
                  : hasFilters
                    ? "No matching customers"
                    : "No customers registered"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {error && customers.length === 0
                  ? "Please refresh and try again."
                  : hasFilters
                    ? "Try a different search or status filter."
                    : "Registered customers will appear here."}
              </p>

              {error && customers.length === 0 ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void loadCustomers(true)
                  }
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Try Again
                </button>
              ) : hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Clear Filters
                </button>
              ) : null}

            </div>
          ) : (

            /* ============================
                CUSTOMER TABLE
            ============================ */

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">

                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-4">
                      Customer
                    </th>

                    <th className="px-5 py-4">
                      Contact Details
                    </th>

                    <th className="px-5 py-4">
                      Bookings
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredCustomers.map(
                    (customer) => {
                      const canManageStatus =
                        customer.userId != null &&
                        (
                          customer.status === "active" ||
                          customer.status === "blocked"
                        );

                      const isUpdating =
                        updatingId === customer.id;

                      return (
                        <tr
                          key={customer.id}
                          className="transition hover:bg-slate-50"
                        >

                          {/* CUSTOMER */}

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">

                              <CustomerAvatar
                                name={customer.name}
                              />

                              <div>
                                <p className="font-semibold text-slate-900">
                                  {customer.name}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Customer #{customer.id}
                                </p>

                                {customer.createdAt && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    Joined{" "}
                                    {formatDate(
                                      customer.createdAt
                                    )}
                                  </p>
                                )}
                              </div>

                            </div>
                          </td>

                          {/* CONTACT DETAILS */}

                          <td className="px-5 py-4">
                            <div className="space-y-2">

                              <p className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail
                                  size={14}
                                  className="shrink-0 text-slate-400"
                                />

                                {customer.email ||
                                  "No email"}
                              </p>

                              <p className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone
                                  size={14}
                                  className="shrink-0 text-slate-400"
                                />

                                {customer.phone ||
                                  "No phone"}
                              </p>

                            </div>
                          </td>

                          {/* TOTAL BOOKINGS */}

                          <td className="px-5 py-4">
                            <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700">
                              {customer.totalBookings ?? 0}
                            </span>
                          </td>

                          {/* CUSTOMER STATUS */}

                          <td className="px-5 py-4">
                            <CustomerStatusBadge
                              status={customer.status}
                            />
                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-2">

                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  void viewCustomer(
                                    customer
                                  )
                                }
                                className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                              >
                                <Eye size={15} />

                                View
                              </button>

                              {canManageStatus ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void changeStatus(
                                      customer
                                    )
                                  }
                                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                                    customer.status === "active"
                                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                      : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                  }`}
                                >
                                  {isUpdating ? (
                                    <RefreshCw
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : customer.status === "active" ? (
                                    <ShieldOff size={14} />
                                  ) : (
                                    <ShieldCheck size={14} />
                                  )}

                                  {isUpdating
                                    ? "Updating..."
                                    : customer.status === "active"
                                      ? "Block"
                                      : "Unblock"}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  No account action
                                </span>
                              )}

                            </div>
                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>
              </table>
            </div>
          )}

          {/* TABLE FOOTER */}

          {!loading && (
            <div className="border-t border-slate-100 p-4 text-xs text-slate-500">
              Showing {filteredCustomers.length} of{" "}
              {customers.length} customers
            </div>
          )}

        </section>

        {/* ACCOUNT INFORMATION */}

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <ShieldCheck size={18} />

            Customer Account Management
          </p>

          <p className="mt-2 text-xs leading-relaxed text-blue-700">
            Blocking a customer restricts account
            access. Existing bookings and rental
            records are retained. Legacy customers
            without linked login accounts cannot
            be blocked or unblocked.
          </p>
        </div>

      </div>

      {/* ==================================
          CUSTOMER DETAILS MODAL
      ================================== */}

      {selectedCustomer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm md:p-6"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDetails();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-details-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >

            {/* MODAL HEADER */}

            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2
                  id="customer-details-title"
                  className="text-xl font-bold"
                >
                  Customer Details
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Customer profile and rental history
                </p>
              </div>

              <button
                type="button"
                autoFocus
                onClick={closeDetails}
                aria-label="Close customer details"
                className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </header>

            {/* MODAL CONTENT */}

            <div className="overflow-y-auto p-5 md:p-6">

              {/* CUSTOMER PROFILE */}

              <section className="rounded-2xl border border-slate-200 p-5">

                <div className="flex flex-wrap items-center gap-4">

                  <CustomerAvatar
                    name={selectedCustomer.name}
                    large
                  />

                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-xl font-bold">
                      {selectedCustomer.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Customer #{selectedCustomer.id}
                    </p>
                  </div>

                  <CustomerStatusBadge
                    status={selectedCustomer.status}
                  />

                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">

                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                      <Mail size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">
                        Email Address
                      </p>

                      <p className="mt-1 break-all text-sm font-medium">
                        {selectedCustomer.email ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                      <Phone size={17} />
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Phone Number
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {selectedCustomer.phone ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                      <CalendarDays size={17} />
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Registered On
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {selectedCustomer.createdAt
                          ? formatDate(
                              selectedCustomer.createdAt
                            )
                          : "Not available"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                      <MapPin size={17} />
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Address
                      </p>

                      <p className="mt-1 break-words text-sm font-medium">
                        {selectedCustomer.address ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>

                </div>

                {selectedCustomer.userId == null && (
                  <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                    This customer does not have a
                    linked login account.
                  </div>
                )}

              </section>

              {/* DETAILS LOADING */}

              {detailsLoading ? (
                <div className="flex min-h-48 flex-col items-center justify-center">
                  <RefreshCw
                    size={26}
                    className="animate-spin text-blue-600"
                  />

                  <p className="mt-3 text-sm text-slate-500">
                    Loading customer details...
                  </p>
                </div>
              ) : detailsError ? (

                /* DETAILS ERROR */

                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <AlertCircle size={17} />

                    Unable to complete request
                  </p>

                  <p className="mt-2 text-sm text-red-600">
                    {detailsError}
                  </p>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void viewCustomer(
                        selectedCustomer
                      )
                    }
                    className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Reload Details
                  </button>
                </div>
              ) : (
                <>

                  {/* ========================
                      BOOKING STATISTICS
                  ======================== */}

                  <section className="mt-6">
                    <h3 className="text-base font-bold">
                      Rental Overview
                    </h3>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">

                      <BookingStatCard
                        title="Total Bookings"
                        value={bookingStats.total}
                        color="text-slate-900"
                      />

                      <BookingStatCard
                        title="Pending"
                        value={bookingStats.pending}
                        color="text-amber-600"
                      />

                      <BookingStatCard
                        title="Confirmed"
                        value={bookingStats.confirmed}
                        color="text-blue-600"
                      />

                      <BookingStatCard
                        title="Active Rentals"
                        value={bookingStats.active}
                        color="text-orange-600"
                      />

                      <BookingStatCard
                        title="Completed"
                        value={bookingStats.completed}
                        color="text-green-600"
                      />

                      <BookingStatCard
                        title="Cancelled / Rejected"
                        value={
                          bookingStats.cancelled +
                          bookingStats.rejected
                        }
                        color="text-red-600"
                      />

                    </div>

                    {/* COMPLETED RENTAL VALUE */}

                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-sm font-medium text-blue-700">
                        Completed Rental Value
                      </p>

                      <p className="mt-2 text-2xl font-bold text-blue-900">
                        {formatCurrency(
                          completedRentalValue
                        )}
                      </p>

                      <p className="mt-2 text-xs text-blue-600">
                        Total booking value of completed
                        rentals, not verified payments.
                      </p>
                    </div>

                  </section>

                  {/* ========================
                      BOOKING HISTORY
                  ======================== */}

                  <section className="mt-6">

                    <div className="flex flex-wrap items-center justify-between gap-3">

                      <div>
                        <h3 className="flex items-center gap-2 text-base font-bold">
                          <CalendarDays size={19} />

                          Booking History
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {filteredBookings.length} of{" "}
                          {customerBookings.length} bookings
                        </p>
                      </div>

                      <select
                        aria-label="Filter booking history"
                        value={bookingFilter}
                        onChange={(event) =>
                          setBookingFilter(
                            event.target.value as BookingFilter
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500"
                      >
                        <option value="all">
                          All Bookings
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

                        <option value="cancelled">
                          Cancelled
                        </option>

                        <option value="rejected">
                          Rejected
                        </option>
                      </select>

                    </div>

                    {filteredBookings.length === 0 ? (
                      <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center">

                        <CalendarDays
                          size={28}
                          className="mx-auto text-slate-400"
                        />

                        <p className="mt-3 text-sm font-medium text-slate-600">
                          {bookingFilter === "all"
                            ? "No booking history found"
                            : "No bookings match this status"}
                        </p>

                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">

                        {filteredBookings.map(
                          (booking) => (
                            <article
                              key={booking.id}
                              className="rounded-xl border border-slate-200 p-4"
                            >

                              {/* BOOKING HEADER */}

                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-bold">
                                    Booking #{booking.id}
                                  </p>

                                  {booking.createdAt && (
                                    <p className="mt-1 text-xs text-slate-400">
                                      Booked on{" "}
                                      {formatDate(
                                        booking.createdAt
                                      )}
                                    </p>
                                  )}
                                </div>

                                <BookingStatusBadge
                                  status={booking.status}
                                />
                              </div>

                              {/* VEHICLE */}

                              <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                                <Car
                                  size={21}
                                  className="text-slate-500"
                                />

                                <p className="text-sm font-medium">
                                  Vehicle #{booking.vehicleId}
                                </p>
                              </div>

                              {/* RENTAL DATES */}

                              <div className="mt-4 grid grid-cols-2 gap-4">

                                <div>
                                  <p className="text-xs text-slate-400">
                                    Pickup Date
                                  </p>

                                  <p className="mt-1 text-sm font-semibold">
                                    {formatDate(
                                      booking.startDate
                                    )}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs text-slate-400">
                                    Return Date
                                  </p>

                                  <p className="mt-1 text-sm font-semibold">
                                    {formatDate(
                                      booking.endDate
                                    )}
                                  </p>
                                </div>

                              </div>

                              {/* DURATION AND VALUE */}

                              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">

                                <p className="flex items-center gap-2 text-xs text-slate-500">
                                  <Clock size={15} />

                                  {booking.totalDays}{" "}
                                  {booking.totalDays === 1
                                    ? "Day"
                                    : "Days"}
                                </p>

                                <div className="text-right">
                                  <p className="text-xs text-slate-400">
                                    Rental Amount
                                  </p>

                                  <p className="mt-1 text-base font-bold text-slate-900">
                                    {formatCurrency(
                                      booking.totalAmount
                                    )}
                                  </p>
                                </div>

                              </div>

                            </article>
                          )
                        )}

                      </div>
                    )}

                  </section>

                </>
              )}

            </div>

            {/* ==============================
                MODAL FOOTER
            ============================== */}

            <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4 md:p-5">

              <Link
                href="/bookings"
                className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
              >
                Manage Bookings

                <ChevronRight size={16} />
              </Link>

              <div className="flex flex-wrap items-center gap-2">

                {selectedCustomer.userId != null &&
                  (
                    selectedCustomer.status === "active" ||
                    selectedCustomer.status === "blocked"
                  ) && (
                    <button
                      type="button"
                      disabled={
                        busy ||
                        detailsLoading
                      }
                      onClick={() =>
                        void changeStatus(
                          selectedCustomer
                        )
                      }
                      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                        selectedCustomer.status === "active"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {updatingId === selectedCustomer.id ? (
                        <RefreshCw
                          size={16}
                          className="animate-spin"
                        />
                      ) : selectedCustomer.status === "active" ? (
                        <ShieldOff size={16} />
                      ) : (
                        <ShieldCheck size={16} />
                      )}

                      {updatingId === selectedCustomer.id
                        ? "Updating..."
                        : selectedCustomer.status === "active"
                          ? "Block Customer"
                          : "Unblock Customer"}
                    </button>
                  )}

                <button
                  type="button"
                  onClick={closeDetails}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>

              </div>
            </footer>

          </section>
        </div>
      )}

    </main>
  );
}
