"use client";

type VehicleEmptyStateProps = {
  loading: boolean;
  totalCount: number;
  filteredCount: number;

  error: string;
  hasFilters: boolean;

  busy: boolean;
  showForm: boolean;

  onRetry: () => void;
  onClearFilters: () => void;
  onAddVehicle: () => void;
};

export default function VehicleEmptyState({
  loading,
  totalCount,
  filteredCount,

  error,
  hasFilters,

  busy,
  showForm,

  onRetry,
  onClearFilters,
  onAddVehicle,
}: VehicleEmptyStateProps) {
  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-60 flex-col items-center justify-center p-8"
      >
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

        <p className="mt-4 text-sm text-slate-500">
          Loading vehicles...
        </p>
      </div>
    );
  }

  // Vehicles available — no empty state needed

  if (filteredCount > 0) {
    return null;
  }

  // ==========================================
  // EMPTY STATE CONFIGURATION
  // ==========================================

  const hasLoadError =
    Boolean(error) && totalCount === 0;

  const title = hasLoadError
    ? "Unable to load vehicles"
    : hasFilters
      ? "No matching vehicles"
      : "No vehicles added yet";

  const description = hasLoadError
    ? "Refresh the list to try again."
    : hasFilters
      ? "Try changing your search or filters."
      : "Add your first car or bike to start managing rentals.";

  const buttonLabel = hasLoadError
    ? "Try Again"
    : hasFilters
      ? "Clear Filters"
      : "+ Add Vehicle";

  const handleAction = hasLoadError
    ? onRetry
    : hasFilters
      ? onClearFilters
      : onAddVehicle;

  // ==========================================
  // EMPTY STATE UI
  // ==========================================

  return (
    <div className="flex min-h-60 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
        🚗
      </div>

      <h3 className="mt-4 font-bold">
        {title}
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>

      <button
        type="button"
        disabled={busy || showForm}
        onClick={handleAction}
        className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </div>
  );
}