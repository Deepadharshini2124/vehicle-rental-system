
import { apiRequest } from "./client";

import {
  ensure,
  validateId,
  isValidDate,
  getTodayDate,
  calculateRentalDays,
  formatDate,
  validateRentalDuration,
  MAX_RENTAL_DAYS,
  DAY_MS,
} from "./utils";

import type {
  BackendAvailabilityResponse,
  AvailabilityResponse,
  AvailabilityDayStatus,
  AvailabilityCalendarDay,
  RentalInfo,
} from "./types";

const VEHICLE_STATUSES = [
  "available", "rented", "maintenance", "inactive",
];

const CALENDAR_STATUSES = [
  "available", "booked", "past", "vehicle_unavailable",
];

function validateAvailabilityResponse(
  data: BackendAvailabilityResponse,
  vehicleId: number,
  startDate: string,
  endDate: string,
  totalDays: number
) {
  ensure(
    data.success === true &&
    data.vehicle?.id === vehicleId &&
    VEHICLE_STATUSES.includes(data.vehicle.status) &&
    data.dateRange?.startDate === startDate &&
    data.dateRange?.endDate === endDate &&
    data.bookingPolicy?.endDateExclusive === true &&
    Array.isArray(data.calendar) &&
    Array.isArray(data.bookedRanges) &&
    data.calendar.length === totalDays,
    "Invalid availability API response"
  );

  const startTime = Date.parse(`${startDate}T00:00:00Z`);

  ensure(
    data.calendar.every((day, index) => {
      const expectedDate = new Date(startTime + index * DAY_MS)
        .toISOString().slice(0, 10);

      return day && typeof day === "object" &&
        day.date === expectedDate &&
        typeof day.available === "boolean" &&
        CALENDAR_STATUSES.includes(day.status) &&
        day.available === (day.status === "available");
    }),
    "Invalid availability calendar response"
  );

  ensure(
    data.totalDays === undefined || data.totalDays === totalDays,
    "Invalid rental duration received from server"
  );

  validateRentalDuration(totalDays, data.bookingPolicy);
}

export async function checkVehicleAvailability(
  vehicleId: number,
  startDate: string,
  endDate: string,
  signal?: AbortSignal
): Promise<AvailabilityResponse> {
  validateId(vehicleId);

  ensure(isValidDate(startDate) && isValidDate(endDate),
    "Please select valid pickup and return dates");

  ensure(startDate >= getTodayDate(), "Pickup date cannot be in the past");

  const totalDays = calculateRentalDays(startDate, endDate);

  ensure(totalDays > 0, "Return date must be after pickup date");
  ensure(totalDays <= MAX_RENTAL_DAYS,
    `Maximum rental date range is ${MAX_RENTAL_DAYS} days`);

  const params = new URLSearchParams({ startDate, endDate });

  const data = await apiRequest<BackendAvailabilityResponse>(
    `/api/vehicles/${vehicleId}/availability?${params.toString()}`,
    { method: "GET", signal }
  );

  validateAvailabilityResponse(data, vehicleId, startDate, endDate, totalDays);

  const blockedDays = data.calendar.filter(day => !day.available);
  const unavailableDates = blockedDays.map(day => day.date);

  const status = data.vehicle.status;
  const rental = data.rentalInfo;
  const expectedReturn = rental?.expectedReturnDate;

  const isMaintenance = status === "maintenance";
  const isInactive = status === "inactive";
  const isOverdue = rental?.isOverdue === true;
  const hasConflict = rental?.hasStatusConflict === true;

  const validCurrentRental =
    status === "rented" &&
    data.bookingPolicy.allowFutureBookingsWhileRented === true &&
    rental?.isCurrentlyRented === true &&
    rental.isOverdue === false &&
    rental.hasStatusConflict === false &&
    typeof expectedReturn === "string" &&
    isValidDate(expectedReturn) &&
    expectedReturn > getTodayDate();

  const overlapsCurrentRental =
    status === "rented" &&
    typeof expectedReturn === "string" &&
    startDate < expectedReturn;

  const available =
    (status === "available" || validCurrentRental) &&
    !isMaintenance &&
    !isInactive &&
    !isOverdue &&
    !hasConflict &&
    !overlapsCurrentRental &&
    blockedDays.length === 0 &&
    data.available !== false;

  let message = "Vehicle is available for your selected dates";

  if (!available) {
    if (hasConflict)
      message = "Vehicle rental status requires admin verification. Please try again later.";

    else if (isMaintenance)
      message = "This vehicle is currently under maintenance";

    else if (isInactive)
      message = "This vehicle is currently unavailable for booking";

    else if (isOverdue)
      message = "This vehicle has an overdue rental. New bookings are temporarily unavailable.";

    else if (rental?.unavailableReason)
      message = rental.unavailableReason;

    else if (status === "rented" && !validCurrentRental)
      message = "This vehicle is currently not accepting future bookings";

    else if (overlapsCurrentRental && expectedReturn)
      message = `Vehicle is currently rented. Select a pickup date on or after ${formatDate(expectedReturn)}.`;

    else if (blockedDays.some(day => day.status === "past"))
      message = "Selected dates cannot be in the past";

    else if (blockedDays.some(day => day.status === "vehicle_unavailable"))
      message = data.message || "This vehicle is currently not accepting bookings";

    else if (unavailableDates.length > 0) {
      const dates = unavailableDates.slice(0, 5).map(formatDate).join(", ");
      const remaining = unavailableDates.length - 5;

      message = `Vehicle is unavailable on: ${dates}` +
        (remaining > 0 ? ` and ${remaining} more date(s)` : "");
    } else {
      message = data.available === false && data.message
        ? data.message
        : "Vehicle is unavailable for the selected dates";
    }
  }

  const price = Number(data.vehicle.pricePerDay);

  ensure(
    data.vehicle.pricePerDay !== null &&
    String(data.vehicle.pricePerDay).trim() !== "" &&
    Number.isFinite(price) && price > 0,
    "Invalid vehicle rental price"
  );

  const totalAmount = Math.round(totalDays * price * 100) / 100;

  ensure(
    Number.isFinite(totalAmount) &&
    totalAmount > 0 &&
    totalAmount <= 99999999.99,
    "Invalid total rental amount"
  );

  return {
    ...data,
    available,
    message,
    totalDays,
    totalAmount,
    unavailableDates,
  };
}

export function getEarliestPickupDate(rental?: RentalInfo): string | null {
  const today = getTodayDate();

  if (!rental) return today;

  if (rental.isOverdue || rental.hasStatusConflict || rental.unavailableReason)
    return null;

  if (rental.isCurrentlyRented) {
    const date = rental.expectedReturnDate;
    return date && isValidDate(date) && date > today ? date : null;
  }

  return today;
}

const DAY_LABELS: Record<AvailabilityDayStatus, string> = {
  available: "Available",
  booked: "Booked",
  past: "Past Date",
  vehicle_unavailable: "Unavailable",
};

export function getAvailabilityDayLabel(status: AvailabilityDayStatus): string {
  return DAY_LABELS[status] || "Unknown";
}

export function isCalendarDateAvailable(
  calendar: AvailabilityCalendarDay[],
  date: string
): boolean {
  if (!isValidDate(date) || date < getTodayDate()) return false;

  return calendar.find(day => day.date === date)?.available === true;
}
