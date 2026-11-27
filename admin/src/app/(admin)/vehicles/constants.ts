import type { VehicleStatus } from "@/lib/api";

import type {
  VehicleForm,
  ManualVehicleStatus,
} from "./types";

// Default vehicle form
export const emptyForm: VehicleForm = {
  name: "",
  type: "car",
  brand: "",
  model: "",
  registrationNumber: "",
  fuelType: "petrol",
  transmission: "manual",
  seatingCapacity: "5",
  pricePerDay: "",
  description: "",
  image: "",
  locationId: "",
};

// Manually manageable vehicle statuses
export const manualStatuses: ManualVehicleStatus[] = [
  "available",
  "maintenance",
  "inactive",
];

// All vehicle statuses
export const allStatuses: VehicleStatus[] = [
  "available",
  "rented",
  "maintenance",
  "inactive",
];

// Fuel type options
export const fuelTypes = [
  "petrol",
  "diesel",
  "electric",
  "cng",
];

// Transmission options
export const transmissions = [
  "manual",
  "automatic",
];

// Vehicle status badge colors
export const statusColors: Record<VehicleStatus, string> = {
  available: "bg-green-100 text-green-700",
  rented: "bg-orange-100 text-orange-700",
  maintenance: "bg-amber-100 text-amber-700",
  inactive: "bg-slate-100 text-slate-600",
};

// Common input styles
export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70";

// Common label styles
export const labelClass =
  "mb-2 block text-sm font-medium text-slate-700";