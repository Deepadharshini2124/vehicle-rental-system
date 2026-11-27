import { apiRequest } from "./client";
import { isValidId } from "./utils";

import type {
  Vehicle,
  VehicleStatus,
  VehicleFilters,
  VehiclePayload,
  VehiclesResponse,
  VehicleDetailsResponse,
  VehicleMutationResponse,
} from "./types";

const VEHICLE_STATUSES: VehicleStatus[] = [
  "available",
  "rented",
  "maintenance",
  "inactive",
];

const EDITABLE_FIELDS = [
  "name",
  "type",
  "brand",
  "model",
  "registrationNumber",
  "fuelType",
  "transmission",
  "seatingCapacity",
  "pricePerDay",
  "description",
  "image",
  "locationId",
] as const;

// Validate vehicle and location IDs
function isValidVehicleId(id: unknown): id is number {
  return (
    typeof id === "number" &&
    isValidId(id) &&
    id <= 4294967295
  );
}

// Validate vehicle response
function validateVehicleData(vehicle: Vehicle): void {
  if (
    !vehicle ||
    !isValidVehicleId(vehicle.id) ||
    typeof vehicle.name !== "string" ||
    !vehicle.name.trim() ||
    !["car", "bike"].includes(vehicle.type) ||
    !VEHICLE_STATUSES.includes(vehicle.status)
  ) {
    throw new Error(
      "Invalid vehicle data received from server"
    );
  }

  // Support existing unassigned vehicles
  if (vehicle.locationId === null) {
    if (vehicle.location !== null) {
      throw new Error(
        "Invalid vehicle location association"
      );
    }

    return;
  }

  const location = vehicle.location;

  if (
    !isValidVehicleId(vehicle.locationId) ||
    !location ||
    location.id !== vehicle.locationId ||
    typeof location.name !== "string" ||
    !location.name.trim() ||
    typeof location.city !== "string" ||
    !location.city.trim() ||
    typeof location.address !== "string" ||
    !location.address.trim() ||
    !["active", "inactive"].includes(location.status)
  ) {
    throw new Error(
      "Invalid pickup location data received from server"
    );
  }
}

// Prepare editable vehicle fields
function prepareVehiclePayload(
  vehicleData: VehiclePayload
): VehiclePayload {
  const payload: VehiclePayload = {};

  for (const field of EDITABLE_FIELDS) {
    if (vehicleData[field] !== undefined) {
      Object.assign(payload, {
        [field]: vehicleData[field],
      });
    }
  }

  return payload;
}

// Validate vehicle mutation response
function validateMutationResponse(
  response: VehicleMutationResponse,
  fallbackMessage: string,
  expectedId?: number,
  expectedLocationId?: number
): VehicleMutationResponse {
  if (
    response.success !== true ||
    !response.vehicle
  ) {
    throw new Error(
      response.message || fallbackMessage
    );
  }

  validateVehicleData(response.vehicle);

  if (
    expectedId !== undefined &&
    response.vehicle.id !== expectedId
  ) {
    throw new Error("Invalid vehicle response");
  }

  if (
    expectedLocationId !== undefined &&
    response.vehicle.locationId !== expectedLocationId
  ) {
    throw new Error(
      "Vehicle pickup location does not match the selected location"
    );
  }

  return response;
}

// ==========================================
// GET ALL VEHICLES
// ==========================================

export async function getVehicles(
  filters: VehicleFilters = {},
  signal?: AbortSignal
): Promise<VehiclesResponse> {
  const params = new URLSearchParams();

  if (filters.type !== undefined) {
    if (!["car", "bike"].includes(filters.type)) {
      throw new Error("Invalid vehicle type");
    }

    params.set("type", filters.type);
  }

  if (filters.status !== undefined) {
    if (!VEHICLE_STATUSES.includes(filters.status)) {
      throw new Error("Invalid vehicle status");
    }

    params.set("status", filters.status);
  }

  if (filters.locationId !== undefined) {
    if (!isValidVehicleId(filters.locationId)) {
      throw new Error("Invalid pickup location ID");
    }

    params.set(
      "locationId",
      String(filters.locationId)
    );
  }

  const query = params.toString();

  const response = await apiRequest<VehiclesResponse>(
    query ? `/api/vehicles?${query}` : "/api/vehicles",
    {
      method: "GET",
      signal,
    }
  );

  if (
    response.success !== true ||
    !Array.isArray(response.vehicles) ||
    response.count !== response.vehicles.length
  ) {
    throw new Error(
      response.message || "Failed to fetch vehicles"
    );
  }

  response.vehicles.forEach(validateVehicleData);

  return response;
}

// ==========================================
// GET VEHICLE DETAILS
// ==========================================

export async function getVehicleById(
  id: number,
  signal?: AbortSignal
): Promise<VehicleDetailsResponse> {
  if (!isValidVehicleId(id)) {
    throw new Error("Invalid vehicle ID");
  }

  const response = await apiRequest<VehicleDetailsResponse>(
    `/api/vehicles/${id}`,
    {
      method: "GET",
      signal,
    }
  );

  if (
    response.success !== true ||
    !response.vehicle
  ) {
    throw new Error(
      response.message || "Failed to fetch vehicle details"
    );
  }

  validateVehicleData(response.vehicle);

  if (response.vehicle.id !== id) {
    throw new Error("Invalid vehicle details response");
  }

  return response;
}

// ==========================================
// CREATE VEHICLE
// ==========================================

export async function createVehicle(
  vehicleData: VehiclePayload
): Promise<VehicleMutationResponse> {
  const payload = prepareVehiclePayload(vehicleData);

  // Pickup location is mandatory for new vehicles
  if (!isValidVehicleId(payload.locationId)) {
    throw new Error(
      "Please select a valid pickup location"
    );
  }

  const response = await apiRequest<VehicleMutationResponse>(
    "/api/vehicles",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return validateMutationResponse(
    response,
    "Failed to add vehicle",
    undefined,
    payload.locationId
  );
}

// ==========================================
// UPDATE VEHICLE
// ==========================================

export async function updateVehicle(
  id: number,
  vehicleData: VehiclePayload
): Promise<VehicleMutationResponse> {
  if (!isValidVehicleId(id)) {
    throw new Error("Invalid vehicle ID");
  }

  const payload = prepareVehiclePayload(vehicleData);

  // Validate location only when provided
  const locationId = payload.locationId;

  if (
    locationId !== undefined &&
    !isValidVehicleId(locationId)
  ) {
    throw new Error(
      "Please select a valid pickup location"
    );
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(
      "No vehicle details provided for update"
    );
  }

  const response = await apiRequest<VehicleMutationResponse>(
    `/api/vehicles/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );

  return validateMutationResponse(
    response,
    "Failed to update vehicle",
    id,
    locationId
  );
}

// ==========================================
// UPDATE VEHICLE STATUS
// ==========================================

export async function updateVehicleStatus(
  id: number,
  status: VehicleStatus
): Promise<VehicleMutationResponse> {
  if (!isValidVehicleId(id)) {
    throw new Error("Invalid vehicle ID");
  }

  if (!VEHICLE_STATUSES.includes(status)) {
    throw new Error("Invalid vehicle status");
  }

  // Rented status is managed through bookings
  if (status === "rented") {
    throw new Error(
      "Use Start Rental from the Bookings page to mark a vehicle as rented"
    );
  }

  const response = await apiRequest<
    Omit<VehicleMutationResponse, "vehicle"> & {
      vehicle: Omit<Vehicle, "location">;
    }
  >(
    `/api/vehicles/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

  if (
    response.success !== true ||
    !response.vehicle ||
    response.vehicle.id !== id ||
    response.vehicle.status !== status
  ) {
    throw new Error(
      response.message || "Failed to update vehicle status"
    );
  }

  // Fetch complete vehicle with pickup location
  const details = await getVehicleById(id);

  return {
    ...response,
    vehicle: details.vehicle,
  };
}