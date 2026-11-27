import { apiRequest } from "./client";
import { isValidId } from "./utils";

import type {
  Booking,
  BookingStatus,
  BookingActionStatus,
  BookingListResponse,
  BookingDetailsResponse,
  BookingUpdateResponse,
} from "./types";

// ==========================================
// CONSTANTS
// ==========================================

const ALLOWED_ACTIONS: BookingActionStatus[] = [
  "confirmed",
  "rejected",
  "in_progress",
  "completed",
];

const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "rejected",
  "completed",
  "cancelled",
];

const MAX_UNSIGNED_ID = 4294967295;

// ==========================================
// VALIDATION HELPERS
// ==========================================

function isValidLocationId(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= MAX_UNSIGNED_ID
  );
}

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

// ==========================================
// BOOKING LOCATION VALIDATION
// ==========================================

function validateBookingLocation(
  booking: Booking
): void {
  const {
    locationId,
    pickupLocationName,
    pickupLocationCity,
    pickupLocationAddress,
    pickupLocation,
  } = booking;

  // Historical bookings created before
  // pickup location integration.

  if (locationId === null) {
    if (
      pickupLocationName !== null ||
      pickupLocationCity !== null ||
      pickupLocationAddress !== null ||
      pickupLocation !== null
    ) {
      throw new Error(
        `Booking #${booking.id} has inconsistent location details`
      );
    }

    return;
  }

  // Validate assigned location ID.

  if (!isValidLocationId(locationId)) {
    throw new Error(
      `Booking #${booking.id} has an invalid pickup location ID`
    );
  }

  // Validate saved location fields.

  if (
    !isNonEmptyString(pickupLocationName) ||
    !isNonEmptyString(pickupLocationCity) ||
    !isNonEmptyString(pickupLocationAddress)
  ) {
    throw new Error(
      `Booking #${booking.id} has incomplete pickup location details`
    );
  }

  // Validate formatted location snapshot.

  if (
    !pickupLocation ||
    typeof pickupLocation !== "object"
  ) {
    throw new Error(
      `Booking #${booking.id} is missing its pickup location snapshot`
    );
  }

  if (
    !isValidLocationId(pickupLocation.id) ||
    pickupLocation.id !== locationId
  ) {
    throw new Error(
      `Booking #${booking.id} has a pickup location ID mismatch`
    );
  }

  if (
    !isNonEmptyString(pickupLocation.name) ||
    !isNonEmptyString(pickupLocation.city) ||
    !isNonEmptyString(pickupLocation.address)
  ) {
    throw new Error(
      `Booking #${booking.id} has an invalid pickup location snapshot`
    );
  }

  // Ensure formatted snapshot matches
  // the saved database fields.

  if (
    pickupLocation.name !== pickupLocationName ||
    pickupLocation.city !== pickupLocationCity ||
    pickupLocation.address !== pickupLocationAddress
  ) {
    throw new Error(
      `Booking #${booking.id} has inconsistent pickup location information`
    );
  }
}

// ==========================================
// BOOKING RESPONSE VALIDATION
// ==========================================

function validateBooking(
  booking: Booking
): Booking {
  if (
    !booking ||
    typeof booking !== "object"
  ) {
    throw new Error(
      "Invalid booking response"
    );
  }

  if (!isValidId(booking.id)) {
    throw new Error(
      "Invalid booking ID in response"
    );
  }

  if (!isValidId(booking.vehicleId)) {
    throw new Error(
      `Booking #${booking.id} has an invalid vehicle ID`
    );
  }

  if (!isValidId(booking.userId)) {
    throw new Error(
      `Booking #${booking.id} has an invalid customer ID`
    );
  }

  if (
    !BOOKING_STATUSES.includes(
      booking.status
    )
  ) {
    throw new Error(
      `Booking #${booking.id} has an invalid status`
    );
  }

  if (
    !Number.isInteger(booking.totalDays) ||
    booking.totalDays < 1
  ) {
    throw new Error(
      `Booking #${booking.id} has an invalid rental duration`
    );
  }

  if (
    typeof booking.totalAmount !== "number" &&
    !isNonEmptyString(booking.totalAmount)
  ) {
    throw new Error(
      `Booking #${booking.id} has an invalid rental amount`
    );
  }

  const amount = Number(
    booking.totalAmount
  );

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      `Booking #${booking.id} has an invalid rental amount`
    );
  }

  validateBookingLocation(booking);

  return booking;
}

// ==========================================
// GET ALL BOOKINGS
// ==========================================

export async function getAllBookings(): Promise<BookingListResponse> {
  const response =
    await apiRequest<BookingListResponse>(
      "/api/bookings"
    );

  if (response.success !== true) {
    throw new Error(
      response.message ||
        "Failed to load bookings"
    );
  }

  // Support both existing response formats.

  const bookingList =
    response.bookings ?? response.data;

  if (!Array.isArray(bookingList)) {
    throw new Error(
      "Invalid booking list response"
    );
  }

  if (
    response.count !== undefined &&
    response.count !== bookingList.length
  ) {
    throw new Error(
      "Booking count does not match the booking list"
    );
  }

  const bookings = bookingList.map(
    validateBooking
  );

  // Preserve both response formats
  // for existing admin components.

  return {
    ...response,
    count: bookings.length,
    bookings,
    data: bookings,
  };
}

// ==========================================
// GET BOOKING DETAILS
// ==========================================

export async function getBookingById(
  id: number
): Promise<BookingDetailsResponse> {
  if (!isValidId(id)) {
    throw new Error(
      "Invalid booking ID"
    );
  }

  const response =
    await apiRequest<BookingDetailsResponse>(
      `/api/bookings/${id}`
    );

  if (
    response.success !== true ||
    !response.booking
  ) {
    throw new Error(
      response.message ||
        "Failed to load booking details"
    );
  }

  const booking = validateBooking(
    response.booking
  );

  if (booking.id !== id) {
    throw new Error(
      "Booking ID does not match the requested booking"
    );
  }

  return {
    ...response,
    booking,
  };
}

// ==========================================
// UPDATE BOOKING STATUS
// ==========================================

export async function updateBookingStatus(
  id: number,
  status: BookingStatus
): Promise<BookingUpdateResponse> {
  if (!isValidId(id)) {
    throw new Error(
      "Invalid booking ID"
    );
  }

  if (
    !ALLOWED_ACTIONS.some(
      (action) => action === status
    )
  ) {
    throw new Error(
      "Invalid booking action status"
    );
  }

  const response =
    await apiRequest<BookingUpdateResponse>(
      `/api/bookings/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      }
    );

  if (response.success !== true) {
    throw new Error(
      response.message ||
        "Failed to update booking status"
    );
  }

  // The server may have already updated
  // the booking before response validation.

  try {
    if (!response.booking) {
      throw new Error(
        "Updated booking is missing"
      );
    }

    const booking = validateBooking(
      response.booking
    );

    if (booking.id !== id) {
      throw new Error(
        "Updated booking ID mismatch"
      );
    }

    if (booking.status !== status) {
      throw new Error(
        "Updated booking status mismatch"
      );
    }

    // Return the complete booking,
    // including its saved location snapshot.

    return {
      ...response,
      booking,
    };
  } catch (error) {
    console.error(
      "Booking update response validation failed:",
      error
    );

    throw new Error(
      "Booking status may have been updated. Please refresh the booking details before trying again."
    );
  }
}

// ==========================================
// CONFIRM BOOKING
// ==========================================

export async function confirmBooking(
  id: number
): Promise<BookingUpdateResponse> {
  return updateBookingStatus(
    id,
    "confirmed"
  );
}

// ==========================================
// REJECT BOOKING
// ==========================================

export async function rejectBooking(
  id: number
): Promise<BookingUpdateResponse> {
  return updateBookingStatus(
    id,
    "rejected"
  );
}

// ==========================================
// START RENTAL
// ==========================================

export async function startRental(
  id: number
): Promise<BookingUpdateResponse> {
  return updateBookingStatus(
    id,
    "in_progress"
  );
}

// ==========================================
// COMPLETE RENTAL
// ==========================================

export async function completeRental(
  id: number
): Promise<BookingUpdateResponse> {
  return updateBookingStatus(
    id,
    "completed"
  );
}