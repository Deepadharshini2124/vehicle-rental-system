
import { apiRequest } from "./client";
import { ensure, validateRentalPolicy } from "./utils";
import type { PublicSettingsResponse } from "./types";

export async function getPublicSettings(
  signal?: AbortSignal
): Promise<PublicSettingsResponse> {
  const response = await apiRequest<PublicSettingsResponse>(
    "/api/settings/public",
    { method: "GET", signal }
  );

  const settings = response.settings;

  ensure(
    response.success === true &&
    settings &&
    typeof settings.businessName === "string" &&
    settings.businessName.trim(),
    "Invalid business settings response"
  );

  const optionalFields = [
    settings.businessEmail,
    settings.businessPhone,
    settings.businessAddress,
    settings.termsAndConditions,
  ];

  ensure(
    optionalFields.every(value => value === null || typeof value === "string"),
    "Invalid business settings details"
  );

  validateRentalPolicy(settings);

  return response;
}
