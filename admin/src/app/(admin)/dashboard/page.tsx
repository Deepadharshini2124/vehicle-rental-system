
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  getDashboard,
  getAdminToken,
  getAdminUser,
  clearAdminSession,
  formatCurrency,
  formatDate,
  getBookingStatusLabel,
  type AdminUser,
  type DashboardData,
  type DashboardBooking,
  type BookingStatus,
} from "@/lib/api";

// ==========================================
// STAT CARD TYPES
// ==========================================

type StatCardProps = {
  title: string;
  value: number | string;
  icon: string;
  description?: string;
  color?: string;
  valueColor?: string;
};

// ==========================================
// STAT CARD
// ==========================================

function StatCard({
  title,
  value,
  icon,
  description,
  color = "bg-blue-50",
  valueColor = "text-slate-900",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3
            className={`mt-3 text-3xl font-bold ${valueColor}`}
          >
            {value}
          </h3>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${color}`}
        >
          {icon}
        </div>
      </div>

      {description && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

// ==========================================
// BOOKING STATUS BADGE
// ==========================================

function StatusBadge({
  status,
}: {
  status: BookingStatus;
}) {
  const colors: Record<BookingStatus, string> = {
    pending: "bg-amber-100 text-amber-700",

    confirmed: "bg-blue-100 text-blue-700",

    in_progress: "bg-orange-100 text-orange-700",

    completed: "bg-green-100 text-green-700",

    cancelled: "bg-slate-100 text-slate-600",

    rejected: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        colors[status] ||
        "bg-gray-100 text-gray-700"
      }`}
    >
      {getBookingStatusLabel(status)}
    </span>
  );
}

// ==========================================
// SECTION HEADER
// ==========================================

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold text-slate-900">
        {title}
      </h3>

      {description && (
        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

// ==========================================
// RENTAL OPERATION LIST
// ==========================================

type OperationListProps = {
  title: string;
  description: string;
  bookings: DashboardBooking[];
  emptyMessage: string;
  color: string;
  dateType: "pickup" | "return";
};

function OperationList({
  title,
  description,
  bookings,
  emptyMessage,
  color,
  dateType,
}: OperationListProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h3 className="font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`rounded-lg px-3 py-1 text-sm font-bold ${color}`}
        >
          {bookings.length}
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center p-5 text-center">
          <p className="text-sm text-slate-400">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="p-4 transition hover:bg-slate-50"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    {booking.vehicle?.name ||
                      `Vehicle #${booking.vehicleId}`}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Booking #{booking.id}
                  </p>
                </div>

                <StatusBadge status={booking.status} />
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p>
                  Customer:{" "}
                  <span className="font-medium text-slate-700">
                    {booking.contactName ||
                      "Customer"}
                  </span>
                </p>

                {booking.vehicle?.registrationNumber && (
                  <p>
                    Registration:{" "}
                    {booking.vehicle.registrationNumber}
                  </p>
                )}

                <p>
                  {dateType === "pickup"
                    ? "Pickup"
                    : "Return"}
                  :{" "}
                  <span className="font-medium text-slate-700">
                    {formatDate(
                      dateType === "pickup"
                        ? booking.startDate
                        : booking.endDate
                    )}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-100 p-4">
        <Link
          href="/bookings"
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          Manage Bookings →
        </Link>
      </div>
    </section>
  );
}

// ==========================================
// RENTAL VALUE CARD
// ==========================================

function RentalValueCard({
  title,
  amount,
  description,
  featured = false,
}: {
  title: string;
  amount: number;
  description: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        featured
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <p
        className={`text-sm font-medium ${
          featured
            ? "text-slate-300"
            : "text-slate-500"
        }`}
      >
        {title}
      </p>

      <h3 className="mt-3 break-words text-2xl font-bold">
        {formatCurrency(amount)}
      </h3>

      <p
        className={`mt-3 text-xs leading-relaxed ${
          featured
            ? "text-slate-400"
            : "text-slate-500"
        }`}
      >
        {description}
      </p>
    </div>
  );
}

// ==========================================
// ADMIN DASHBOARD PAGE
// ==========================================

export default function AdminDashboardPage() {
  const router = useRouter();

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [admin, setAdmin] =
    useState<AdminUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  // ========================================
  // LOAD DASHBOARD DATA
  // ========================================

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      const token = getAdminToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await getDashboard();

        setDashboard(response.dashboard);
      } catch (err) {
        if (!getAdminToken()) {
          setDashboard(null);

          router.replace("/login");

          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard"
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
    setAdmin(getAdminUser());

    void loadDashboard();
  }, [loadDashboard]);

  // ========================================
  // LOGOUT
  // ========================================

  function handleLogout() {
    clearAdminSession();

    router.replace("/login");
  }

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (loading) {
    return (
      <main
        className="flex min-h-[60vh] items-center justify-center"
        aria-busy="true"
      >
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  // ========================================
  // ERROR SCREEN
  // ========================================

  if (!dashboard) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h2 className="text-xl font-semibold text-slate-900">
          Dashboard Unavailable
        </h2>

        <p
          role="alert"
          className="max-w-md text-sm text-red-600"
        >
          {error ||
            "Unable to load dashboard data"}
        </p>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Try Again
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-slate-500 underline"
        >
          Back to Login
        </button>
      </main>
    );
  }

  // ========================================
  // MAIN STATISTICS
  // ========================================

  const stats: StatCardProps[] = [
    {
      title: "Total Vehicles",
      value: dashboard.vehicles.total,
      icon: "🚗",
      description:
        `${dashboard.vehicles.cars} Cars · ${dashboard.vehicles.bikes} Bikes`,
      color: "bg-blue-50",
    },

    {
      title: "Available Vehicles",
      value: dashboard.vehicles.available,
      icon: "✓",
      description:
        "Not currently rented or unavailable",
      color: "bg-green-50",
      valueColor: "text-green-700",
    },

    {
      title: "Rented Vehicles",
      value: dashboard.vehicles.rented,
      icon: "🔑",
      description:
        "Currently with customers",
      color: "bg-orange-50",
      valueColor: "text-orange-600",
    },

    {
      title: "Total Customers",
      value: dashboard.customers.total,
      icon: "👥",
      description:
        "Registered customer profiles",
      color: "bg-purple-50",
    },

    {
      title: "Total Bookings",
      value: dashboard.bookings.total,
      icon: "📅",
      description:
        "All rental bookings",
      color: "bg-indigo-50",
    },

    {
      title: "Pending Bookings",
      value: dashboard.bookings.pending,
      icon: "⏳",
      description:
        "Waiting for admin approval",
      color: "bg-amber-50",
      valueColor: "text-amber-600",
    },

    {
      title: "Confirmed Bookings",
      value: dashboard.bookings.confirmed,
      icon: "✓",
      description:
        "Approved bookings awaiting pickup",
      color: "bg-blue-50",
      valueColor: "text-blue-600",
    },

    {
      title: "Completed Rentals",
      value: dashboard.bookings.completed,
      icon: "✓",
      description:
        "Successfully returned vehicles",
      color: "bg-emerald-50",
      valueColor: "text-green-700",
    },
  ];

  // ========================================
  // DAILY OPERATIONS STATISTICS
  // ========================================

  const operationStats: StatCardProps[] = [
    {
      title: "Today's Pickups",
      value: dashboard.operations.todayPickups,
      icon: "↗",
      description:
        "Vehicles awaiting handover today",
      color: "bg-blue-50",
      valueColor: "text-blue-600",
    },

    {
      title: "Today's Returns",
      value: dashboard.operations.todayReturns,
      icon: "↙",
      description:
        "Vehicles due for return today",
      color: "bg-green-50",
      valueColor: "text-green-700",
    },

    {
      title: "Active Rentals",
      value: dashboard.operations.activeRentals,
      icon: "🔑",
      description:
        "Rentals currently in progress",
      color: "bg-orange-50",
      valueColor: "text-orange-600",
    },

    {
      title: "Overdue Rentals",
      value: dashboard.operations.overdueRentals,
      icon: "!",
      description:
        "Vehicles past their return date",
      color: "bg-red-50",
      valueColor:
        dashboard.operations.overdueRentals > 0
          ? "text-red-600"
          : "text-slate-900",
    },

    {
      title: "Missed Pickups",
      value: dashboard.operations.missedPickups,
      icon: "⏳",
      description:
        "Confirmed bookings past pickup date",
      color: "bg-amber-50",
      valueColor:
        dashboard.operations.missedPickups > 0
          ? "text-amber-600"
          : "text-slate-900",
    },
  ];

  // ========================================
  // BOOKING STATUS DISTRIBUTION
  // ========================================

  const bookingStatuses = [
    {
      label: "Pending",
      count: dashboard.bookings.pending,
      color: "bg-amber-500",
    },

    {
      label: "Confirmed",
      count: dashboard.bookings.confirmed,
      color: "bg-blue-500",
    },

    {
      label: "In Progress",
      count: dashboard.bookings.in_progress,
      color: "bg-orange-500",
    },

    {
      label: "Completed",
      count: dashboard.bookings.completed,
      color: "bg-green-500",
    },

    {
      label: "Cancelled",
      count: dashboard.bookings.cancelled,
      color: "bg-slate-400",
    },

    {
      label: "Rejected",
      count: dashboard.bookings.rejected,
      color: "bg-red-500",
    },
  ];

  // ========================================
  // VEHICLE STATUS DISTRIBUTION
  // ========================================

  const vehicleStatuses = [
    {
      label: "Available",
      count: dashboard.vehicles.available,
      color: "bg-green-500",
    },

    {
      label: "Rented",
      count: dashboard.vehicles.rented,
      color: "bg-orange-500",
    },

    {
      label: "Maintenance",
      count: dashboard.vehicles.maintenance,
      color: "bg-amber-500",
    },

    {
      label: "Inactive",
      count: dashboard.vehicles.inactive,
      color: "bg-slate-400",
    },
  ];

  // ========================================
  // DASHBOARD UI
  // ========================================

  return (
    <main className="min-h-full bg-slate-100 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl">

        {/* =================================
            PAGE HEADER
        ================================= */}

        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Welcome back, {admin?.name || "Admin"}.
              Here is your rental business overview.
            </p>

            <p className="mt-2 text-xs font-medium text-slate-400">
              {formatDate(dashboard.date)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span
              className={
                refreshing
                  ? "inline-block animate-spin text-lg"
                  : "text-lg"
              }
            >
              ↻
            </span>

            {refreshing
              ? "Refreshing..."
              : "Refresh Data"}
          </button>
        </header>

        {/* =================================
            ERROR MESSAGE
        ================================= */}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* =================================
            OVERDUE ALERT
        ================================= */}

        {dashboard.operations.overdueRentals > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <div>
              <p className="text-sm font-bold text-red-700">
                Overdue rentals require attention
              </p>

              <p className="mt-1 text-xs text-red-600">
                {dashboard.operations.overdueRentals}{" "}
                rental(s) have passed their scheduled
                return date.
              </p>
            </div>

            <Link
              href="/bookings"
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              Manage Rentals
            </Link>
          </div>
        )}

        {/* =================================
            BUSINESS OVERVIEW
        ================================= */}

        <section>
          <SectionHeader
            title="Business Overview"
            description="Overall vehicle, customer and booking statistics"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                {...stat}
              />
            ))}
          </div>
        </section>

        {/* =================================
            DAILY OPERATIONS
        ================================= */}

        <section className="mt-8">
          <SectionHeader
            title="Rental Operations"
            description="Monitor daily pickups, returns and active rentals"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {operationStats.map((stat) => (
              <StatCard
                key={stat.title}
                {...stat}
              />
            ))}
          </div>
        </section>

        {/* =================================
            DAILY PICKUPS AND RETURNS
        ================================= */}

        <section className="mt-8">
          <SectionHeader
            title="Today's Schedule"
            description="Vehicles awaiting pickup or return today"
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <OperationList
              title="Today's Pickups"
              description="Confirmed bookings awaiting handover"
              bookings={dashboard.todayPickups}
              emptyMessage="No pending pickups scheduled for today"
              color="bg-blue-50 text-blue-700"
              dateType="pickup"
            />

            <OperationList
              title="Today's Returns"
              description="Active rentals scheduled to return"
              bookings={dashboard.todayReturns}
              emptyMessage="No pending returns scheduled for today"
              color="bg-green-50 text-green-700"
              dateType="return"
            />
          </div>
        </section>

        {/* =================================
            ACTIVE AND OVERDUE RENTALS
        ================================= */}

        <section className="mt-8">
          <SectionHeader
            title="Rental Monitoring"
            description="Track active rentals and bookings requiring attention"
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <OperationList
              title="Active Rentals"
              description="Vehicles currently with customers"
              bookings={dashboard.activeRentals}
              emptyMessage="No active rentals"
              color="bg-orange-50 text-orange-700"
              dateType="return"
            />

            <OperationList
              title="Overdue Rentals"
              description="Scheduled return date has passed"
              bookings={dashboard.overdueRentals}
              emptyMessage="No overdue rentals"
              color="bg-red-50 text-red-700"
              dateType="return"
            />

            <OperationList
              title="Missed Pickups"
              description="Pickup date passed without handover"
              bookings={dashboard.missedPickups}
              emptyMessage="No missed pickups"
              color="bg-amber-50 text-amber-700"
              dateType="pickup"
            />
          </div>
        </section>

        {/* =================================
            RENTAL VALUE STATISTICS
        ================================= */}

        <section className="mt-8">
          <SectionHeader
            title="Rental Value"
            description="Booking amounts only — not actual collected payments"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <RentalValueCard
              title="Total Approved Rental Value"
              amount={dashboard.rentalValue.total}
              description="Combined confirmed, active and completed rental amounts."
              featured
            />

            <RentalValueCard
              title="Confirmed Booking Value"
              amount={dashboard.rentalValue.confirmed}
              description="Value of approved bookings awaiting pickup."
            />

            <RentalValueCard
              title="Active Rental Value"
              amount={dashboard.rentalValue.in_progress}
              description="Value of rentals currently in progress."
            />

            <RentalValueCard
              title="Completed Rental Value"
              amount={dashboard.rentalValue.completed}
              description="Total booking value of completed rentals."
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Pending Booking Value
              </p>

              <p className="mt-1 text-xs text-amber-700">
                Not included in total approved rental value
              </p>
            </div>

            <p className="text-lg font-bold text-amber-800">
              {formatCurrency(
                dashboard.rentalValue.pending
              )}
            </p>
          </div>
        </section>

        {/* =================================
            QUICK ACTIONS
        ================================= */}

        <section className="mt-8">
          <SectionHeader
            title="Quick Actions"
            description="Access frequently used management pages"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              href="/vehicles"
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  🚗
                </div>

                <div>
                  <h4 className="font-semibold">
                    Manage Vehicles
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    Add and update vehicles
                  </p>
                </div>
              </div>

              <span className="text-slate-400">
                →
              </span>
            </Link>

            <Link
              href="/bookings"
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
                  📅
                </div>

                <div>
                  <h4 className="font-semibold">
                    Manage Bookings
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    Approve and manage rentals
                  </p>
                </div>
              </div>

              <span className="text-slate-400">
                →
              </span>
            </Link>

            <Link
              href="/customers"
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl">
                  👥
                </div>

                <div>
                  <h4 className="font-semibold">
                    Manage Customers
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    View customer information
                  </p>
                </div>
              </div>

              <span className="text-slate-400">
                →
              </span>
            </Link>
          </div>
        </section>

        {/* =================================
            BOOKING AND VEHICLE OVERVIEW
        ================================= */}

        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* BOOKING STATUS */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Booking Status Overview"
              description="Distribution of all rental bookings"
            />

            <div className="mt-6 space-y-5">
              {bookingStatuses.map((item) => {
                const percentage =
                  dashboard.bookings.total > 0
                    ? (item.count /
                        dashboard.bookings.total) *
                      100
                    : 0;

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                        />

                        <span className="font-medium">
                          {item.label}
                        </span>
                      </div>

                      <span className="text-slate-500">
                        {item.count} (
                        {percentage.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, percentage)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* VEHICLE STATUS */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionHeader
              title="Vehicle Status Overview"
              description="Current status of your rental fleet"
            />

            <div className="mt-6 space-y-5">
              {vehicleStatuses.map((item) => {
                const percentage =
                  dashboard.vehicles.total > 0
                    ? (item.count /
                        dashboard.vehicles.total) *
                      100
                    : 0;

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${item.color}`}
                        />

                        <span className="font-medium">
                          {item.label}
                        </span>
                      </div>

                      <span className="text-slate-500">
                        {item.count} (
                        {percentage.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, percentage)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Total Cars
                </p>

                <p className="mt-2 text-xl font-bold">
                  {dashboard.vehicles.cars}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Total Bikes
                </p>

                <p className="mt-2 text-xl font-bold">
                  {dashboard.vehicles.bikes}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* =================================
            RECENT BOOKINGS
        ================================= */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h3 className="text-lg font-bold">
                Recent Bookings
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Latest rental booking requests
              </p>
            </div>

            <Link
              href="/bookings"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              View All →
            </Link>
          </div>

          {dashboard.recentBookings.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500">
                No bookings available
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="p-4">
                      Booking ID
                    </th>

                    <th className="p-4">
                      Customer
                    </th>

                    <th className="p-4">
                      Vehicle
                    </th>

                    <th className="p-4">
                      Rental Dates
                    </th>

                    <th className="p-4">
                      Duration
                    </th>

                    <th className="p-4">
                      Amount
                    </th>

                    <th className="p-4">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.recentBookings.map(
                    (booking) => (
                      <tr
                        key={booking.id}
                        className="border-t border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap p-4 font-semibold text-blue-600">
                          #{booking.id}
                        </td>

                        <td className="p-4 font-medium">
                          {booking.contactName ||
                            "Customer"}
                        </td>

                        <td className="p-4">
                          <p className="font-semibold">
                            {booking.vehicle?.name ||
                              `Vehicle #${booking.vehicleId}`}
                          </p>

                          {booking.vehicle && (
                            <p className="mt-1 text-xs text-slate-500">
                              {
                                booking.vehicle
                                  .registrationNumber
                              }
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap p-4">
                          <p className="text-xs text-slate-500">
                            Pickup:{" "}
                            {formatDate(
                              booking.startDate
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Return:{" "}
                            {formatDate(
                              booking.endDate
                            )}
                          </p>
                        </td>

                        <td className="whitespace-nowrap p-4">
                          {booking.totalDays}{" "}
                          {booking.totalDays === 1
                            ? "day"
                            : "days"}
                        </td>

                        <td className="whitespace-nowrap p-4 font-semibold">
                          {formatCurrency(
                            booking.totalAmount
                          )}
                        </td>

                        <td className="p-4">
                          <StatusBadge
                            status={booking.status}
                          />
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* =================================
            FOOTER
        ================================= */}

        <footer className="py-8 text-center text-xs text-slate-400">
          Car & Bike Rental Management System
        </footer>
      </div>
    </main>
  );
}
