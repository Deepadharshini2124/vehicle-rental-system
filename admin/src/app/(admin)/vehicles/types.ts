import type { Vehicle, VehicleStatus } from "@/lib/api";

// Vehicle add/edit form
export type VehicleForm = {
  name: string;
  type: "car" | "bike";
  brand: string;
  model: string;
  registrationNumber: string;
  fuelType: string;
  transmission: string;
  seatingCapacity: string;
  pricePerDay: string;
  description: string;
  image: string;
  locationId: string;
};

// Vehicle list API response
export type VehicleListResponse = {
  success: boolean;
  message?: string;
  vehicles?: Vehicle[];
  data?: Vehicle[];
};

// Vehicle filters
export type TypeFilter = "all" | "car" | "bike";

export type StatusFilter = "all" | VehicleStatus;

export type LocationFilter = "all" | "unassigned" | `${number}`;

// Manually manageable vehicle statuses
export type ManualVehicleStatus = Exclude<
  VehicleStatus,
  "rented"
>;

// Vehicle statistics
export type VehicleStatsData = {
  total: number;
  available: number;
  rented: number;
  maintenance: number;
  inactive: number;
  cars: number;
  bikes: number;
};

// Reusable form field handler
export type UpdateVehicleField = <
  K extends keyof VehicleForm
>(
  field: K,
  value: VehicleForm[K]
) => void;