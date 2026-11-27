"use client";

import Link from "next/link";

type VehicleHeaderProps = {
  busy: boolean;
  showForm: boolean;
  refreshing: boolean;
  locationsLoading: boolean;
  onRefresh: () => void;
  onAddVehicle: () => void;
};

export default function VehicleHeader({
  busy,
  showForm,
  refreshing,
  locationsLoading,
  onRefresh,
  onAddVehicle,
}: VehicleHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <Link
          href="/dashboard"
          className="mb-3 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Vehicle Management
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Manage cars, bikes, rental prices and vehicle availability.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy || showForm || locationsLoading}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "↻ Refresh"}
        </button>

        <button
          type="button"
          onClick={onAddVehicle}
          disabled={busy || showForm || locationsLoading}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          + Add Vehicle
        </button>
      </div>
    </header>
  );
}