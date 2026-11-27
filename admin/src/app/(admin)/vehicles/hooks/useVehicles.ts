"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  getAdminToken,
  getVehicles,
  getLocations,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
  getVehicleStatusLabel,
  type Vehicle,
  type VehicleStatus,
  type VehiclePayload,
  type Location,
} from "@/lib/api";

import {
  emptyForm,
  manualStatuses,
} from "../constants";

import {
  validateVehicleForm,
} from "../validation";

import type {
  VehicleForm,
  VehicleStatsData,
  TypeFilter,
  StatusFilter,
  LocationFilter,
} from "../types";

export function useVehicles() {
  const router = useRouter();

  // ==========================================
  // STATES
  // ==========================================

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [form, setForm] = useState<VehicleForm>({
    ...emptyForm,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [locationFilter, setLocationFilter] =
    useState<LocationFilter>("all");

  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState("");

  const busy =
    loading ||
    refreshing ||
    saving ||
    updatingId !== null;

  // ==========================================
  // LOAD VEHICLES
  // ==========================================

  const loadVehicles = useCallback(
    async (
      isRefresh = false,
      signal?: AbortSignal
    ) => {
      if (isRefresh) {
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

        const response = await getVehicles({}, signal);

        if (!signal?.aborted) {
          setVehicles(response.vehicles);
        }
      } catch (err) {
        if (signal?.aborted) return;

        if (!getAdminToken()) {
          router.replace("/login");
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load vehicles"
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [router]
  );

  // ==========================================
  // LOAD PICKUP LOCATIONS
  // ==========================================

  const loadLocations = useCallback(
    async (signal?: AbortSignal) => {
      setLocationsLoading(true);
      setLocationsError("");

      try {
        if (!getAdminToken()) {
          router.replace("/login");
          return;
        }

        const response = await getLocations(signal);

        if (!signal?.aborted) {
          setLocations(response.locations);
        }
      } catch (err) {
        if (signal?.aborted) return;

        if (!getAdminToken()) {
          router.replace("/login");
          return;
        }

        setLocationsError(
          err instanceof Error
            ? err.message
            : "Failed to load pickup locations"
        );
      } finally {
        if (!signal?.aborted) {
          setLocationsLoading(false);
        }
      }
    },
    [router]
  );

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    void loadVehicles(false, controller.signal);
    void loadLocations(controller.signal);

    return () => controller.abort();
  }, [loadVehicles, loadLocations]);

  // ==========================================
  // REFRESH ALL DATA
  // ==========================================

  async function refreshData() {
    if (busy || showForm || locationsLoading) return;

    await Promise.all([
      loadVehicles(true),
      loadLocations(),
    ]);
  }

  // ==========================================
  // ACTIVE PICKUP LOCATIONS
  // ==========================================

  const activeLocations = useMemo(
    () =>
      locations.filter(
        (location) => location.status === "active"
      ),
    [locations]
  );

  // ==========================================
  // VEHICLE STATISTICS
  // ==========================================

  const stats = useMemo<VehicleStatsData>(() => {
    const result: VehicleStatsData = {
      total: vehicles.length,
      available: 0,
      rented: 0,
      maintenance: 0,
      inactive: 0,
      cars: 0,
      bikes: 0,
    };

    for (const vehicle of vehicles) {
      result[vehicle.status] += 1;

      if (vehicle.type === "car") {
        result.cars += 1;
      } else if (vehicle.type === "bike") {
        result.bikes += 1;
      }
    }

    return result;
  }, [vehicles]);

  // ==========================================
  // SEARCH AND FILTERS
  // ==========================================

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !query ||
        [
          vehicle.name,
          vehicle.brand,
          vehicle.model,
          vehicle.registrationNumber,
          vehicle.location?.name,
          vehicle.location?.city,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query)
        );

      const matchesType =
        typeFilter === "all" ||
        vehicle.type === typeFilter;

      const matchesStatus =
        statusFilter === "all" ||
        vehicle.status === statusFilter;

      const matchesLocation =
        locationFilter === "all" ||
        (locationFilter === "unassigned"
          ? vehicle.locationId === null
          : String(vehicle.locationId) === locationFilter);

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesLocation
      );
    });
  }, [
    vehicles,
    search,
    typeFilter,
    statusFilter,
    locationFilter,
  ]);

  // ==========================================
  // CURRENT EDITING VEHICLE
  // ==========================================

  const editingVehicle =
    editingId === null
      ? null
      : vehicles.find(
          (vehicle) => vehicle.id === editingId
        ) ?? null;

  const isEditingRented =
    editingVehicle?.status === "rented";

  // ==========================================
  // FORM FIELD HANDLERS
  // ==========================================

  function updateField<K extends keyof VehicleForm>(
    field: K,
    value: VehicleForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setFormError("");
  }

  function changeVehicleType(type: "car" | "bike") {
    setForm((previous) => ({
      ...previous,
      type,
      seatingCapacity: type === "car" ? "5" : "2",
    }));

    setFormError("");
  }

  // ==========================================
  // OPEN ADD FORM
  // ==========================================

  function openAddForm() {
    if (busy) return;

    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);

    setError("");
    setFormError("");
    setMessage("");
  }

  // ==========================================
  // OPEN EDIT FORM
  // ==========================================

  function openEditForm(vehicle: Vehicle) {
    if (busy) return;

    setEditingId(vehicle.id);

    setForm({
      name: vehicle.name ?? "",
      type: vehicle.type,
      brand: vehicle.brand ?? "",
      model: vehicle.model ?? "",
      registrationNumber: vehicle.registrationNumber ?? "",
      fuelType: vehicle.fuelType ?? "petrol",
      transmission: vehicle.transmission ?? "manual",
      seatingCapacity: String(vehicle.seatingCapacity ?? ""),
      pricePerDay: String(vehicle.pricePerDay ?? ""),
      description: vehicle.description ?? "",
      image: vehicle.image ?? "",
      locationId: String(vehicle.locationId ?? ""),
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

  // ==========================================
  // CLOSE FORM
  // ==========================================

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
  }

  // ==========================================
  // SAVE VEHICLE
  // ==========================================

  async function saveVehicle(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    setFormError("");
    setMessage("");

    if (editingId !== null && !editingVehicle) {
      setFormError(
        "Vehicle details are unavailable. Refresh the vehicle list and try again."
      );

      return;
    }

    const isNewVehicle = editingId === null;

    const originalLocationId = String(
      editingVehicle?.locationId ?? ""
    );

    const locationChanged =
      form.locationId !== originalLocationId;

    const validationError = validateVehicleForm(
      form,
      isNewVehicle || locationChanged
    );

    if (validationError) {
      setFormError(validationError);
      return;
    }

    // Validate new pickup location
    if (isNewVehicle || locationChanged) {
      if (locationsLoading) {
        setFormError(
          "Please wait while pickup locations are loading."
        );
        return;
      }

      if (locationsError) {
        setFormError(
          "Unable to verify pickup locations. Please reload locations."
        );
        return;
      }

      const selectedLocation = activeLocations.find(
        (location) =>
          String(location.id) === form.locationId
      );

      if (!selectedLocation) {
        setFormError(
          "Please select an active pickup location."
        );
        return;
      }
    }

    // Prevent rented vehicle location changes
    if (isEditingRented && locationChanged) {
      setFormError(
        "Pickup location cannot be changed while the vehicle is rented."
      );
      return;
    }

    // Prepare API payload
    const payload: VehiclePayload = {
      name: form.name.trim(),
      type: form.type,
      brand: form.brand.trim(),
      model: form.model.trim(),

      registrationNumber: form.registrationNumber
        .trim()
        .toUpperCase(),

      fuelType: form.fuelType,
      transmission: form.transmission,
      seatingCapacity: Number(form.seatingCapacity),
      pricePerDay: Number(form.pricePerDay),
      description: form.description.trim() || null,
      image: form.image.trim() || null,
    };

    // Only send location when required
    if (isNewVehicle || locationChanged) {
      payload.locationId = Number(form.locationId);
    }

    // Protect rented vehicle identity
    if (isEditingRented) {
      delete payload.type;
      delete payload.brand;
      delete payload.model;
      delete payload.registrationNumber;
      delete payload.locationId;
    }

    try {
      setSaving(true);
      setError("");

      if (editingId !== null) {
        await updateVehicle(editingId, payload);
      } else {
        await createVehicle(payload);
      }

      setMessage(
        editingId !== null
          ? "Vehicle updated successfully"
          : "Vehicle added successfully"
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      setFormError("");

      await Promise.all([
        loadVehicles(true),
        loadLocations(),
      ]);
    } catch (err) {
      if (!getAdminToken()) {
        router.replace("/login");
        return;
      }

      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to save vehicle"
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // UPDATE VEHICLE STATUS
  // ==========================================

  async function handleUpdateStatus(
    vehicle: Vehicle,
    status: VehicleStatus
  ) {
    if (busy || showForm) return;

    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    if (vehicle.status === status) return;

    if (vehicle.status === "rented") {
      setError(
        "Complete the active rental from the Bookings page before changing this vehicle's status."
      );
      return;
    }

    if (status === "rented") {
      setError(
        "Use Start Rental from the Bookings page to mark a vehicle as rented."
      );
      return;
    }

    if (!manualStatuses.includes(status)) {
      setError("Invalid vehicle status");
      return;
    }

    const confirmed = window.confirm(
      `Change ${vehicle.name} status from ${getVehicleStatusLabel(
        vehicle.status
      )} to ${getVehicleStatusLabel(status)}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(vehicle.id);
      setError("");
      setMessage("");

      await updateVehicleStatus(vehicle.id, status);

      setVehicles((previous) =>
        previous.map((item) =>
          item.id === vehicle.id
            ? { ...item, status }
            : item
        )
      );

      setMessage("Vehicle status updated successfully");

      await loadVehicles(true);
    } catch (err) {
      if (!getAdminToken()) {
        router.replace("/login");
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update vehicle status"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // ==========================================
  // CLEAR FILTERS
  // ==========================================

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setLocationFilter("all");
  }

  const hasFilters =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    locationFilter !== "all";

  // ==========================================
  // RETURN HOOK DATA
  // ==========================================

  return {
    // Data
    vehicles,
    locations,
    activeLocations,
    filteredVehicles,
    stats,

    // Form
    form,
    editingId,
    editingVehicle,
    isEditingRented,
    showForm,

    // Loading states
    loading,
    refreshing,
    saving,
    updatingId,
    busy,
    locationsLoading,

    // Messages
    error,
    formError,
    message,
    locationsError,
    setError,
    setMessage,

    // Filters
    search,
    typeFilter,
    statusFilter,
    locationFilter,
    hasFilters,
    setSearch,
    setTypeFilter,
    setStatusFilter,
    setLocationFilter,

    // Actions
    loadVehicles,
    loadLocations,
    refreshData,
    updateField,
    changeVehicleType,
    openAddForm,
    openEditForm,
    closeForm,
    saveVehicle,
    handleUpdateStatus,
    clearFilters,
  };
}