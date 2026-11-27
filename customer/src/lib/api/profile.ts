
import { apiRequest, jsonRequest } from "./client";

import {
  getCustomerToken,
  getCustomerUser,
  saveCustomerSession,
  requireCustomerToken,
} from "./session";

import { ensure, PHONE_REGEX, validateNewPassword } from "./utils";

import type {
  CustomerProfileResponse,
  UpdateCustomerProfilePayload,
  ChangeCustomerPasswordPayload,
  ChangeCustomerPasswordResponse,
} from "./types";

function syncProfile(response: CustomerProfileResponse, token: string) {
  const profile = response.profile;

  ensure(
    response.success === true &&
    profile &&
    Number.isSafeInteger(profile.id) && profile.id > 0 &&
    Number.isSafeInteger(profile.userId) && profile.userId > 0 &&
    typeof profile.name === "string" &&
    typeof profile.email === "string" &&
    typeof profile.phone === "string" &&
    (profile.address === null || typeof profile.address === "string") &&
    profile.role === "customer" &&
    profile.status === "active",
    "Invalid customer profile response"
  );

  if (getCustomerToken() === token) {
    saveCustomerSession(token, {
      ...getCustomerUser(),
      id: profile.userId,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      role: "customer",
    });
  }

  return response;
}

export async function getCustomerProfile(
  signal?: AbortSignal
): Promise<CustomerProfileResponse> {
  const token = requireCustomerToken("Please login to view your profile");

  const response = await apiRequest<CustomerProfileResponse>(
    "/api/customers/profile", { method: "GET", signal }
  );

  return syncProfile(response, token);
}

export async function updateCustomerProfile(
  payload: UpdateCustomerProfilePayload
): Promise<CustomerProfileResponse> {
  const token = requireCustomerToken("Please login to update your profile");

  const name = payload.name.trim();
  const phone = payload.phone.trim();
  const address = payload.address?.trim() || null;

  ensure(name && name.length <= 100, "Please enter a valid name");
  ensure(PHONE_REGEX.test(phone), "Please enter a valid phone number");
  ensure(!address || address.length <= 2000,
    "Address cannot exceed 2000 characters");

  const response = await jsonRequest<CustomerProfileResponse>(
    "/api/customers/profile", "PUT", { name, phone, address }
  );

  return syncProfile(response, token);
}

export async function changeCustomerPassword(
  payload: ChangeCustomerPasswordPayload
): Promise<ChangeCustomerPasswordResponse> {
  requireCustomerToken("Please login to change your password");

  const { currentPassword, newPassword, confirmPassword } = payload;

  ensure(currentPassword && newPassword && confirmPassword,
    "All password fields are required");

  ensure(newPassword.length >= 8 && newPassword.trim(),
    "New password must contain at least 8 characters");

  ensure(new TextEncoder().encode(newPassword).length <= 72,
    "New password must not exceed 72 bytes");

  ensure(new TextEncoder().encode(currentPassword).length <= 4096,
    "Invalid current password");

  ensure(newPassword === confirmPassword, "New passwords do not match");
  ensure(currentPassword !== newPassword,
    "New password must be different from current password");

  const response = await jsonRequest<ChangeCustomerPasswordResponse>(
    "/api/customers/profile/password", "PATCH",
    { currentPassword, newPassword, confirmPassword }
  );

  ensure(response.success === true,
    response.message || "Failed to change password");

  return response;
}
