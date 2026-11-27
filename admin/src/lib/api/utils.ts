import { API_BASE_URL } from "./client";

import type {
  BookingStatus,
  VehicleStatus,
  LocationStatus,
} from "./types";

// ==========================================
// COMMON ID VALIDATION
// ==========================================

export function isValidId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

// ==========================================
// CURRENCY FORMATTING
// ==========================================

export function formatCurrency(
  amount: number | string
): string {
  const value = Number(amount);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

// ==========================================
// DATE FORMATTING
// ==========================================

export function formatDate(value: string): string {
  if (!value) return "-";

  const dateValue = value.slice(0, 10);
  const date = new Date(`${dateValue}T00:00:00Z`);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// ==========================================
// TODAY DATE - INDIA TIMEZONE
// ==========================================

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

// ==========================================
// STATUS LABELS
// ==========================================

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
};

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: "Available",
  rented: "Rented",
  maintenance: "Maintenance",
  inactive: "Inactive",
};

const LOCATION_STATUS_LABELS: Record<LocationStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

// Booking status label
export function getBookingStatusLabel(
  status: BookingStatus
): string {
  return BOOKING_STATUS_LABELS[status] || "Unknown";
}

// Vehicle status label
export function getVehicleStatusLabel(
  status: VehicleStatus
): string {
  return VEHICLE_STATUS_LABELS[status] || "Unknown";
}

// Location status label
export function getLocationStatusLabel(
  status: LocationStatus
): string {
  return LOCATION_STATUS_LABELS[status] || "Unknown";
}

// ==========================================
// VEHICLE IMAGE URL
// ==========================================

export function getVehicleImage(
  image?: string | null
): string | null {
  if (!image || !image.trim()) {
    return null;
  }

  const path = image.trim().replace(/\\/g, "/");

  // External image URL
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // Absolute backend path
  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }

  // Uploads directory path
  if (path.startsWith("uploads/")) {
    return `${API_BASE_URL}/${path}`;
  }

  // Image filename
  return `${API_BASE_URL}/uploads/${path}`;
}