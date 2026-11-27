// ==========================================
// ADMIN TYPES
// ==========================================

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "customer";
};

export type LoginResponse = {
  success: boolean;
  message?: string;
  token: string;
  user: AdminUser;
};

// ==========================================
// PICKUP LOCATION TYPES
// ==========================================

export type LocationStatus =
  | "active"
  | "inactive";

export type PickupLocation = {
  id: number;
  name: string;
  city: string;
  address: string;
};

export type VehicleLocation = PickupLocation & {
  status: LocationStatus;
};

// ==========================================
// VEHICLE TYPES
// ==========================================

export type VehicleStatus =
  | "available"
  | "rented"
  | "maintenance"
  | "inactive";

export type Vehicle = {
  id: number;
  name: string;
  type: "car" | "bike";
  brand: string;
  model: string;
  registrationNumber: string;
  fuelType: string | null;
  transmission: string | null;
  seatingCapacity: number | null;
  pricePerDay: number | string;
  status: VehicleStatus;
  description: string | null;
  image: string | null;

  // Current assigned pickup location
  locationId: number | null;
  location: VehicleLocation | null;

  createdAt?: string;
  updatedAt?: string;
};

export type VehicleFilters = {
  type?: "car" | "bike";
  status?: VehicleStatus;
  locationId?: number;
};

export type VehiclesResponse = {
  success: boolean;
  message?: string;
  count: number;
  vehicles: Vehicle[];
};

export type VehicleDetailsResponse = {
  success: boolean;
  message?: string;
  vehicle: Vehicle;
};

export type VehicleMutationResponse = {
  success: boolean;
  message: string;
  vehicle: Vehicle;
};

export type VehiclePayload = Partial<
  Omit<
    Vehicle,
    | "id"
    | "status"
    | "location"
    | "createdAt"
    | "updatedAt"
  >
>;

// ==========================================
// BOOKING TYPES
// ==========================================

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "rejected"
  | "completed"
  | "cancelled";

export type BookingActionStatus =
  | "confirmed"
  | "rejected"
  | "in_progress"
  | "completed";

// ==========================================
// BOOKING LOCATION SNAPSHOT
// ==========================================

export type BookingLocationSnapshot = {
  locationId: number | null;
  pickupLocationName: string | null;
  pickupLocationCity: string | null;
  pickupLocationAddress: string | null;
  pickupLocation: PickupLocation | null;
};

// ==========================================
// COMMON BOOKING INFORMATION
// ==========================================

export type BookingBase = {
  id: number;
  userId: number;
  vehicleId: number;

  startDate: string;
  endDate: string;

  totalDays: number;
  totalAmount: number | string;

  status: BookingStatus;

  contactName: string;
  contactPhone?: string;
  contactEmail?: string | null;

  createdAt: string;
};

// ==========================================
// COMPLETE BOOKING
// ==========================================

export type Booking =
  BookingBase & BookingLocationSnapshot;

// ==========================================
// BOOKING API RESPONSES
// ==========================================

export type BookingListResponse = {
  success: boolean;
  message?: string;
  count?: number;
  bookings?: Booking[];
  data?: Booking[];
};

export type BookingDetailsResponse = {
  success: boolean;
  message?: string;
  booking: Booking;
};

export type BookingUpdateResponse = {
  success: boolean;
  message?: string;
  booking: Booking;

  vehicle?: {
    id: number;
    name: string;
    status: VehicleStatus;
  };
};

// ==========================================
// DASHBOARD TYPES
// ==========================================

export type DashboardVehicle = {
  id: number;
  name: string;
  type: "car" | "bike";
  brand: string;
  model: string;
  registrationNumber: string;
  status: VehicleStatus;
};

// Dashboard endpoints may return partial
// booking location information.

export type DashboardBooking =
  BookingBase &
  Partial<BookingLocationSnapshot> & {
    vehicle: DashboardVehicle | null;
  };

export type DashboardOperations = {
  todayPickups: number;
  todayReturns: number;
  activeRentals: number;
  overdueRentals: number;
  missedPickups: number;
};

export type DashboardRentalValue = {
  pending: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  total: number;
};

export type DashboardData = {
  date: string;

  vehicles: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    inactive: number;
    cars: number;
    bikes: number;
  };

  customers: {
    total: number;
  };

  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    rejected: number;
  };

  operations: DashboardOperations;

  rentalValue: DashboardRentalValue;

  recentBookings: DashboardBooking[];
  todayPickups: DashboardBooking[];
  todayReturns: DashboardBooking[];
  activeRentals: DashboardBooking[];
  overdueRentals: DashboardBooking[];
  missedPickups: DashboardBooking[];
};

export type DashboardResponse = {
  success: boolean;
  message: string;
  dashboard: DashboardData;
};

// ==========================================
// CUSTOMER TYPES
// ==========================================

export type CustomerStatus =
  | "active"
  | "blocked"
  | "legacy"
  | "unknown";

export type Customer = {
  id: number;
  userId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  address?: string | null;
  createdAt?: string;
  status: CustomerStatus;
  totalBookings: number;
};

export type CustomersResponse = {
  success: boolean;
  count: number;
  customers: Customer[];
};

// Customer details endpoint may return
// bookings without the formatted snapshot.

export type CustomerBooking =
  BookingBase &
  Partial<BookingLocationSnapshot>;

export type CustomerDetailsResponse = {
  success: boolean;
  customer: Customer;
  bookings: CustomerBooking[];
};

// ==========================================
// SETTINGS TYPES
// ==========================================

export type Settings = {
  id: number;
  businessName: string;
  businessEmail: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  minRentalDays: number;
  maxRentalDays: number;
  allowCancellation: boolean;
  termsAndConditions: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SettingsResponse = {
  success: boolean;
  message: string;
  settings: Settings;
};

export type UpdateSettingsPayload = {
  businessName: string;
  businessEmail: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  minRentalDays: number;
  maxRentalDays: number;
  allowCancellation: boolean;
  termsAndConditions: string | null;
};

// ==========================================
// LOCATION TYPES
// ==========================================

export type Location = PickupLocation & {
  status: LocationStatus;
  totalVehicles: number;
  createdAt?: string;
  updatedAt?: string;
};

export type LocationVehicle = Pick<
  Vehicle,
  | "id"
  | "name"
  | "type"
  | "brand"
  | "status"
  | "pricePerDay"
>;

export type LocationDetails = Location & {
  vehicles: LocationVehicle[];
};

export type LocationsResponse = {
  success: boolean;
  message?: string;
  count: number;
  locations: Location[];
};

export type LocationDetailsResponse = {
  success: boolean;
  message?: string;
  location: LocationDetails;
};

export type LocationMutationResponse = {
  success: boolean;
  message: string;
  location: Location;
};

export type LocationPayload = {
  name: string;
  city: string;
  address: string;
};