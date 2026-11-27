"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  MapPin,
  MapPinOff,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Eye,
  X,
  CarFront,
  Bike,
  Power,
  LoaderCircle,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

import {
  getAdminToken,
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  updateLocationStatus,
  getLocationStatusLabel,
  getVehicleStatusLabel,
  formatCurrency,
  type Location,
  type LocationDetails,
  type LocationPayload,
  type LocationStatus,
} from "@/lib/api";

// ==========================================
// TYPES & DEFAULT VALUES
// ==========================================

type StatusFilter = "all" | LocationStatus;

const emptyForm: LocationPayload = {
  name: "",
  city: "",
  address: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70";

const labelClass =
  "mb-2 block text-sm font-medium text-slate-700";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

// ==========================================
// STATUS BADGE
// ==========================================

function StatusBadge({
  status,
}: {
  status: LocationStatus;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
        status === "active"
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {getLocationStatusLabel(status)}
    </span>
  );
}

// ==========================================
// STATISTICS CARD
// ==========================================

function StatCard({
  title,
  value,
  color,
  description,
}: {
  title: string;
  value: number;
  color: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className={`mt-3 text-3xl font-bold ${color}`}>
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

// ==========================================
// FORM VALIDATION
// ==========================================

function validateForm(
  form: LocationPayload
): string | null {
  if (!form.name.trim()) {
    return "Location name is required";
  }

  if (form.name.trim().length > 150) {
    return "Location name must not exceed 150 characters";
  }

  if (!form.city.trim()) {
    return "City is required";
  }

  if (form.city.trim().length > 100) {
    return "City must not exceed 100 characters";
  }

  if (!form.address.trim()) {
    return "Address is required";
  }

  if (form.address.trim().length > 2000) {
    return "Address must not exceed 2000 characters";
  }

  return null;
}

function errorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

// ==========================================
// LOCATION MANAGEMENT PAGE
// ==========================================

export default function LocationsPage() {
  const router = useRouter();

  // ========================================
  // STATES
  // ========================================

  const [locations, setLocations] =
    useState<Location[]>([]);

  const [form, setForm] =
    useState<LocationPayload>({ ...emptyForm });

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<number | null>(null);

  const [error, setError] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  // Location details panel

  const [selectedId, setSelectedId] =
    useState<number | null>(null);

  const [details, setDetails] =
    useState<LocationDetails | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState("");

  // Request protection

  const listRequestRef =
    useRef<AbortController | null>(null);

  const detailsRequestRef =
    useRef<AbortController | null>(null);

  const mutationLock = useRef(false);

  const mountedRef = useRef(false);

  const busy =
    loading ||
    refreshing ||
    saving ||
    updatingId !== null;

  // ========================================
  // LOAD LOCATIONS
  // ========================================

  const loadLocations = useCallback(
    async (isRefresh = false) => {
      listRequestRef.current?.abort();

      const controller = new AbortController();

      listRequestRef.current = controller;

      setLoading(!isRefresh);
      setRefreshing(isRefresh);
      setError("");

      try {
        if (!getAdminToken()) {
          router.replace("/login");
          return;
        }

        const response = await getLocations(
          controller.signal
        );

        if (controller.signal.aborted) return;

        setLocations(response.locations);
      } catch (err) {
        if (controller.signal.aborted) return;

        if (!getAdminToken()) {
          router.replace("/login");
          return;
        }

        setError(
          errorMessage(
            err,
            "Failed to load locations"
          )
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [router]
  );

  // ========================================
  // INITIAL LOAD & CLEANUP
  // ========================================

  useEffect(() => {
    mountedRef.current = true;

    void loadLocations();

    return () => {
      mountedRef.current = false;

      listRequestRef.current?.abort();
      detailsRequestRef.current?.abort();
    };
  }, [loadLocations]);

  // ========================================
  // LOCATION STATISTICS
  // ========================================

  const stats = useMemo(() => {
    return {
      total: locations.length,

      active: locations.filter(
        (location) => location.status === "active"
      ).length,

      inactive: locations.filter(
        (location) => location.status === "inactive"
      ).length,

      assignedVehicles: locations.reduce(
        (total, location) =>
          total + location.totalVehicles,
        0
      ),
    };
  }, [locations]);

  // ========================================
  // SEARCH & FILTER
  // ========================================

  const filteredLocations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return locations.filter((location) => {
      const matchesSearch =
        !query ||
        [
          location.name,
          location.city,
          location.address,
        ].some((value) =>
          value.toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "all" ||
        location.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [locations, search, statusFilter]);

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  // ========================================
  // CLOSE LOCATION DETAILS
  // ========================================

  function closeDetails() {
    detailsRequestRef.current?.abort();

    setSelectedId(null);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(false);
  }

  // ========================================
  // OPEN ADD LOCATION FORM
  // ========================================

  function openAddForm() {
    if (busy || mutationLock.current) return;

    closeDetails();

    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);

    setError("");
    setFormError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ========================================
  // OPEN EDIT LOCATION FORM
  // ========================================

  function openEditForm(location: Location) {
    if (busy || mutationLock.current) return;

    if (location.totalVehicles > 0) {
      setError(
        "Remove or reassign vehicles before editing this location."
      );

      return;
    }

    closeDetails();

    setEditingId(location.id);

    setForm({
      name: location.name,
      city: location.city,
      address: location.address,
    });

    setShowForm(true);

    setError("");
    setFormError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ========================================
  // UPDATE FORM FIELD
  // ========================================

  function updateField(
    field: keyof LocationPayload,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFormError("");
  }

  // ========================================
  // CLOSE FORM
  // ========================================

  function closeForm() {
    if (saving || mutationLock.current) return;

    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
  }

  // ========================================
  // SAVE LOCATION
  // ========================================

  async function saveLocation(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy || mutationLock.current) return;

    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    setFormError("");
    setMessage("");

    const validationError = validateForm(form);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload: LocationPayload = {
      name: form.name.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
    };

    mutationLock.current = true;

    try {
      setSaving(true);
      setError("");

      const response =
        editingId !== null
          ? await updateLocation(editingId, payload)
          : await createLocation(payload);

      if (!mountedRef.current) return;

      setLocations((previous) => {
        const exists = previous.some(
          (item) => item.id === response.location.id
        );

        const updated = exists
          ? previous.map((item) =>
              item.id === response.location.id
                ? response.location
                : item
            )
          : [...previous, response.location];

        return updated.sort(
          (a, b) =>
            a.city.localeCompare(b.city) ||
            a.name.localeCompare(b.name)
        );
      });

      setMessage(
        response.message ||
          "Location saved successfully"
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      setFormError("");

      await loadLocations(true);
    } catch (err) {
      if (!mountedRef.current) return;

      if (!getAdminToken()) {
        router.replace("/login");
        return;
      }

      setFormError(
        errorMessage(
          err,
          "Failed to save location"
        )
      );
    } finally {
      mutationLock.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }

  // ========================================
  // ACTIVATE / DEACTIVATE LOCATION
  // ========================================

  async function handleUpdateStatus(
    location: Location
  ) {
    if (
      busy ||
      showForm ||
      mutationLock.current
    ) {
      return;
    }

    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    const nextStatus: LocationStatus =
      location.status === "active"
        ? "inactive"
        : "active";

    if (
      nextStatus === "inactive" &&
      location.totalVehicles > 0
    ) {
      setError(
        "Remove or reassign vehicles before deactivating this location."
      );

      return;
    }

    const action =
      nextStatus === "active"
        ? "Activate"
        : "Deactivate";

    const confirmed = window.confirm(
      nextStatus === "inactive"
        ? `Deactivate ${location.name}? This location will no longer appear in the public location list.`
        : `Activate ${location.name}? This location will become available in the public location list.`
    );

    if (!confirmed) return;

    mutationLock.current = true;

    closeDetails();

    try {
      setUpdatingId(location.id);
      setError("");
      setMessage("");

      const response =
        await updateLocationStatus(
          location.id,
          nextStatus
        );

      if (!mountedRef.current) return;

      setLocations((previous) =>
        previous.map((item) =>
          item.id === location.id
            ? response.location
            : item
        )
      );

      setMessage(
        response.message ||
          `${action} completed successfully`
      );

      await loadLocations(true);
    } catch (err) {
      if (!mountedRef.current) return;

      if (!getAdminToken()) {
        router.replace("/login");
        return;
      }

      setError(
        errorMessage(
          err,
          "Failed to update location status"
        )
      );
    } finally {
      mutationLock.current = false;

      if (mountedRef.current) {
        setUpdatingId(null);
      }
    }
  }

  // ========================================
  // VIEW LOCATION DETAILS
  // ========================================

  async function viewLocation(id: number) {
    if (
      busy ||
      showForm ||
      mutationLock.current
    ) {
      return;
    }

    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    detailsRequestRef.current?.abort();

    const controller = new AbortController();

    detailsRequestRef.current = controller;

    setSelectedId(id);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);

    try {
      const response = await getLocationById(
        id,
        controller.signal
      );

      if (controller.signal.aborted) return;

      setDetails(response.location);
    } catch (err) {
      if (controller.signal.aborted) return;

      if (!getAdminToken()) {
        router.replace("/login");
        return;
      }

      setDetailsError(
        errorMessage(
          err,
          "Failed to load location details"
        )
      );
    } finally {
      if (!controller.signal.aborted) {
        setDetailsLoading(false);
      }
    }
  }

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <main className="min-h-full bg-slate-100 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADER */}

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Location Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage rental pickup locations and
              assigned vehicles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || showForm}
              onClick={() => {
                closeDetails();
                void loadLocations(true);
              }}
              className={secondaryButton}
            >
              <RefreshCw
                size={17}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={openAddForm}
              disabled={busy || showForm}
              className={primaryButton}
            >
              <Plus size={19} />
              Add Location
            </button>
          </div>
        </header>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <CircleAlert
              size={19}
              className="shrink-0"
            />

            <span className="flex-1">
              {error}
            </span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* SUCCESS MESSAGE */}

        {message && (
          <div
            role="status"
            className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <CheckCircle2
              size={19}
              className="shrink-0"
            />

            <span className="flex-1">
              {message}
            </span>

            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* STATISTICS CARDS */}

        {!loading && (
          <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              title="Total Locations"
              value={stats.total}
              color="text-slate-900"
              description="All pickup locations"
            />

            <StatCard
              title="Active Locations"
              value={stats.active}
              color="text-green-700"
              description="Visible in public location list"
            />

            <StatCard
              title="Inactive Locations"
              value={stats.inactive}
              color="text-orange-600"
              description="Hidden from public location list"
            />

            <StatCard
              title="Assigned Vehicles"
              value={stats.assignedVehicles}
              color="text-blue-600"
              description="Vehicles linked to locations"
            />
          </section>
        )}

        {/* ADD / EDIT LOCATION FORM */}

        {showForm && (
          <form
            onSubmit={saveLocation}
            className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId !== null
                    ? "Edit Location"
                    : "Add New Location"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingId !== null
                    ? "Update existing pickup location details."
                    : "Enter your new rental pickup location details."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg bg-slate-100 p-2 text-slate-600 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 md:p-6">
              {formError && (
                <div
                  role="alert"
                  className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}

              <fieldset
                disabled={saving}
                className="min-w-0"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  {/* LOCATION NAME */}

                  <label>
                    <span className={labelClass}>
                      Location Name *
                    </span>

                    <input
                      type="text"
                      required
                      maxLength={150}
                      placeholder="e.g. Chennai Rental Hub"
                      value={form.name}
                      onChange={(event) =>
                        updateField(
                          "name",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  {/* CITY */}

                  <label>
                    <span className={labelClass}>
                      City *
                    </span>

                    <input
                      type="text"
                      required
                      maxLength={100}
                      placeholder="e.g. Chennai"
                      value={form.city}
                      onChange={(event) =>
                        updateField(
                          "city",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </label>

                  {/* ADDRESS */}

                  <label className="md:col-span-2">
                    <span className={labelClass}>
                      Pickup Address *
                    </span>

                    <textarea
                      required
                      rows={4}
                      maxLength={2000}
                      placeholder="Enter the complete pickup address..."
                      value={form.address}
                      onChange={(event) =>
                        updateField(
                          "address",
                          event.target.value
                        )
                      }
                      className={inputClass}
                    />

                    <span className="mt-1 block text-right text-xs text-slate-400">
                      {form.address.length}/2000
                    </span>
                  </label>
                </div>
              </fieldset>

              {editingId === null && (
                <div className="mt-5 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
                  New locations will automatically
                  be created with Active status.
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 p-5">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className={secondaryButton}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={busy}
                className={primaryButton}
              >
                {saving && (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                )}

                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Update Location"
                    : "Save Location"}
              </button>
            </div>
          </form>
        )}

        {/* LOCATION DETAILS PANEL */}

        {selectedId !== null && (
          <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold">
                Location Details
              </h2>

              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close location details"
                className="rounded-lg bg-slate-100 p-2 text-slate-600"
              >
                <X size={19} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex min-h-40 items-center justify-center gap-3 p-6 text-sm text-slate-500">
                <LoaderCircle
                  size={24}
                  className="animate-spin text-blue-600"
                />

                Loading location details...
              </div>
            ) : detailsError ? (
              <div className="p-5">
                <p
                  role="alert"
                  className="text-sm text-red-600"
                >
                  {detailsError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void viewLocation(selectedId)
                  }
                  className="mt-4 text-sm font-semibold text-blue-600 hover:underline"
                >
                  Try Again
                </button>
              </div>
            ) : details ? (
              <div className="p-5 md:p-6">

                {/* LOCATION INFORMATION */}

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <MapPin size={24} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words text-xl font-bold">
                        {details.name}
                      </h3>

                      <p className="mt-1 text-sm font-medium text-slate-600">
                        {details.city}
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-500">
                        {details.address}
                      </p>
                    </div>
                  </div>

                  <StatusBadge
                    status={details.status}
                  />
                </div>

                {/* ASSIGNED VEHICLES */}

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-bold">
                      Assigned Vehicles (
                      {details.totalVehicles})
                    </h3>

                    <Link
                      href="/vehicles"
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Manage Vehicles →
                    </Link>
                  </div>

                  {details.vehicles.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <CarFront
                        size={32}
                        className="mx-auto text-slate-400"
                      />

                      <p className="mt-3 text-sm font-medium text-slate-700">
                        No vehicles assigned
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Vehicles linked to this
                        location will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {details.vehicles.map(
                        (vehicle) => (
                          <div
                            key={vehicle.id}
                            className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              {vehicle.type === "car" ? (
                                <CarFront size={23} />
                              ) : (
                                <Bike size={23} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="break-words text-sm font-semibold">
                                {vehicle.name}
                              </p>

                              <p className="mt-1 text-xs capitalize text-slate-500">
                                {vehicle.brand} ·{" "}
                                {vehicle.type}
                              </p>

                              <p className="mt-1 text-xs text-slate-600">
                                {getVehicleStatusLabel(
                                  vehicle.status
                                )}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-bold">
                                {formatCurrency(
                                  vehicle.pricePerDay
                                )}
                              </p>

                              <p className="text-xs text-slate-400">
                                per day
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* LOCATION LIST */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* LIST HEADER */}

          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">
                  All Locations
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {loading
                    ? "Loading locations..."
                    : `Showing ${filteredLocations.length} of ${locations.length} locations`}
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

            {/* SEARCH AND FILTER */}

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <Search
                  size={19}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  aria-label="Search locations"
                  placeholder="Search location, city or address..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                aria-label="Filter by location status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as StatusFilter
                  )
                }
                className={inputClass}
              >
                <option value="all">
                  All Statuses
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </div>
          </div>

          {/* LOADING STATE */}

          {loading ? (
            <div className="flex min-h-60 flex-col items-center justify-center p-8">
              <LoaderCircle
                size={36}
                className="animate-spin text-blue-600"
              />

              <p className="mt-4 text-sm text-slate-500">
                Loading locations...
              </p>
            </div>
          ) : filteredLocations.length === 0 ? (

            /* EMPTY STATE */

            <div className="flex min-h-60 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <MapPinOff size={30} />
              </div>

              <h3 className="mt-4 font-bold">
                {error && locations.length === 0
                  ? "Unable to load locations"
                  : hasFilters
                    ? "No matching locations"
                    : "No locations added yet"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {error && locations.length === 0
                  ? "Refresh the list to try again."
                  : hasFilters
                    ? "Try changing your search or filters."
                    : "Add your first rental pickup location."}
              </p>

              <button
                type="button"
                disabled={busy || showForm}
                onClick={
                  error && locations.length === 0
                    ? () => void loadLocations(true)
                    : hasFilters
                      ? clearFilters
                      : openAddForm
                }
                className={`mt-5 ${primaryButton}`}
              >
                {error && locations.length === 0
                  ? "Try Again"
                  : hasFilters
                    ? "Clear Filters"
                    : "Add Location"}
              </button>
            </div>
          ) : (

            /* LOCATION TABLE */

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-4">
                      Location
                    </th>

                    <th className="px-5 py-4">
                      City
                    </th>

                    <th className="px-5 py-4">
                      Assigned Vehicles
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
                  {filteredLocations.map(
                    (location) => {
                      const hasVehicles =
                        location.totalVehicles > 0;

                      const isUpdating =
                        updatingId === location.id;

                      const actionsDisabled =
                        busy || showForm;

                      return (
                        <tr
                          key={location.id}
                          className="transition hover:bg-slate-50"
                        >

                          {/* LOCATION NAME */}

                          <td className="px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <MapPin size={22} />
                              </div>

                              <div className="max-w-xs">
                                <p className="break-words font-semibold text-slate-900">
                                  {location.name}
                                </p>

                                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-500">
                                  {location.address}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* CITY */}

                          <td className="px-5 py-4">
                            <span className="font-medium text-slate-700">
                              {location.city}
                            </span>
                          </td>

                          {/* VEHICLE COUNT */}

                          <td className="px-5 py-4">
                            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                              <CarFront size={16} />

                              <span className="font-semibold">
                                {location.totalVehicles}
                              </span>
                            </div>
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={location.status}
                            />
                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-2">

                              {/* VIEW */}

                              <button
                                type="button"
                                disabled={actionsDisabled}
                                onClick={() =>
                                  void viewLocation(
                                    location.id
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                <Eye size={15} />
                                View
                              </button>

                              {/* EDIT */}

                              <button
                                type="button"
                                disabled={
                                  actionsDisabled ||
                                  hasVehicles
                                }
                                title={
                                  hasVehicles
                                    ? "Reassign vehicles before editing"
                                    : "Edit location"
                                }
                                onClick={() =>
                                  openEditForm(location)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>

                              {/* ACTIVATE / DEACTIVATE */}

                              <button
                                type="button"
                                disabled={
                                  actionsDisabled ||
                                  (
                                    location.status ===
                                      "active" &&
                                    hasVehicles
                                  )
                                }
                                title={
                                  location.status ===
                                    "active" &&
                                  hasVehicles
                                    ? "Reassign vehicles before deactivating"
                                    : "Change location status"
                                }
                                onClick={() =>
                                  void handleUpdateStatus(
                                    location
                                  )
                                }
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                                  location.status === "active"
                                    ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
                                    : "border-green-100 bg-green-50 text-green-700 hover:bg-green-100"
                                }`}
                              >
                                {isUpdating ? (
                                  <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Power size={14} />
                                )}

                                {isUpdating
                                  ? "Updating..."
                                  : location.status === "active"
                                    ? "Deactivate"
                                    : "Activate"}
                              </button>
                            </div>

                            {hasVehicles && (
                              <p className="mt-2 text-xs text-slate-500">
                                Reassign vehicles before
                                editing or deactivating.
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* LIST FOOTER */}

          {!loading && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
              <p>
                Showing {filteredLocations.length} of{" "}
                {locations.length} locations
              </p>

              <p>
                Only active locations appear in
                the public location list.
              </p>
            </div>
          )}
        </section>

        {/* LOCATION MANAGEMENT INFORMATION */}

        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-800">
            Location Management Information
          </p>

          <p className="mt-2 text-xs leading-relaxed text-blue-700">
            Active locations are available through
            the public location API. Inactive
            locations are hidden. Locations with
            assigned vehicles cannot be edited
            or deactivated until the vehicles are
            removed or reassigned. Location
            records are not permanently deleted.
          </p>
        </div>

        <footer className="py-8 text-center text-xs text-slate-400">
          Car & Bike Rental Management System
        </footer>
      </div>
    </main>
  );
}