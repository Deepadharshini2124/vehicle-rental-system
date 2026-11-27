import { apiRequest, jsonRequest } from "./client";
import { requireCustomerToken } from "./session";
import { getPublicSettings } from "./settings";

import {
  ensure,
  validateId,
  calculateRentalDays,
  getTodayDate,
  isValidDate,
  validateRentalDuration,
  MAX_RENTAL_DAYS,
  EMAIL_REGEX,
  PHONE_REGEX,
} from "./utils";

import type {
  Booking,
  BookingStatus,
  CreateBookingPayload,
  CreateBookingResponse,
  MyBookingsResponse,
  CancelBookingResponse,
} from "./types";

// ==========================================
// CONSTANTS
// ==========================================

const MAX_UNSIGNED_ID = 4294967295;

const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "rejected",
  "cancelled",
];

// ==========================================
// LOCATION VALIDATION
// ==========================================

function isValidLocationId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= MAX_UNSIGNED_ID
  );
}

function validateLocationId(locationId: number): void {
  ensure(
    isValidLocationId(locationId),
    "Please select a valid pickup location"
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// ==========================================
// BOOKING LOCATION SNAPSHOT VALIDATION
// ==========================================

function validateBookingLocation(booking: Booking): void {
  // Historical bookings created before location integration.
  if (booking.locationId === null) {
    ensure(
      booking.pickupLocation === null &&
        booking.pickupLocationName === null &&
        booking.pickupLocationCity === null &&
        booking.pickupLocationAddress === null,
      "Invalid historical booking location"
    );

    return;
  }

  validateLocationId(booking.locationId);

  const location = booking.pickupLocation;

  if (!location) {
    throw new Error("Booking pickup location details are missing");
  }

  ensure(
    location.id === booking.locationId,
    "Invalid booking pickup location ID"
  );

  ensure(
    isNonEmptyString(location.name) &&
      isNonEmptyString(location.city) &&
      isNonEmptyString(location.address),
    "Invalid booking pickup location details"
  );

  ensure(
    booking.pickupLocationName === location.name &&
      booking.pickupLocationCity === location.city &&
      booking.pickupLocationAddress === location.address,
    "Booking pickup location snapshot mismatch"
  );
}

// ==========================================
// BOOKING RESPONSE VALIDATION
// ==========================================

function validateBookingResponse(booking: Booking): void {
  ensure(
    booking !== null && typeof booking === "object",
    "Invalid booking response"
  );

  validateId(booking.id, "booking");
  validateId(booking.vehicleId, "vehicle");

  ensure(
    BOOKING_STATUSES.includes(booking.status),
    "Invalid booking status"
  );

  ensure(
    isValidDate(booking.startDate) &&
      isValidDate(booking.endDate) &&
      booking.endDate > booking.startDate,
    "Invalid booking rental dates"
  );

  const totalDays = calculateRentalDays(
    booking.startDate,
    booking.endDate
  );

  ensure(
    Number.isSafeInteger(booking.totalDays) &&
      booking.totalDays > 0 &&
      booking.totalDays === totalDays,
    "Invalid booking rental duration"
  );

  const totalAmount = Number(booking.totalAmount);

  ensure(
    (
      typeof booking.totalAmount === "number" ||
      (
        typeof booking.totalAmount === "string" &&
        booking.totalAmount.trim() !== ""
      )
    ) &&
      Number.isFinite(totalAmount) &&
      totalAmount >= 0,
    "Invalid booking rental amount"
  );

  validateBookingLocation(booking);
}

// ==========================================
// NORMALIZE BOOKING RESPONSE
// ==========================================

function normalizeBooking(booking: Booking): Booking {
  validateBookingResponse(booking);

  return {
    ...booking,

    // Preserve historical location details.
    locationId: booking.locationId,
    pickupLocationName: booking.pickupLocationName,
    pickupLocationCity: booking.pickupLocationCity,
    pickupLocationAddress: booking.pickupLocationAddress,
    pickupLocation: booking.pickupLocation,

    // Maintain compatibility with existing customer UI.
    contactEmail: booking.contactEmail ?? "",
    vehicle: booking.vehicle ?? undefined,
  };
}

// ==========================================
// CREATE BOOKING
// ==========================================

export async function createBooking(
  payload: CreateBookingPayload
): Promise<CreateBookingResponse> {
  const token = requireCustomerToken(
    "Please login to continue booking"
  );

  // Validate vehicle and pickup location.
  validateId(payload.vehicleId, "vehicle");
  validateLocationId(payload.locationId);

  // Validate rental dates.
  ensure(
    isValidDate(payload.startDate) &&
      isValidDate(payload.endDate),
    "Please select valid pickup and return dates"
  );

  ensure(
    payload.startDate >= getTodayDate(),
    "Pickup date cannot be in the past"
  );

  ensure(
    payload.endDate > payload.startDate,
    "Return date must be after the pickup date"
  );

  const totalDays = calculateRentalDays(
    payload.startDate,
    payload.endDate
  );

  ensure(
    Number.isSafeInteger(totalDays) &&
      totalDays > 0 &&
      totalDays <= MAX_RENTAL_DAYS,
    "Invalid rental duration"
  );

  // Normalize customer contact details.
  const contactName = payload.contactName.trim();
  const contactPhone = payload.contactPhone.trim();
  const contactEmail = payload.contactEmail
    .trim()
    .toLowerCase();

  ensure(
    contactName.length > 0 &&
      contactName.length <= 100,
    "Please enter a valid contact name"
  );

  ensure(
    PHONE_REGEX.test(contactPhone),
    "Please enter a valid contact phone number"
  );

  ensure(
    contactEmail.length <= 150 &&
      (!contactEmail || EMAIL_REGEX.test(contactEmail)),
    "Please enter a valid email address"
  );

  // Fetch latest admin rental rules.
  const { settings } = await getPublicSettings();

  validateRentalDuration(totalDays, settings);

  // Prevent requests using a changed customer session.
  ensure(
    requireCustomerToken(
      "Please login to continue booking"
    ) === token,
    "Customer session has changed. Please try again."
  );

  // Check the pickup date again after fetching settings.
  ensure(
    payload.startDate >= getTodayDate(),
    "Pickup date cannot be in the past"
  );

  // Backend performs final transactional validation:
  // 1. Pickup location exists.
  // 2. Pickup location is active.
  // 3. Vehicle belongs to selected location.
  // 4. Vehicle is available for selected dates.
  // 5. Rental policy is valid.
  // 6. Booking location snapshot is saved.
  const response = await jsonRequest<CreateBookingResponse>(
    "/api/bookings",
    "POST",
    {
      vehicleId: payload.vehicleId,
      locationId: payload.locationId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      contactName,
      contactPhone,
      contactEmail,
    }
  );

  ensure(
    response.success === true && response.booking,
    response.message || "Failed to create booking"
  );

  // A successful POST may already have created a booking.
  // Do not automatically retry if response validation fails.
  try {
    const booking = normalizeBooking(response.booking);

    ensure(
      booking.vehicleId === payload.vehicleId,
      "Booked vehicle does not match the selected vehicle"
    );

    ensure(
      booking.locationId === payload.locationId &&
        booking.pickupLocation !== null,
      "Booked pickup location does not match the selected location"
    );

    ensure(
      booking.startDate === payload.startDate &&
        booking.endDate === payload.endDate,
      "Booking dates do not match the selected dates"
    );

    ensure(
      booking.totalDays === totalDays,
      "Booking rental duration mismatch"
    );

    ensure(
      Number(booking.totalAmount) > 0,
      "Invalid booking total amount"
    );

    ensure(
      booking.status === "pending",
      "Unexpected new booking status"
    );

    return {
      ...response,
      booking,
    };
  } catch (error) {
    console.error("Booking response validation failed", error);

    throw new Error(
      "Booking may have been created, but its details could not be verified. Please check My Bookings before trying again."
    );
  }
}

// ==========================================
// GET CUSTOMER BOOKING HISTORY
// ==========================================

export async function getMyBookings(): Promise<MyBookingsResponse> {
  const token = requireCustomerToken(
    "Please login to view your bookings"
  );

  // Correct customer booking history endpoint.
  const response = await apiRequest<MyBookingsResponse>(
    "/api/bookings/my"
  );

  ensure(
    requireCustomerToken(
      "Please login to view your bookings"
    ) === token,
    "Customer session has changed. Please try again."
  );

  ensure(
    response.success === true &&
      Array.isArray(response.bookings),
    response.message || "Invalid booking history response"
  );

  ensure(
    Number.isSafeInteger(response.count) &&
      response.count === response.bookings.length,
    "Invalid booking history count"
  );

  const bookings = response.bookings
    .map(normalizeBooking)
    .sort((a, b) => b.id - a.id);

  return {
    ...response,
    count: bookings.length,
    bookings,
  };
}

// ==========================================
// CANCEL CUSTOMER BOOKING
// ==========================================

export async function cancelBooking(
  id: number
): Promise<CancelBookingResponse> {
  const token = requireCustomerToken(
    "Please login to cancel your booking"
  );

  validateId(id, "booking");

  // Check latest cancellation settings.
  const { settings } = await getPublicSettings();

  ensure(
    settings.allowCancellation,
    "Booking cancellation is currently disabled. Please contact support."
  );

  ensure(
    requireCustomerToken(
      "Please login to cancel your booking"
    ) === token,
    "Customer session has changed. Please try again."
  );

  const response = await apiRequest<CancelBookingResponse>(
    `/api/bookings/${id}/cancel`,
    {
      method: "PATCH",
    }
  );

  ensure(
    response.success === true,
    response.message || "Failed to cancel booking"
  );

  // Some successful cancellation responses may not include
  // the complete booking object.
  if (!response.booking) {
    return response;
  }

  try {
    const booking = normalizeBooking(response.booking);

    ensure(
      booking.id === id,
      "Cancelled booking ID mismatch"
    );

    ensure(
      booking.status === "cancelled",
      "Unexpected cancelled booking status"
    );

    return {
      ...response,
      booking,
    };
  } catch (error) {
    console.error(
      "Cancellation response validation failed",
      error
    );

    throw new Error(
      "Cancellation may have been completed. Please refresh My Bookings to verify the latest status."
    );
  }
}

// ==========================================
// BOOKING STATUS LABELS
// ==========================================

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// ==========================================
// BOOKING STATUS MESSAGES
// ==========================================

const STATUS_MESSAGES: Record<BookingStatus, string> = {
  pending:
    "Your booking request is awaiting admin confirmation.",

  confirmed:
    "Your booking is confirmed. Please collect your vehicle on the pickup date.",

  in_progress:
    "Your rental has started. Please return the vehicle on the scheduled return date.",

  completed:
    "Your rental has been completed successfully.",

  rejected:
    "Your booking request has been rejected.",

  cancelled:
    "This booking has been cancelled.",
};

// ==========================================
// BOOKING STATUS HELPERS
// ==========================================

export function getBookingStatusLabel(
  status: BookingStatus
): string {
  return STATUS_LABELS[status] || "Unknown";
}

export function getBookingStatusMessage(
  status: BookingStatus
): string {
  return (
    STATUS_MESSAGES[status] ||
    "Booking status is unavailable."
  );
}

// ==========================================
// BOOKING CANCELLATION HELPER
// ==========================================

export function canCancelBooking(
  booking: Booking,
  allowCancellation = true
): boolean {
  return (
    allowCancellation &&
    booking.status === "pending"
  );
}