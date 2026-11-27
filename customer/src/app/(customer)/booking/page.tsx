"use client";

import {
  Suspense,
  useEffect,
  useState,
  useRef,
  type FormEvent,
  type ChangeEvent,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Bike,
  UserRound,
  CalendarDays,
  LoaderCircle,
  CircleCheck,
  CircleAlert,
  ShieldCheck,
  ClipboardList,
  MapPin,
} from "lucide-react";

import {
  getCustomerUser,
  getCustomerToken,
  getVehicleById,
  getVehicleImage,
  checkVehicleAvailability,
  calculateRentalDays,
  formatCurrency,
  formatDate,
  createBooking,
  getTodayDate,
  getPublicSettings,
  validateRentalDuration,
  isValidDate,
  EMAIL_REGEX,
  MAX_RENTAL_DAYS,
  type Vehicle,
  type Booking,
  type PublicSettings,
  type PickupLocation,
} from "@/lib/api";

// ==========================================
// CONSTANTS AND STYLES
// ==========================================

const MAX_UNSIGNED_ID = 4294967295;

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-6";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#155E75] focus:ring-2 focus:ring-[#155E75]/10 disabled:bg-slate-50";

const labelClass =
  "mb-2 block text-sm font-medium text-slate-700";

const primaryButton =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-[#155E75] py-3.5 text-sm font-semibold text-white transition hover:bg-[#104B5D] disabled:cursor-not-allowed disabled:opacity-50";

const DEFAULT_CONDITIONS = [
  "Booking requests are subject to admin approval.",
  "Selected rental dates must be available.",
  "The rental amount is calculated based on the selected dates.",
  "Pickup and return must take place at the selected rental location.",
  "No online payment is required.",
  "Please contact the rental provider for pickup arrangements.",
];

// ==========================================
// TYPES
// ==========================================

type ContactForm = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
};

type VerifiedBookingDetails = {
  vehicleId: number;
  locationId: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalAmount: number;
};

// ==========================================
// ID VALIDATION
// ==========================================

function parseId(value: string | null): number {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return 0;
  }

  const id = Number(value);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    id > MAX_UNSIGNED_ID
  ) {
    return 0;
  }

  return id;
}

// ==========================================
// RENTAL DATE VALIDATION
// ==========================================

function validateBookingDates(
  startDate: string,
  endDate: string
): number {
  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate)
  ) {
    throw new Error(
      "Please select valid pickup and return dates"
    );
  }

  if (startDate < getTodayDate()) {
    throw new Error(
      "Pickup date cannot be in the past"
    );
  }

  if (endDate <= startDate) {
    throw new Error(
      "Return date must be after the pickup date"
    );
  }

  const totalDays = calculateRentalDays(
    startDate,
    endDate
  );

  if (
    !Number.isSafeInteger(totalDays) ||
    totalDays <= 0 ||
    totalDays > MAX_RENTAL_DAYS
  ) {
    throw new Error("Invalid rental duration");
  }

  return totalDays;
}

// ==========================================
// LOCATION VALIDATION
// ==========================================

function getValidatedLocation(
  vehicle: Vehicle,
  locationId: number
): PickupLocation {
  if (!locationId) {
    throw new Error(
      "Please select a valid pickup location"
    );
  }

  if (!vehicle.locationId || !vehicle.location) {
    throw new Error(
      "This vehicle does not have an assigned pickup location. Please contact support."
    );
  }

  if (
    vehicle.locationId !== locationId ||
    vehicle.location.id !== locationId
  ) {
    throw new Error(
      "The vehicle is no longer assigned to the selected pickup location. Please select your vehicle again."
    );
  }

  if (vehicle.location.status !== "active") {
    throw new Error(
      "The selected pickup location is currently inactive."
    );
  }

  const { id, name, city, address } =
    vehicle.location;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof city !== "string" ||
    !city.trim() ||
    typeof address !== "string" ||
    !address.trim()
  ) {
    throw new Error(
      "Pickup location details are unavailable. Please contact support."
    );
  }

  return {
    id,
    name,
    city,
    address,
  };
}

// ==========================================
// LOCATION COMPARISON
// ==========================================

function isSameLocation(
  first: PickupLocation,
  second: PickupLocation
): boolean {
  return (
    first.id === second.id &&
    first.name === second.name &&
    first.city === second.city &&
    first.address === second.address
  );
}

// ==========================================
// SETTINGS COMPARISON
// ==========================================

function hasSettingsChanged(
  previous: PublicSettings,
  latest: PublicSettings
): boolean {
  return (
    previous.minRentalDays !== latest.minRentalDays ||
    previous.maxRentalDays !== latest.maxRentalDays ||
    previous.allowCancellation !== latest.allowCancellation ||
    previous.termsAndConditions !== latest.termsAndConditions ||
    previous.businessName !== latest.businessName
  );
}

// ==========================================
// LOADING COMPONENT
// ==========================================

function BookingLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <LoaderCircle
        size={32}
        className="animate-spin text-[#155E75]"
      />

      <p className="text-sm text-slate-500">
        Loading booking details...
      </p>
    </div>
  );
}

// ==========================================
// SUMMARY ROW
// ==========================================

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="break-words text-right font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

// ==========================================
// ERROR MESSAGE
// ==========================================

function ErrorMessage({
  message,
}: {
  message: string;
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-600"
    >
      <CircleAlert
        size={18}
        className="mt-0.5 shrink-0"
      />

      <span>{message}</span>
    </div>
  );
}

// ==========================================
// PICKUP LOCATION CARD
// ==========================================

function PickupLocationCard({
  location,
  saved = false,
}: {
  location: PickupLocation | null;
  saved?: boolean;
}) {
  if (!location) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <CircleAlert
            size={20}
            className="shrink-0 text-amber-600"
          />

          <div>
            <p className="text-sm font-semibold text-amber-800">
              Location details unavailable
            </p>

            <p className="mt-1 text-xs leading-relaxed text-amber-700">
              Please contact the rental provider for
              pickup arrangements.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#155E75]/15 bg-[#ECFEFF] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#155E75]/10">
          <MapPin
            size={21}
            className="text-[#155E75]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#155E75]">
            Pickup & Return Location
          </p>

          <h3 className="mt-1 break-words text-sm font-bold text-[#102A36]">
            {location.name}
          </h3>

          <p className="mt-1 break-words text-sm text-slate-600">
            {location.city}
          </p>

          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-500">
            {location.address}
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CircleCheck size={14} />

            {saved
              ? "Location saved with your booking"
              : "Active rental location"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BOOKING CONTENT
// ==========================================

function BookingContent() {
  const searchParams = useSearchParams();

  // ========================================
  // URL PARAMETERS
  // ========================================

  const vehicleId = parseId(
    searchParams.get("vehicleId")
  );

  const locationId = parseId(
    searchParams.get("locationId")
  );

  const startDate =
    searchParams.get("startDate") || "";

  const endDate =
    searchParams.get("endDate") || "";

  const queryIsUnique =
    searchParams.getAll("vehicleId").length === 1 &&
    searchParams.getAll("locationId").length === 1 &&
    searchParams.getAll("startDate").length === 1 &&
    searchParams.getAll("endDate").length === 1;

  const requestKey = JSON.stringify([
    vehicleId,
    locationId,
    startDate,
    endDate,
    queryIsUnique,
  ]);

  // ========================================
  // STATE
  // ========================================

  const [vehicle, setVehicle] =
    useState<Vehicle | null>(null);

  const [location, setLocation] =
    useState<PickupLocation | null>(null);

  const [settings, setSettings] =
    useState<PublicSettings | null>(null);

  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [verifiedDetails, setVerifiedDetails] =
    useState<VerifiedBookingDetails | null>(null);

  const [loadedRequestKey, setLoadedRequestKey] =
    useState("");

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [submitError, setSubmitError] =
    useState("");

  const [imageError, setImageError] =
    useState(false);

  const [available, setAvailable] =
    useState(false);

  const [agreed, setAgreed] =
    useState(false);

  const [submissionUncertain, setSubmissionUncertain] =
    useState(false);

  const [reloadKey, setReloadKey] =
    useState(0);

  const submitLock = useRef(false);

  const pageVersion = useRef(0);

  const submitController =
    useRef<AbortController | null>(null);

  const [form, setForm] = useState<ContactForm>({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  // ========================================
  // DERIVED VALUES
  // ========================================

  const totalDays =
    isValidDate(startDate) &&
    isValidDate(endDate) &&
    endDate > startDate
      ? calculateRentalDays(startDate, endDate)
      : 0;

  const hasVerifiedDetails =
    verifiedDetails !== null &&
    verifiedDetails.vehicleId === vehicleId &&
    verifiedDetails.locationId === locationId &&
    verifiedDetails.startDate === startDate &&
    verifiedDetails.endDate === endDate &&
    verifiedDetails.totalDays === totalDays;

  const totalAmount = hasVerifiedDetails
    ? verifiedDetails.totalAmount
    : 0;

  const canSubmit =
    !loading &&
    !submitting &&
    !submissionUncertain &&
    loadedRequestKey === requestKey &&
    available &&
    agreed &&
    hasVerifiedDetails &&
    vehicle !== null &&
    location !== null &&
    settings !== null;

  // ========================================
  // BACK NAVIGATION
  // ========================================

  const backParams = new URLSearchParams();

  if (locationId > 0) {
    backParams.set(
      "locationId",
      String(locationId)
    );
  }

  if (
    isValidDate(startDate) &&
    isValidDate(endDate) &&
    endDate > startDate &&
    startDate >= getTodayDate()
  ) {
    backParams.set("startDate", startDate);
    backParams.set("endDate", endDate);
  }

  const backQuery = backParams.toString();

  const backToVehicleUrl =
    vehicleId > 0
      ? `/vehicles/${vehicleId}${
          backQuery ? `?${backQuery}` : ""
        }`
      : "/vehicles";

  // ========================================
  // PREFILL CUSTOMER DETAILS
  // ========================================

  useEffect(() => {
    const user = getCustomerUser();

    if (user) {
      setForm({
        contactName: user.name || "",
        contactEmail: user.email || "",
        contactPhone: (user.phone || "")
          .replace(/\D/g, "")
          .slice(0, 10),
      });
    }
  }, []);

  // ========================================
  // LOAD BOOKING DETAILS
  // ========================================

  useEffect(() => {
    let cancelled = false;

    const controller = new AbortController();

    pageVersion.current++;

    submitController.current?.abort();
    submitController.current = null;

    setLoading(true);
    setLoadError("");
    setSubmitError("");
    setAvailable(false);
    setAgreed(false);
    setVehicle(null);
    setLocation(null);
    setSettings(null);
    setBooking(null);
    setVerifiedDetails(null);
    setImageError(false);
    setSubmitting(false);
    setSubmissionUncertain(false);
    setLoadedRequestKey("");

    submitLock.current = false;

    async function loadBookingDetails() {
      try {
        // Validate URL parameters.
        if (!queryIsUnique) {
          throw new Error(
            "Invalid booking link. Please select your vehicle and rental dates again."
          );
        }

        if (!vehicleId) {
          throw new Error("Invalid vehicle ID");
        }

        if (!locationId) {
          throw new Error(
            "Pickup location is missing or invalid. Please select a pickup location and try again."
          );
        }

        const rentalDays = validateBookingDates(
          startDate,
          endDate
        );

        // Load latest vehicle and rental settings.
        const [vehicleData, settingsData] =
          await Promise.all([
            getVehicleById(
              vehicleId,
              controller.signal
            ),

            getPublicSettings(
              controller.signal
            ),
          ]);

        if (cancelled) return;

        const selectedVehicle =
          vehicleData.vehicle;

        if (selectedVehicle.id !== vehicleId) {
          throw new Error(
            "Invalid vehicle details"
          );
        }

        // Validate assigned pickup location.
        const selectedLocation =
          getValidatedLocation(
            selectedVehicle,
            locationId
          );

        validateRentalDuration(
          rentalDays,
          settingsData.settings
        );

        setVehicle(selectedVehicle);
        setLocation(selectedLocation);
        setSettings(settingsData.settings);

        // Check latest vehicle availability.
        const availabilityData =
          await checkVehicleAvailability(
            vehicleId,
            startDate,
            endDate,
            controller.signal
          );

        if (cancelled) return;

        // Recheck vehicle location after availability request.
        const latestVehicleData =
          await getVehicleById(
            vehicleId,
            controller.signal
          );

        if (cancelled) return;

        const latestVehicle =
          latestVehicleData.vehicle;

        if (latestVehicle.id !== vehicleId) {
          throw new Error(
            "Invalid vehicle details"
          );
        }

        const latestLocation =
          getValidatedLocation(
            latestVehicle,
            locationId
          );

        if (
          Number(latestVehicle.pricePerDay) !==
            Number(
              availabilityData.vehicle.pricePerDay
            ) ||
          latestVehicle.status !==
            availabilityData.vehicle.status
        ) {
          throw new Error(
            "Vehicle details have changed. Please recheck availability."
          );
        }

        const updatedSettings: PublicSettings = {
          ...settingsData.settings,

          minRentalDays:
            availabilityData.bookingPolicy
              .minRentalDays,

          maxRentalDays:
            availabilityData.bookingPolicy
              .maxRentalDays,

          allowCancellation:
            availabilityData.bookingPolicy
              .allowCancellation,
        };

        validateRentalDuration(
          rentalDays,
          updatedSettings
        );

        setVehicle(latestVehicle);
        setLocation(latestLocation);
        setSettings(updatedSettings);

        if (!availabilityData.available) {
          setAvailable(false);

          setLoadError(
            availabilityData.message ||
              "Vehicle is unavailable for selected dates"
          );

          return;
        }

        // Store verified rental details.
        setVerifiedDetails({
          vehicleId,
          locationId,
          startDate,
          endDate,
          totalDays:
            availabilityData.totalDays,
          totalAmount:
            availabilityData.totalAmount,
        });

        setAvailable(true);
      } catch (error) {
        if (!cancelled) {
          setAvailable(false);
          setVerifiedDetails(null);

          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load booking details"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadedRequestKey(requestKey);
          setLoading(false);
        }
      }
    }

    void loadBookingDetails();

    return () => {
      cancelled = true;

      controller.abort();

      submitController.current?.abort();

      pageVersion.current++;
    };
  }, [
    vehicleId,
    locationId,
    startDate,
    endDate,
    queryIsUnique,
    requestKey,
    reloadKey,
  ]);

  // ========================================
  // CONTACT FORM CHANGE
  // ========================================

  function handleChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,

      [name]:
        name === "contactPhone"
          ? value.replace(/\D/g, "").slice(0, 10)
          : value,
    }));

    setSubmitError("");
  }

  // ========================================
  // RECHECK BOOKING
  // ========================================

  function handleRecheck() {
    if (
      submitLock.current ||
      submissionUncertain
    ) {
      return;
    }

    setAvailable(false);
    setVerifiedDetails(null);
    setAgreed(false);
    setLoading(true);

    setReloadKey((previous) => previous + 1);
  }

  // ========================================
  // SUBMIT BOOKING
  // ========================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      submitLock.current ||
      booking ||
      submissionUncertain
    ) {
      return;
    }

    setSubmitError("");

    if (
      !canSubmit ||
      !vehicle ||
      !location ||
      !settings ||
      !verifiedDetails
    ) {
      setSubmitError(
        "Please verify your rental details and agree to the booking conditions."
      );

      return;
    }

    const contactName =
      form.contactName.trim();

    const contactEmail =
      form.contactEmail.trim().toLowerCase();

    const contactPhone =
      form.contactPhone.trim();

    // Validate contact details.
    if (
      contactName.length < 2 ||
      contactName.length > 100
    ) {
      setSubmitError(
        "Please enter a valid name"
      );

      return;
    }

    if (
      !EMAIL_REGEX.test(contactEmail) ||
      contactEmail.length > 150
    ) {
      setSubmitError(
        "Please enter a valid email"
      );

      return;
    }

    if (!/^[6-9]\d{9}$/.test(contactPhone)) {
      setSubmitError(
        "Please enter a valid 10-digit mobile number"
      );

      return;
    }

    if (!agreed) {
      setSubmitError(
        "Please agree to the booking conditions"
      );

      return;
    }

    const token = getCustomerToken();

    if (!token) {
      setSubmitError(
        "Please login to continue booking"
      );

      return;
    }

    const currentVersion = pageVersion.current;

    const controller = new AbortController();

    submitController.current = controller;

    submitLock.current = true;

    setSubmitting(true);

    let bookingRequestStarted = false;

    function isCurrentPage(): boolean {
      return (
        currentVersion === pageVersion.current &&
        !controller.signal.aborted
      );
    }

    try {
      const rentalDays = validateBookingDates(
        startDate,
        endDate
      );

      // ====================================
      // FETCH LATEST VEHICLE AND SETTINGS
      // ====================================

      const [
        latestVehicleData,
        latestSettingsData,
      ] = await Promise.all([
        getVehicleById(
          vehicleId,
          controller.signal
        ),

        getPublicSettings(
          controller.signal
        ),
      ]);

      if (!isCurrentPage()) return;

      const latestVehicle =
        latestVehicleData.vehicle;

      const latestSettings =
        latestSettingsData.settings;

      if (latestVehicle.id !== vehicleId) {
        throw new Error(
          "Invalid vehicle details"
        );
      }

      // ====================================
      // REVALIDATE PICKUP LOCATION
      // ====================================

      let latestLocation: PickupLocation;

      try {
        latestLocation = getValidatedLocation(
          latestVehicle,
          locationId
        );
      } catch (error) {
        setAvailable(false);
        setVerifiedDetails(null);
        setAgreed(false);
        setLocation(null);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Pickup location is unavailable"
        );

        throw error;
      }

      const locationChanged =
        !isSameLocation(
          location,
          latestLocation
        );

      setLocation(latestLocation);

      // ====================================
      // REVALIDATE RENTAL POLICY
      // ====================================

      try {
        validateRentalDuration(
          rentalDays,
          latestSettings
        );
      } catch (error) {
        setSettings(latestSettings);
        setAvailable(false);
        setVerifiedDetails(null);
        setAgreed(false);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Invalid rental duration"
        );

        throw error;
      }

      const settingsChanged =
        hasSettingsChanged(
          settings,
          latestSettings
        );

      // ====================================
      // RECHECK AVAILABILITY
      // ====================================

      let latestAvailability;

      try {
        latestAvailability =
          await checkVehicleAvailability(
            vehicleId,
            startDate,
            endDate,
            controller.signal
          );
      } catch (error) {
        if (!isCurrentPage()) return;

        setAvailable(false);
        setVerifiedDetails(null);
        setAgreed(false);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to verify availability"
        );

        throw error;
      }

      if (!isCurrentPage()) return;

      if (!latestAvailability.available) {
        setAvailable(false);
        setVerifiedDetails(null);
        setAgreed(false);

        setLoadError(
          latestAvailability.message
        );

        throw new Error(
          latestAvailability.message ||
            "Vehicle is no longer available"
        );
      }

      // ====================================
      // FINAL VEHICLE LOCATION CHECK
      // ====================================

      const finalVehicleData =
        await getVehicleById(
          vehicleId,
          controller.signal
        );

      if (!isCurrentPage()) return;

      const finalVehicle =
        finalVehicleData.vehicle;

      if (finalVehicle.id !== vehicleId) {
        throw new Error(
          "Invalid vehicle details"
        );
      }

      let finalLocation: PickupLocation;

      try {
        finalLocation = getValidatedLocation(
          finalVehicle,
          locationId
        );
      } catch (error) {
        setAvailable(false);
        setVerifiedDetails(null);
        setAgreed(false);
        setLocation(null);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Pickup location is unavailable"
        );

        throw error;
      }

      if (
        Number(finalVehicle.pricePerDay) !==
          Number(
            latestAvailability.vehicle.pricePerDay
          ) ||
        finalVehicle.status !==
          latestAvailability.vehicle.status
      ) {
        setAvailable(false);
        setVerifiedDetails(null);
        setAgreed(false);

        setLoadError(
          "Vehicle details have changed. Please recheck availability."
        );

        throw new Error(
          "Vehicle details have changed. Please recheck availability."
        );
      }

      // ====================================
      // COMPARE LATEST RENTAL POLICY
      // ====================================

      const latestPolicy =
        latestAvailability.bookingPolicy;

      const rentalPolicyChanged =
        latestPolicy.minRentalDays !==
          latestSettings.minRentalDays ||
        latestPolicy.maxRentalDays !==
          latestSettings.maxRentalDays ||
        latestPolicy.allowCancellation !==
          latestSettings.allowCancellation;

      const updatedSettings: PublicSettings = {
        ...latestSettings,

        minRentalDays:
          latestPolicy.minRentalDays,

        maxRentalDays:
          latestPolicy.maxRentalDays,

        allowCancellation:
          latestPolicy.allowCancellation,
      };

      validateRentalDuration(
        rentalDays,
        updatedSettings
      );

      // ====================================
      // COMPARE RENTAL PRICE
      // ====================================

      const priceChanged =
        Number(
          latestAvailability.vehicle.pricePerDay
        ) !== Number(vehicle.pricePerDay) ||
        latestAvailability.totalAmount !==
          verifiedDetails.totalAmount;

      const finalLocationChanged =
        !isSameLocation(
          location,
          finalLocation
        );

      setVehicle(finalVehicle);
      setLocation(finalLocation);
      setSettings(updatedSettings);
      setAvailable(true);
      setLoadError("");

      setVerifiedDetails({
        vehicleId,
        locationId,
        startDate,
        endDate,

        totalDays:
          latestAvailability.totalDays,

        totalAmount:
          latestAvailability.totalAmount,
      });

      // Ask customer to review changed details.
      if (
        locationChanged ||
        finalLocationChanged ||
        settingsChanged ||
        rentalPolicyChanged ||
        priceChanged
      ) {
        setAgreed(false);

        if (
          locationChanged ||
          finalLocationChanged
        ) {
          throw new Error(
            "Pickup location details have changed. Please review the updated location and confirm again."
          );
        }

        if (priceChanged) {
          throw new Error(
            "Rental price has changed. Please review the updated amount and confirm again."
          );
        }

        throw new Error(
          "Rental settings or booking conditions have changed. Please review and confirm again."
        );
      }

      // ====================================
      // FINAL SESSION AND DATE VALIDATION
      // ====================================

      if (!isCurrentPage()) return;

      if (getCustomerToken() !== token) {
        throw new Error(
          "Customer session has changed. Please login again."
        );
      }

      validateBookingDates(
        startDate,
        endDate
      );

      // ====================================
      // CREATE BOOKING REQUEST
      // ====================================

      bookingRequestStarted = true;

      const data = await createBooking({
        vehicleId,

        // Mandatory pickup location.
        locationId,

        startDate,
        endDate,
        contactName,
        contactEmail,
        contactPhone,
      });

      if (!isCurrentPage()) return;

      if (getCustomerToken() !== token) {
        throw new Error(
          "Customer session has changed. Please check My Bookings after logging in again."
        );
      }

      // ====================================
      // VERIFY CREATED BOOKING
      // ====================================

      const createdBooking = data.booking;

      if (
        !createdBooking ||
        !Number.isSafeInteger(
          createdBooking.id
        ) ||
        createdBooking.id <= 0 ||
        createdBooking.vehicleId !== vehicleId ||
        createdBooking.locationId !== locationId ||
        !createdBooking.pickupLocation ||
        createdBooking.pickupLocation.id !== locationId ||
        createdBooking.startDate !== startDate ||
        createdBooking.endDate !== endDate ||
        createdBooking.totalDays !== rentalDays
      ) {
        throw new Error(
          "Booking response could not be verified. Please check My Bookings before submitting again."
        );
      }

      // Use the actual saved booking response.
      setBooking(createdBooking);

    } catch (error) {
      if (!isCurrentPage()) return;

      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit booking request";

      setAgreed(false);

      // A failed response does not always mean
      // the booking was not created.
      if (bookingRequestStarted) {
        setSubmissionUncertain(true);
        setAvailable(false);
        setVerifiedDetails(null);

        setSubmitError(
          `${message} Please check My Bookings before submitting another request.`
        );
      } else {
        setSubmitError(message);
      }
    } finally {
      if (isCurrentPage()) {
        setSubmitting(false);
        submitLock.current = false;

        if (
          submitController.current ===
          controller
        ) {
          submitController.current = null;
        }
      }
    }
  }

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (
    loading ||
    loadedRequestKey !== requestKey
  ) {
    return <BookingLoader />;
  }

  // ========================================
  // BOOKING SUCCESS SCREEN
  // ========================================

  if (booking) {
    const confirmedAmountChanged =
      verifiedDetails !== null &&
      Number(booking.totalAmount) !==
        verifiedDetails.totalAmount;

    const confirmedLocationChanged =
      location !== null &&
      booking.pickupLocation !== null &&
      !isSameLocation(
        location,
        booking.pickupLocation
      );

    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">

          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CircleCheck
              size={44}
              className="text-emerald-600"
            />
          </div>

          <h1 className="text-2xl font-bold text-[#102A36]">
            Booking Request Submitted!
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Your booking request has been
            submitted successfully. Please wait
            for admin approval.
          </p>

          <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-5 text-left">

            <SummaryRow
              label="Booking ID"
              value={`#${booking.id}`}
            />

            <SummaryRow
              label="Vehicle"
              value={vehicle?.name || "Vehicle"}
            />

            <SummaryRow
              label="Pickup Date"
              value={formatDate(
                booking.startDate
              )}
            />

            <SummaryRow
              label="Return Date"
              value={formatDate(
                booking.endDate
              )}
            />

            <SummaryRow
              label="Rental Duration"
              value={`${booking.totalDays} ${
                booking.totalDays === 1
                  ? "Day"
                  : "Days"
              }`}
            />

            <div className="border-t border-slate-200 pt-4">
              <PickupLocationCard
                location={
                  booking.pickupLocation
                }
                saved
              />
            </div>

            <div className="border-t border-slate-200 pt-4">
              <SummaryRow
                label="Total Amount"
                value={formatCurrency(
                  booking.totalAmount
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">
                Booking Status
              </span>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold capitalize text-amber-700">
                {booking.status.replace(
                  /_/g,
                  " "
                )}
              </span>
            </div>
          </div>

          {(confirmedAmountChanged ||
            confirmedLocationChanged) && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800"
            >
              The saved booking details differ
              from your previous summary.
              Please review the details above
              and contact the rental provider
              if needed.
            </div>
          )}

          <div className="mt-4 rounded-xl bg-[#ECFEFF] p-3 text-xs text-[#155E75]">
            No online payment has been collected.
          </div>

          <Link
            href="/my-bookings"
            className={`mt-6 ${primaryButton}`}
          >
            View My Bookings

            <ArrowRight size={18} />
          </Link>

          <Link
            href="/vehicles"
            className="mt-3 block rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Explore More Vehicles
          </Link>

          <Link
            href="/home"
            className="mt-4 inline-block text-sm font-medium text-slate-500 hover:text-[#155E75]"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ========================================
  // BOOKING LOAD ERROR
  // ========================================

  if (!vehicle || !settings) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">

        <CircleAlert
          size={48}
          className="mx-auto mb-4 text-red-500"
        />

        <h1 className="text-xl font-bold text-[#102A36]">
          Unable to Continue Booking
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {loadError ||
            "Vehicle details or rental settings unavailable"}
        </p>

        <button
          type="button"
          onClick={handleRecheck}
          className="mt-6 rounded-xl bg-[#155E75] px-5 py-3 text-sm font-semibold text-white hover:bg-[#104B5D]"
        >
          Try Again
        </button>

        <Link
          href={backToVehicleUrl}
          className="mt-4 block text-sm font-medium text-[#155E75]"
        >
          {vehicleId
            ? "Back to Vehicle Details"
            : "Back to Vehicles"}
        </Link>

        <Link
          href="/vehicles"
          className="mt-3 block text-sm text-slate-500"
        >
          Browse All Vehicles
        </Link>
      </div>
    );
  }

  // ========================================
  // DISPLAY VALUES
  // ========================================

  const imageUrl = getVehicleImage(
    vehicle.image
  );

  const VehicleIcon =
    vehicle.type === "car"
      ? CarFront
      : Bike;

  const contactFields = [
    {
      name: "contactName",
      label: "Full Name",
      type: "text",
      placeholder: "Enter your full name",
      autoComplete: "name",
      maxLength: 100,
    },
    {
      name: "contactEmail",
      label: "Email Address",
      type: "email",
      placeholder: "Enter your email",
      autoComplete: "email",
      maxLength: 150,
    },
    {
      name: "contactPhone",
      label: "Mobile Number",
      type: "tel",
      placeholder: "Enter mobile number",
      autoComplete: "tel-national",
      maxLength: 10,
    },
  ] as const;

  const conditions = [
    ...DEFAULT_CONDITIONS,

    `Minimum rental period: ${settings.minRentalDays} day(s).`,

    `Maximum rental period: ${settings.maxRentalDays} day(s).`,

    settings.allowCancellation
      ? "Pending bookings can be cancelled before admin confirmation."
      : "Customer booking cancellation is currently disabled. Please contact the rental provider.",
  ];

  // ========================================
  // MAIN BOOKING PAGE
  // ========================================

  return (
    <div className="min-h-screen bg-slate-50">

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">

        {/* BACK NAVIGATION */}

        <Link
          href={backToVehicleUrl}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#155E75]"
        >
          <ArrowLeft size={18} />

          Back to Vehicle Details
        </Link>

        {/* PAGE HEADER */}

        <div className="mb-8">

          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#155E75]">
            Booking Request
          </p>

          <h1 className="text-3xl font-bold text-[#102A36]">
            Complete Your Booking
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review your rental details and
            submit your booking request.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          aria-busy={submitting}
          className="grid gap-8 lg:grid-cols-[1.3fr_1fr]"
        >

          {/* LEFT SIDE */}

          <div className="space-y-6">

            {/* CONTACT DETAILS */}

            <section className={cardClass}>

              <h2 className="flex items-center gap-2 text-lg font-bold text-[#102A36]">

                <UserRound
                  size={22}
                  className="text-[#155E75]"
                />

                Contact Details
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                We will use these details to
                contact you regarding your
                booking.
              </p>

              <div className="mt-6 space-y-5">

                {contactFields.map((field) => (
                  <div key={field.name}>

                    <label
                      htmlFor={field.name}
                      className={labelClass}
                    >
                      {field.label}

                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={
                        field.placeholder
                      }
                      autoComplete={
                        field.autoComplete
                      }
                      maxLength={
                        field.maxLength
                      }
                      inputMode={
                        field.name ===
                        "contactPhone"
                          ? "numeric"
                          : undefined
                      }
                      required
                      disabled={
                        submitting ||
                        submissionUncertain
                      }
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* PICKUP AND RETURN LOCATION */}

            <section className={cardClass}>

              <h2 className="flex items-center gap-2 text-lg font-bold text-[#102A36]">

                <MapPin
                  size={22}
                  className="text-[#155E75]"
                />

                Pickup & Return Details
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Collect and return your vehicle
                at the selected rental location.
              </p>

              <div className="mt-5">
                <PickupLocationCard
                  location={location}
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl border border-slate-200 p-4">

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">

                    <CalendarDays
                      size={16}
                      className="text-[#155E75]"
                    />

                    Pickup Date
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDate(startDate)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">

                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">

                    <CalendarDays
                      size={16}
                      className="text-[#155E75]"
                    />

                    Return Date
                  </div>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDate(endDate)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">

                <CircleAlert
                  size={16}
                  className="mt-0.5 shrink-0 text-[#155E75]"
                />

                <span>
                  Pickup and return locations
                  are the same for this booking.
                  Contact the rental provider
                  for any special arrangements.
                </span>
              </div>

              {!submitting &&
                !submissionUncertain && (
                  <Link
                    href={backToVehicleUrl}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#155E75] hover:underline"
                  >
                    Change Rental Details

                    <ArrowRight size={15} />
                  </Link>
                )}
            </section>

            {/* BOOKING CONDITIONS */}

            <section className={cardClass}>

              <h2 className="flex items-center gap-2 text-lg font-bold text-[#102A36]">

                <ShieldCheck
                  size={22}
                  className="text-[#155E75]"
                />

                Booking Conditions
              </h2>

              <ul className="mt-5 space-y-3 text-sm text-slate-600">

                {conditions.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2"
                  >

                    <CircleCheck
                      size={16}
                      className="mt-0.5 shrink-0 text-[#155E75]"
                    />

                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* DYNAMIC TERMS AND CONDITIONS */}

              {settings.termsAndConditions?.trim() && (
                <div className="mt-6 border-t border-slate-100 pt-5">

                  <h3 className="font-semibold text-slate-900">
                    Terms & Conditions
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    {settings.businessName}
                  </p>

                  <div
                    tabIndex={0}
                    className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600"
                  >
                    {settings.termsAndConditions}
                  </div>
                </div>
              )}

              {/* AGREEMENT CHECKBOX */}

              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl border border-[#155E75]/10 bg-[#ECFEFF] p-4">

                <input
                  type="checkbox"
                  checked={agreed}
                  disabled={
                    submitting ||
                    !available ||
                    !hasVerifiedDetails ||
                    submissionUncertain
                  }
                  onChange={(event) => {
                    setAgreed(
                      event.target.checked
                    );

                    setSubmitError("");
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#155E75]"
                />

                <span className="text-sm leading-relaxed text-slate-700">
                  I have reviewed the vehicle,
                  pickup location, rental dates,
                  rental amount and agree to the
                  booking conditions and
                  applicable Terms & Conditions.
                </span>
              </label>
            </section>
          </div>

          {/* RIGHT SIDE - BOOKING SUMMARY */}

          <aside className={`${cardClass} h-fit lg:sticky lg:top-24`}>

            <h2 className="flex items-center gap-2 text-lg font-bold text-[#102A36]">

              <ClipboardList
                size={22}
                className="text-[#155E75]"
              />

              Booking Summary
            </h2>

            {/* VEHICLE INFORMATION */}

            <div className="mt-6 flex items-center gap-4">

              <div className="flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">

                {imageUrl && !imageError ? (
                  <img
                    src={imageUrl}
                    alt={vehicle.name}
                    onError={() =>
                      setImageError(true)
                    }
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <VehicleIcon
                    size={48}
                    className="text-slate-300"
                  />
                )}
              </div>

              <div className="min-w-0">

                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {vehicle.type}
                </p>

                <h3 className="mt-1 break-words font-bold text-slate-900">
                  {vehicle.name}
                </h3>

                <p className="mt-1 text-xs capitalize text-slate-500">
                  {[
                    vehicle.fuelType,
                    vehicle.transmission,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <p className="mt-2 font-bold text-[#155E75]">

                  {formatCurrency(
                    vehicle.pricePerDay
                  )}

                  <span className="text-xs font-normal text-slate-500">
                    {" "}
                    / day
                  </span>
                </p>
              </div>
            </div>

            {/* LOCATION SUMMARY */}

            <div className="mt-6 border-t border-slate-100 pt-6">

              <PickupLocationCard
                location={location}
              />
            </div>

            {/* RENTAL SUMMARY */}

            <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">

              {[
                ["Pickup Date", startDate],
                ["Return Date", endDate],
              ].map(([label, date]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 text-sm"
                >

                  <span className="flex items-center gap-2 text-slate-500">

                    <CalendarDays
                      size={16}
                      className="shrink-0"
                    />

                    {label}
                  </span>

                  <span className="text-right font-semibold text-slate-900">
                    {formatDate(date)}
                  </span>
                </div>
              ))}

              <SummaryRow
                label="Rental Duration"
                value={`${totalDays} ${
                  totalDays === 1
                    ? "Day"
                    : "Days"
                }`}
              />

              <SummaryRow
                label="Price per Day"
                value={formatCurrency(
                  vehicle.pricePerDay
                )}
              />

              <SummaryRow
                label="Allowed Rental Period"
                value={`${settings.minRentalDays} – ${settings.maxRentalDays} days`}
              />
            </div>

            {/* AVAILABILITY STATUS */}

            <div
              role="status"
              className={`mt-6 flex items-start gap-2 rounded-xl p-3 text-sm ${
                submissionUncertain
                  ? "bg-amber-50 text-amber-700"
                  : available &&
                    hasVerifiedDetails
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >

              {available &&
              hasVerifiedDetails &&
              !submissionUncertain ? (
                <CircleCheck
                  size={18}
                  className="shrink-0"
                />
              ) : (
                <CircleAlert
                  size={18}
                  className="shrink-0"
                />
              )}

              <span>
                {submissionUncertain
                  ? "Please verify your booking status before trying again."
                  : available &&
                    hasVerifiedDetails
                  ? "Vehicle available at the selected location for your rental dates."
                  : loadError ||
                    "Vehicle availability could not be verified."}
              </span>
            </div>

            {/* RECHECK AVAILABILITY */}

            {!available &&
              !submissionUncertain && (
                <div className="mt-3 flex flex-wrap gap-4">

                  <Link
                    href={backToVehicleUrl}
                    className="text-sm font-semibold text-[#155E75]"
                  >
                    Change Rental Details
                  </Link>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleRecheck}
                    className="text-sm font-semibold text-[#155E75] disabled:opacity-50"
                  >
                    Recheck Availability
                  </button>
                </div>
              )}

            {/* RENTAL AMOUNT */}

            <div className="mt-6 border-t border-slate-100 pt-6">

              <div className="flex items-center justify-between gap-3">

                <span className="font-semibold text-slate-900">
                  Total Rental Amount
                </span>

                <span className="text-2xl font-bold text-[#155E75]">
                  {hasVerifiedDetails
                    ? formatCurrency(
                        totalAmount
                      )
                    : "—"}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Rental charges are subject to
                final verification when the
                booking request is submitted.
              </p>

              {/* SUBMISSION ERROR */}

              {submitError && (
                <div className="mt-4">
                  <ErrorMessage
                    message={submitError}
                  />
                </div>
              )}

              {/* SUBMIT BUTTON */}

              {submissionUncertain ? (
                <Link
                  href="/my-bookings"
                  className={`mt-6 ${primaryButton}`}
                >
                  Check My Bookings

                  <ArrowRight size={18} />
                </Link>
              ) : (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`mt-6 ${primaryButton}`}
                >

                  {submitting ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />

                      Submitting Booking...
                    </>
                  ) : (
                    <>
                      Submit Booking Request

                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              )}

              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">

                <ShieldCheck
                  size={15}
                  className="text-[#155E75]"
                />

                No online payment required.
              </div>

              <p className="mt-2 text-center text-xs text-slate-400">
                Subject to admin approval.
              </p>
            </div>

            {/* BUSINESS SUPPORT DETAILS */}

            {(settings.businessPhone ||
              settings.businessEmail) && (
              <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">

                <p className="text-sm font-semibold text-slate-900">
                  Need Help?
                </p>

                <p className="text-xs text-slate-500">
                  Contact {settings.businessName}
                </p>

                {settings.businessPhone && (
                  <a
                    href={`tel:${settings.businessPhone}`}
                    className="block text-sm text-[#155E75] hover:underline"
                  >
                    {settings.businessPhone}
                  </a>
                )}

                {settings.businessEmail && (
                  <a
                    href={`mailto:${settings.businessEmail}`}
                    className="block break-all text-sm text-[#155E75] hover:underline"
                  >
                    {settings.businessEmail}
                  </a>
                )}
              </div>
            )}
          </aside>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// BOOKING PAGE
// ==========================================

export default function BookingPage() {
  return (
    <Suspense fallback={<BookingLoader />}>
      <BookingContent />
    </Suspense>
  );
}