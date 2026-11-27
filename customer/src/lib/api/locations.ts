import { apiRequest } from "./client";

import type {
  PickupLocation,
  PublicLocationsResponse,
} from "./types";

// ==========================================
// PICKUP LOCATION VALIDATION
// ==========================================

function isValidPickupLocation(
  location: unknown
): location is PickupLocation {
  if (
    !location ||
    typeof location !== "object" ||
    Array.isArray(location)
  ) {
    return false;
  }

  const item =
    location as Partial<PickupLocation>;

  return (
    typeof item.id === "number" &&
    Number.isSafeInteger(item.id) &&
    item.id > 0 &&
    item.id <= 4294967295 &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.city === "string" &&
    item.city.trim().length > 0 &&
    typeof item.address === "string" &&
    item.address.trim().length > 0
  );
}

// ==========================================
// GET PUBLIC PICKUP LOCATIONS
// ==========================================

export async function getPublicLocations(
  signal?: AbortSignal
): Promise<PublicLocationsResponse> {
  const response =
    await apiRequest<PublicLocationsResponse>(
      "/api/locations/public",
      {
        method: "GET",
        signal,
      }
    );

  // Validate API response

  if (
    response.success !== true ||
    !Array.isArray(response.locations)
  ) {
    throw new Error(
      response.message ||
        "Unable to load pickup locations"
    );
  }

  // Validate location count

  if (
    !Number.isSafeInteger(response.count) ||
    response.count < 0 ||
    response.count !== response.locations.length
  ) {
    throw new Error(
      "Invalid pickup location count"
    );
  }

  // Validate individual locations

  if (
    !response.locations.every(
      isValidPickupLocation
    )
  ) {
    throw new Error(
      "Invalid pickup location details"
    );
  }

  // Check duplicate location IDs

  const locationIds = new Set(
    response.locations.map(
      (location) => location.id
    )
  );

  if (
    locationIds.size !==
    response.locations.length
  ) {
    throw new Error(
      "Duplicate pickup locations received"
    );
  }

  return response;
}