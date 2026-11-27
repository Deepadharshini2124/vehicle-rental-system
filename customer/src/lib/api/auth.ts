
import { jsonRequest } from "./client";
import { saveCustomerSession, clearCustomerSession } from "./session";

import {
  ensure,
  validateResetEmail,
  validateNewPassword,
  RESET_TOKEN_REGEX,
} from "./utils";

import type {
  LoginResponse,
  MessageResponse,
  ForgotPasswordResponse,
  VerifyOTPResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
} from "./types";

export async function customerLogin(
  email: string,
  password: string
): Promise<LoginResponse> {
  const data = await jsonRequest<LoginResponse>("/api/auth/login", "POST", {
    email: email.trim().toLowerCase(),
    password,
  });

  ensure(data.success === true, data.message || "Login failed");
  ensure(data.user?.role === "customer", "Only customers can access this panel");
  ensure(typeof data.token === "string" && data.token.trim(),
    "Authentication token is missing");

  saveCustomerSession(data.token, data.user);
  return data;
}

export function customerRegister(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  return jsonRequest<MessageResponse>("/api/auth/register", "POST", {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    password: data.password,
  });
}

export function customerLogout(): void {
  clearCustomerSession();
}

export async function forgotCustomerPassword(
  email: string
): Promise<ForgotPasswordResponse> {
  const response = await jsonRequest<ForgotPasswordResponse>(
    "/api/auth/forgot-password", "POST",
    { email: validateResetEmail(email) }
  );

  ensure(response.success === true, response.message || "Unable to request OTP");

  ensure(
    Number.isSafeInteger(response.expiresIn) && response.expiresIn > 0 &&
    Number.isSafeInteger(response.resendAfter) && response.resendAfter >= 0,
    "Invalid OTP response from server"
  );

  return response;
}

export async function verifyCustomerResetOTP(
  email: string,
  otp: string
): Promise<VerifyOTPResponse> {
  const normalizedEmail = validateResetEmail(email);
  const normalizedOTP = otp.trim();

  ensure(/^[0-9]{6}$/.test(normalizedOTP), "Please enter a valid 6-digit OTP");

  const response = await jsonRequest<VerifyOTPResponse>(
    "/api/auth/verify-otp", "POST",
    { email: normalizedEmail, otp: normalizedOTP }
  );

  ensure(response.success === true, response.message || "OTP verification failed");

  ensure(
    typeof response.resetToken === "string" &&
    RESET_TOKEN_REGEX.test(response.resetToken) &&
    Number.isSafeInteger(response.expiresIn) && response.expiresIn > 0,
    "Invalid password reset response"
  );

  return response;
}

export async function resetCustomerPassword(
  payload: ResetPasswordPayload
): Promise<ResetPasswordResponse> {
  const email = validateResetEmail(payload.email);
  const { resetToken, newPassword, confirmPassword } = payload;

  ensure(
    typeof resetToken === "string" && RESET_TOKEN_REGEX.test(resetToken),
    "Invalid password reset token. Please start again."
  );

  validateNewPassword(newPassword, confirmPassword);

  const response = await jsonRequest<ResetPasswordResponse>(
    "/api/auth/reset-password", "POST",
    { email, resetToken, newPassword, confirmPassword }
  );

  ensure(response.success === true, response.message || "Password reset failed");

  return response;
}
