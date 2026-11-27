// ==========================================
// COMMON API TYPES
// ==========================================

export type ApiResponse = {
  success: boolean;
  message?: string;
};

export type MessageResponse = {
  success: boolean;
  message: string;
};

// ==========================================
// CUSTOMER TYPES
// ==========================================

export type CustomerUser = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "admin";
};

export type LoginResponse = ApiResponse & {
  token: string;
  user: CustomerUser;
};

export type CustomerProfile = {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  role: "customer";
  status: "active" | "blocked";
  createdAt: string;
};

export type CustomerProfileResponse = MessageResponse & {
  profile: CustomerProfile;
};

export type UpdateCustomerProfilePayload = Pick<
  CustomerProfile,
  "name" | "phone" | "address"
>;

// ==========================================
// PASSWORD TYPES
// ==========================================

export type ForgotPasswordResponse = MessageResponse & {
  expiresIn: number;
  resendAfter: number;
};

export type VerifyOTPResponse = MessageResponse & {
  resetToken: string;
  expiresIn: number;
};

export type ResetPasswordPayload = {
  email: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
};

export type ResetPasswordResponse = MessageResponse;

export type ChangeCustomerPasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangeCustomerPasswordResponse = MessageResponse;

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

export type PublicLocationsResponse = ApiResponse & {
  count: number;
  locations: PickupLocation[];
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
  registrationNumber?: string;
  fuelType?: string;
  transmission?: string;
  seatingCapacity?: number;
  pricePerDay: number | string;
  status: VehicleStatus;
  description?: string;
  image?: string | null;

  // Pickup location
  locationId: number | null;
  location: VehicleLocation | null;
};

export type VehicleFilters = {
  type?: "car" | "bike";
  status?: VehicleStatus;
  locationId?: number;
};

export type VehiclesResponse = {
  success: boolean;
  message?: string;
  count?: number;
  vehicles: Vehicle[];
};

export type VehicleDetailsResponse = {
  success: boolean;
  message?: string;
  vehicle: Vehicle;
};

// ==========================================
// SETTINGS TYPES
// ==========================================

export type RentalPolicy = {
  minRentalDays: number;
  maxRentalDays: number;
  allowCancellation: boolean;
};

export type PublicSettings = RentalPolicy & {
  businessName: string;
  businessEmail: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  termsAndConditions: string | null;
};

export type PublicSettingsResponse = MessageResponse & {
  settings: PublicSettings;
};

// ==========================================
// AVAILABILITY TYPES
// ==========================================

export type AvailabilityDayStatus =
  | "available"
  | "booked"
  | "past"
  | "vehicle_unavailable";

export type AvailabilityCalendarDay = {
  date: string;
  available: boolean;
  status: AvailabilityDayStatus;
};

export type BookedRange = {
  id: number;
  startDate: string;
  endDate: string;
  status: string;
};

export type RentalInfo = {
  isCurrentlyRented: boolean;
  isOverdue: boolean;
  hasStatusConflict: boolean;
  expectedReturnDate: string | null;
  unavailableReason: string | null;
};

export type BackendAvailabilityResponse = ApiResponse & {
  available?: boolean;

  vehicle: Pick<
    Vehicle,
    "id" | "name" | "type" | "pricePerDay" | "status"
  >;

  dateRange: {
    startDate: string;
    endDate: string;
  };

  bookingPolicy: RentalPolicy & {
    activeStatuses: string[];
    endDateExclusive: boolean;
    allowFutureBookingsWhileRented?: boolean;
  };

  rentalInfo?: RentalInfo;
  totalDays?: number;
  unavailableDates?: string[];
  bookedRanges: BookedRange[];
  calendar: AvailabilityCalendarDay[];
};

export type AvailabilityResponse = BackendAvailabilityResponse & {
  available: boolean;
  message: string;
  totalDays: number;
  totalAmount: number;
  unavailableDates: string[];
};

// ==========================================
// BOOKING STATUS TYPES
// ==========================================

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "rejected"
  | "completed"
  | "cancelled";

// ==========================================
// BOOKING LOCATION SNAPSHOT
// ==========================================

export type BookingLocationSnapshot = PickupLocation;

// ==========================================
// CREATE BOOKING PAYLOAD
// ==========================================

export type CreateBookingPayload = {
  vehicleId: number;

  // Mandatory pickup location for new bookings
  locationId: number;

  // Rental dates
  startDate: string;
  endDate: string;

  // Customer contact details
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

// ==========================================
// BOOKING RESPONSE TYPE
// ==========================================

export type Booking = {
  id: number;

  // Customer and vehicle references
  userId: number;
  vehicleId: number;

  // Nullable for historical bookings
  locationId: number | null;

  // Historical pickup location snapshot
  pickupLocationName: string | null;
  pickupLocationCity: string | null;
  pickupLocationAddress: string | null;

  // Complete pickup location snapshot
  pickupLocation: BookingLocationSnapshot | null;

  // Rental dates
  startDate: string;
  endDate: string;

  // Rental calculation
  totalDays: number;
  totalAmount: number | string;

  // Booking status
  status: BookingStatus;

  // Customer contact details
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;

  // Booking creation date
  createdAt: string;

  // Current vehicle details, if included
  vehicle?: Vehicle | null;
};

// ==========================================
// CREATE BOOKING RESPONSE
// ==========================================

export type CreateBookingResponse = ApiResponse & {
  booking: Booking;
};

// ==========================================
// CUSTOMER BOOKING HISTORY RESPONSE
// ==========================================

export type MyBookingsResponse = ApiResponse & {
  count: number;
  bookings: Booking[];
};

// ==========================================
// CANCEL BOOKING RESPONSE
// ==========================================

export type CancelBookingResponse = ApiResponse & {
  booking?: Booking;
};