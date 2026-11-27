import { API_BASE_URL, apiRequest } from "./client";
import { ensure, validateId } from "./utils";

import type {
  VehicleStatus,
  VehicleFilters,
  VehiclesResponse,
  VehicleDetailsResponse,
} from "./types";

// ==========================================
// VEHICLE STATUS VALIDATION
// ==========================================

const VEHICLE_STATUSES: VehicleStatus[] = [
  "available",
  "rented",
  "maintenance",
  "inactive",
];

// ==========================================
// GET VEHICLES WITH FILTERS
// ==========================================

export async function getVehicles(
  filters: VehicleFilters = {},
  signal?: AbortSignal
): Promise<VehiclesResponse> {
  const params = new URLSearchParams();

  // Vehicle type filter

  if (filters.type !== undefined) {
    ensure(
      filters.type === "car" ||
        filters.type === "bike",
      "Invalid vehicle type"
    );

    params.set("type", filters.type);
  }

  // Vehicle status filter

  if (filters.status !== undefined) {
    ensure(
      VEHICLE_STATUSES.includes(filters.status),
      "Invalid vehicle status"
    );

    params.set("status", filters.status);
  }

  // Pickup location filter

  if (filters.locationId !== undefined) {
    validateId(filters.locationId);

    ensure(
      Number.isSafeInteger(filters.locationId) &&
        filters.locationId > 0 &&
        filters.locationId <= 4294967295,
      "Invalid pickup location ID"
    );

    params.set(
      "locationId",
      String(filters.locationId)
    );
  }

  // Build API endpoint

  const query = params.toString();

  const endpoint = query
    ? `/api/vehicles?${query}`
    : "/api/vehicles";

  // Fetch vehicles

  const response =
    await apiRequest<VehiclesResponse>(
      endpoint,
      {
        method: "GET",
        signal,
      }
    );

  // Validate response

  ensure(
    response.success === true &&
      Array.isArray(response.vehicles),
    "Invalid vehicle list response"
  );

  // Validate vehicle count

  if (response.count !== undefined) {
    ensure(
      Number.isSafeInteger(response.count) &&
        response.count >= 0 &&
        response.count === response.vehicles.length,
      "Invalid vehicle count"
    );
  }

  // Validate requested pickup location

  if (filters.locationId !== undefined) {
    ensure(
      response.vehicles.every(
        (vehicle) =>
          vehicle.locationId === filters.locationId &&
          vehicle.location?.id === filters.locationId
      ),
      "Invalid vehicle pickup location"
    );
  }

  return response;
}

// ==========================================
// GET VEHICLE DETAILS
// ==========================================

export async function getVehicleById(
  id: number,
  signal?: AbortSignal
): Promise<VehicleDetailsResponse> {
  validateId(id);

  const response =
    await apiRequest<VehicleDetailsResponse>(
      `/api/vehicles/${id}`,
      {
        method: "GET",
        signal,
      }
    );

  ensure(
    response.success === true &&
      response.vehicle?.id === id,
    "Invalid vehicle details response"
  );

  return response;
}

// ==========================================
// GET VEHICLE IMAGE
// ==========================================

export function getVehicleImage(
  image?: string | null
): string | null {
  if (!image?.trim()) {
    return null;
  }

  const path = image
    .trim()
    .replace(/\\/g, "/");

  // External image URL

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Absolute backend image path

  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }

  // Existing uploads path

  if (path.startsWith("uploads/")) {
    return `${API_BASE_URL}/${path}`;
  }

  // Default uploads directory

  return `${API_BASE_URL}/uploads/${path}`;
}

// ==========================================
// VEHICLE BOOKING ELIGIBILITY
// ==========================================

export function canBookVehicle(
  status: VehicleStatus
): boolean {
  return (
    status === "available" ||
    status === "rented"
  );
}

// ==========================================
// VEHICLE STATUS LABELS
// ==========================================

const STATUS_LABELS: Record<
  VehicleStatus,
  string
> = {
  available: "Available",
  rented: "Currently Rented",
  maintenance: "Under Maintenance",
  inactive: "Unavailable",
};

// ==========================================
// VEHICLE STATUS MESSAGES
// ==========================================

const STATUS_MESSAGES: Record<
  VehicleStatus,
  string
> = {
  available:
    "Select your rental dates to check availability.",

  rented:
    "This vehicle is currently rented. Check future dates for availability.",

  maintenance:
    "This vehicle is currently under maintenance and cannot accept bookings.",

  inactive:
    "This vehicle is currently unavailable for booking.",
};

// ==========================================
// GET VEHICLE STATUS LABEL
// ==========================================

export function getVehicleStatusLabel(
  status: VehicleStatus
): string {
  return STATUS_LABELS[status] || "Unknown";
}

// ==========================================
// GET VEHICLE STATUS MESSAGE
// ==========================================

export function getVehicleStatusMessage(
  status: VehicleStatus
): string {
  return (
    STATUS_MESSAGES[status] ||
    "Vehicle availability is unknown."
  );
}