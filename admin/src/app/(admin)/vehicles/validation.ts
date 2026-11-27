import { fuelTypes, transmissions } from "./constants";
import type { VehicleForm } from "./types";

// Validate pickup location ID
export function isValidLocationId(value: string): boolean {
  const id = Number(value);

  return (
    /^[1-9]\d*$/.test(value) &&
    Number.isSafeInteger(id) &&
    id <= 4294967295
  );
}

// Validate vehicle form
export function validateVehicleForm(
  form: VehicleForm,
  requireLocation = true
): string | null {
  // Required text fields
  if (!form.name.trim()) {
    return "Vehicle name is required";
  }

  if (!form.brand.trim()) {
    return "Brand is required";
  }

  if (!form.model.trim()) {
    return "Model is required";
  }

  if (!form.registrationNumber.trim()) {
    return "Registration number is required";
  }

  // Vehicle type
  if (form.type !== "car" && form.type !== "bike") {
    return "Select a valid vehicle type";
  }

  // Fuel type
  if (!fuelTypes.includes(form.fuelType)) {
    return "Select a valid fuel type";
  }

  // Transmission
  if (!transmissions.includes(form.transmission)) {
    return "Select a valid transmission";
  }

  // Seating capacity
  const seatingCapacity = Number(form.seatingCapacity);

  if (
    !form.seatingCapacity.trim() ||
    !Number.isSafeInteger(seatingCapacity) ||
    seatingCapacity <= 0
  ) {
    return "Enter a valid seating capacity";
  }

  // Pickup location
  if (
    requireLocation &&
    !form.locationId.trim()
  ) {
    return "Please select a pickup location";
  }

  if (
    form.locationId.trim() &&
    !isValidLocationId(form.locationId)
  ) {
    return "Select a valid pickup location";
  }

  // Daily rental price
  const pricePerDay = Number(form.pricePerDay);

  if (
    !form.pricePerDay.trim() ||
    !Number.isFinite(pricePerDay) ||
    pricePerDay <= 0 ||
    pricePerDay > 99999999.99
  ) {
    return "Enter a valid daily rental price";
  }

  // Maximum two decimal places
  if (
    Math.abs(
      pricePerDay * 100 -
        Math.round(pricePerDay * 100)
    ) > 0.00001
  ) {
    return "Daily rental price can have a maximum of two decimal places";
  }

  return null;
}