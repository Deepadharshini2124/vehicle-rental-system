import { apiRequest } from "./client";
import { isValidId } from "./utils";

import type {
  Location,
  LocationStatus,
  LocationPayload,
  LocationsResponse,
  LocationDetailsResponse,
  LocationMutationResponse,
} from "./types";

// ==========================================
// LOCATION ID VALIDATION
// ==========================================

function isValidLocationId(id: number): boolean {
  return isValidId(id) && id <= 4294967295;
}

// ==========================================
// LOCATION PAYLOAD VALIDATION
// ==========================================

function validateLocationPayload(
  payload: LocationPayload
): LocationPayload {
  const name = payload.name.trim();
  const city = payload.city.trim();
  const address = payload.address.trim();

  if (!name || name.length > 150) {
    throw new Error(
      "Location name is required and must not exceed 150 characters"
    );
  }

  if (!city || city.length > 100) {
    throw new Error(
      "City is required and must not exceed 100 characters"
    );
  }

  if (!address || address.length > 2000) {
    throw new Error(
      "Address is required and must not exceed 2000 characters"
    );
  }

  return {
    name,
    city,
    address,
  };
}

// ==========================================
// LOCATION RESPONSE VALIDATION
// ==========================================

function validateLocationData(
  location: Location
): void {
  if (
    !location ||
    !isValidId(location.id) ||
    typeof location.name !== "string" ||
    !location.name.trim() ||
    typeof location.city !== "string" ||
    !location.city.trim() ||
    typeof location.address !== "string" ||
    !location.address.trim() ||
    !["active", "inactive"].includes(location.status) ||
    !Number.isSafeInteger(location.totalVehicles) ||
    location.totalVehicles < 0
  ) {
    throw new Error(
      "Invalid location data received from server"
    );
  }
}

// Common mutation response validation
function validateMutationResponse(
  response: LocationMutationResponse,
  fallbackMessage: string
): LocationMutationResponse {
  if (
    response.success !== true ||
    !response.location
  ) {
    throw new Error(
      response.message || fallbackMessage
    );
  }

  validateLocationData(response.location);

  return response;
}

// ==========================================
// GET ALL LOCATIONS
// ==========================================

export async function getLocations(
  signal?: AbortSignal
): Promise<LocationsResponse> {
  const response = await apiRequest<LocationsResponse>(
    "/api/locations",
    {
      method: "GET",
      signal,
    }
  );

  if (
    response.success !== true ||
    !Array.isArray(response.locations) ||
    response.count !== response.locations.length
  ) {
    throw new Error(
      response.message || "Failed to fetch locations"
    );
  }

  response.locations.forEach(validateLocationData);

  return response;
}

// ==========================================
// GET LOCATION DETAILS
// ==========================================

export async function getLocationById(
  id: number,
  signal?: AbortSignal
): Promise<LocationDetailsResponse> {
  if (!isValidLocationId(id)) {
    throw new Error("Invalid location ID");
  }

  const response = await apiRequest<LocationDetailsResponse>(
    `/api/locations/${id}`,
    {
      method: "GET",
      signal,
    }
  );

  if (
    response.success !== true ||
    !response.location
  ) {
    throw new Error(
      response.message ||
        "Failed to fetch location details"
    );
  }

  validateLocationData(response.location);

  const location = response.location;

  if (
    location.id !== id ||
    !Array.isArray(location.vehicles) ||
    location.totalVehicles !== location.vehicles.length
  ) {
    throw new Error(
      "Invalid location details response"
    );
  }

  return response;
}

// ==========================================
// CREATE LOCATION
// ==========================================

export async function createLocation(
  payload: LocationPayload
): Promise<LocationMutationResponse> {
  const normalizedPayload =
    validateLocationPayload(payload);

  const response = await apiRequest<LocationMutationResponse>(
    "/api/locations",
    {
      method: "POST",
      body: JSON.stringify(normalizedPayload),
    }
  );

  return validateMutationResponse(
    response,
    "Failed to create location"
  );
}

// ==========================================
// UPDATE LOCATION
// ==========================================

export async function updateLocation(
  id: number,
  payload: LocationPayload
): Promise<LocationMutationResponse> {
  if (!isValidLocationId(id)) {
    throw new Error("Invalid location ID");
  }

  const normalizedPayload =
    validateLocationPayload(payload);

  const response = await apiRequest<LocationMutationResponse>(
    `/api/locations/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(normalizedPayload),
    }
  );

  const result = validateMutationResponse(
    response,
    "Failed to update location"
  );

  if (result.location.id !== id) {
    throw new Error(
      "Invalid updated location response"
    );
  }

  return result;
}

// ==========================================
// UPDATE LOCATION STATUS
// ==========================================

export async function updateLocationStatus(
  id: number,
  status: LocationStatus
): Promise<LocationMutationResponse> {
  if (!isValidLocationId(id)) {
    throw new Error("Invalid location ID");
  }

  if (status !== "active" && status !== "inactive") {
    throw new Error("Invalid location status");
  }

  const response = await apiRequest<LocationMutationResponse>(
    `/api/locations/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

  const result = validateMutationResponse(
    response,
    "Failed to update location status"
  );

  if (
    result.location.id !== id ||
    result.location.status !== status
  ) {
    throw new Error(
      "Invalid location status response"
    );
  }

  return result;
}