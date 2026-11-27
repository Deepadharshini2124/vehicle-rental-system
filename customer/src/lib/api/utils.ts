
import type { RentalPolicy } from "./types";

export const MAX_RENTAL_DAYS = 366;
export const DAY_MS = 86400000;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[0-9]{10,15}$/;
export const RESET_TOKEN_REGEX = /^[a-f0-9]{64}$/;

export function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function validateId(id: number, type = "vehicle") {
  ensure(Number.isSafeInteger(id) && id > 0, `Invalid ${type} ID`);
}

export function validateResetEmail(email: string): string {
  const value = email.trim().toLowerCase();

  ensure(
    value.length <= 150 && EMAIL_REGEX.test(value),
    "Please enter a valid email address"
  );

  return value;
}

export function validateNewPassword(
  password: string,
  confirmPassword: string,
  changingPassword = false
) {
  const label = changingPassword ? "New password" : "Password";

  ensure(password && confirmPassword, "All password fields are required");
  ensure(password.length >= 8 && password.trim(),
    `${label} must contain at least 8 characters`);
  ensure(new TextEncoder().encode(password).length <= 72,
    `${label} must not exceed 72 bytes`);
  ensure(password === confirmPassword,
    changingPassword ? "New passwords do not match" : "Passwords do not match");
}

export function isValidDate(value: string): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

export function getTodayDate(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function addDaysToDate(value: string, days: number): string {
  ensure(isValidDate(value) && Number.isSafeInteger(days), "Invalid date");

  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  ensure(Number.isFinite(date.getTime()), "Invalid date");

  const result = date.toISOString().slice(0, 10);
  ensure(isValidDate(result), "Date is outside the supported range");

  return result;
}

export function formatDate(value: string): string {
  if (!value) return "-";

  const date = value.slice(0, 10);
  if (!isValidDate(date)) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function calculateRentalDays(startDate: string, endDate: string): number {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return 0;

  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const days = (end - start) / DAY_MS;

  return Number.isFinite(days) && days > 0 ? days : 0;
}

export function formatCurrency(amount: number | string): string {
  const value = Number(amount);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function validateRentalPolicy(policy: RentalPolicy) {
  ensure(
    policy &&
    Number.isInteger(policy.minRentalDays) &&
    Number.isInteger(policy.maxRentalDays) &&
    policy.minRentalDays >= 1 &&
    policy.maxRentalDays <= MAX_RENTAL_DAYS &&
    policy.minRentalDays <= policy.maxRentalDays &&
    typeof policy.allowCancellation === "boolean",
    "Invalid rental settings received from server"
  );
}

export function validateRentalDuration(days: number, policy: RentalPolicy) {
  validateRentalPolicy(policy);

  ensure(Number.isInteger(days) && days > 0, "Invalid rental duration");

  ensure(days >= policy.minRentalDays,
    `Minimum rental period is ${policy.minRentalDays} day(s)`);

  ensure(days <= policy.maxRentalDays,
    `Maximum rental period is ${policy.maxRentalDays} day(s)`);
}
