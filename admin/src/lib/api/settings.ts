import { apiRequest } from "./client";

import type {
  SettingsResponse,
  UpdateSettingsPayload,
} from "./types";

// ==========================================
// VALIDATE SETTINGS RESPONSE
// ==========================================

function validateSettingsResponse(
  response: SettingsResponse
): SettingsResponse {
  if (
    response.success !== true ||
    !response.settings
  ) {
    throw new Error(
      response.message || "Invalid settings response"
    );
  }

  const settings = response.settings;

  if (
    settings.id !== 1 ||
    typeof settings.businessName !== "string" ||
    !Number.isInteger(settings.minRentalDays) ||
    !Number.isInteger(settings.maxRentalDays) ||
    settings.minRentalDays < 1 ||
    settings.maxRentalDays > 366 ||
    settings.minRentalDays > settings.maxRentalDays ||
    typeof settings.allowCancellation !== "boolean"
  ) {
    throw new Error(
      "Invalid settings data received from server"
    );
  }

  return response;
}

// ==========================================
// GET BUSINESS SETTINGS
// ==========================================

export async function getSettings(): Promise<SettingsResponse> {
  const response = await apiRequest<SettingsResponse>(
    "/api/admin/settings"
  );

  return validateSettingsResponse(response);
}

// ==========================================
// UPDATE BUSINESS SETTINGS
// ==========================================

export async function updateSettings(
  payload: UpdateSettingsPayload
): Promise<SettingsResponse> {
  const businessName = payload.businessName.trim();

  const businessEmail =
    payload.businessEmail?.trim().toLowerCase() || null;

  const businessPhone =
    payload.businessPhone?.trim() || null;

  const businessAddress =
    payload.businessAddress?.trim() || null;

  const termsAndConditions =
    payload.termsAndConditions?.trim() || null;

  const {
    minRentalDays,
    maxRentalDays,
    allowCancellation,
  } = payload;

  // Validate business name
  if (!businessName || businessName.length > 150) {
    throw new Error(
      "Business name is required and must not exceed 150 characters"
    );
  }

  // Validate business email
  if (
    businessEmail &&
    (
      businessEmail.length > 150 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)
    )
  ) {
    throw new Error("Enter a valid business email");
  }

  // Validate business phone
  if (
    businessPhone &&
    !/^\+?[0-9]{10,15}$/.test(businessPhone)
  ) {
    throw new Error(
      "Enter a valid business phone number"
    );
  }

  // Validate business address
  if (
    businessAddress &&
    businessAddress.length > 2000
  ) {
    throw new Error(
      "Business address must not exceed 2000 characters"
    );
  }

  // Validate minimum rental days
  if (
    !Number.isInteger(minRentalDays) ||
    minRentalDays < 1 ||
    minRentalDays > 366
  ) {
    throw new Error(
      "Minimum rental days must be between 1 and 366"
    );
  }

  // Validate maximum rental days
  if (
    !Number.isInteger(maxRentalDays) ||
    maxRentalDays < 1 ||
    maxRentalDays > 366
  ) {
    throw new Error(
      "Maximum rental days must be between 1 and 366"
    );
  }

  // Validate rental duration range
  if (minRentalDays > maxRentalDays) {
    throw new Error(
      "Minimum rental days cannot exceed maximum rental days"
    );
  }

  // Validate cancellation policy
  if (typeof allowCancellation !== "boolean") {
    throw new Error("Invalid cancellation setting");
  }

  // Validate terms and conditions
  if (
    termsAndConditions &&
    termsAndConditions.length > 10000
  ) {
    throw new Error(
      "Terms and conditions must not exceed 10000 characters"
    );
  }

  // Prepare normalized payload
  const normalizedPayload: UpdateSettingsPayload = {
    businessName,
    businessEmail,
    businessPhone,
    businessAddress,
    minRentalDays,
    maxRentalDays,
    allowCancellation,
    termsAndConditions,
  };

  const response = await apiRequest<SettingsResponse>(
    "/api/admin/settings",
    {
      method: "PUT",
      body: JSON.stringify(normalizedPayload),
    }
  );

  return validateSettingsResponse(response);
}