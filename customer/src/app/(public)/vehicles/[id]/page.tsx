"use client";

import {
  Suspense,
  useEffect,
  useState,
  useRef,
} from "react";

import {
  useParams,
  useRouter,
  useSearchParams,
} from "next/navigation";

import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Bike,
  Fuel,
  Settings2,
  UsersRound,
  CalendarDays,
  LoaderCircle,
  CircleCheck,
  CircleAlert,
  ShieldCheck,
  MapPin,
  RefreshCw,
} from "lucide-react";

import {
  getVehicleById,
  getVehicleImage,
  formatCurrency,
  checkVehicleAvailability,
  calculateRentalDays,
  getTodayDate,
  getPublicSettings,
  addDaysToDate,
  isValidDate,
  validateRentalDuration,
  canBookVehicle,
  getVehicleStatusLabel,
  type Vehicle,
  type PublicSettings,
} from "@/lib/api";

// ==========================================
// TYPES
// ==========================================

type AvailabilityStatus =
  | "unchecked"
  | "available"
  | "unavailable"
  | "error";

type VerifiedRental = {
  vehicleId: number;
  locationId: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  totalAmount: number;
};

// ==========================================
// CONSTANTS
// ==========================================

const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

const labelClass =
  "mb-2 block text-sm font-medium text-slate-700";

const statusStyles: Record<string, string> = {
  available: "bg-green-50 text-green-700",
  rented: "bg-amber-50 text-amber-700",
  maintenance: "bg-red-50 text-red-700",
  inactive: "bg-slate-100 text-slate-600",
};

// ==========================================
// HELPERS
// ==========================================

function isValidId(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 4294967295
  );
}

function parseLocationId(
  value: string
): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return isValidId(id) ? id : null;
}

function hasActiveLocation(
  vehicle: Vehicle
): boolean {
  return (
    typeof vehicle.locationId === "number" &&
    isValidId(vehicle.locationId) &&
    vehicle.location?.id === vehicle.locationId &&
    vehicle.location.status === "active"
  );
}

function validatePolicy(
  settings: PublicSettings
) {
  if (
    !Number.isSafeInteger(settings.minRentalDays) ||
    !Number.isSafeInteger(settings.maxRentalDays) ||
    settings.minRentalDays < 1 ||
    settings.maxRentalDays < settings.minRentalDays ||
    settings.maxRentalDays > 366
  ) {
    throw new Error("Invalid rental policy settings.");
  }
}

function getDateError(
  startDate: string,
  endDate: string,
  settings: PublicSettings
): string {
  if (!startDate || !endDate) {
    return "Please select pickup and return dates.";
  }

  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate)
  ) {
    return "Please select valid rental dates.";
  }

  if (startDate < getTodayDate()) {
    return "Pickup date cannot be in the past.";
  }

  if (endDate <= startDate) {
    return "Return date must be after pickup date.";
  }

  try {
    validateRentalDuration(
      calculateRentalDays(startDate, endDate),
      settings
    );

    return "";
  } catch (err) {
    return err instanceof Error
      ? err.message
      : "Invalid rental duration.";
  }
}

// ==========================================
// LOADING COMPONENT
// ==========================================

function VehicleDetailsLoading() {
  return (
    <div
      role="status"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background"
    >
      <LoaderCircle
        size={34}
        className="animate-spin text-primary"
      />

      <p className="text-sm text-slate-500">
        Loading vehicle details...
      </p>
    </div>
  );
}

// ==========================================
// VEHICLE DETAILS CONTENT
// ==========================================

function VehicleDetailsContent() {
  const params = useParams<{ id: string }>();

  const router = useRouter();

  const searchParams = useSearchParams();

  const vehicleId = Number(params.id);

  // ==========================================
  // URL PARAMETERS
  // ==========================================

  const urlLocationId =
    searchParams.get("locationId") || "";

  const urlStartDate =
    searchParams.get("startDate") || "";

  const urlEndDate =
    searchParams.get("endDate") || "";

  const selectedLocationId = urlLocationId
    ? parseLocationId(urlLocationId)
    : null;

  // ==========================================
  // STATE
  // ==========================================

  const [vehicle, setVehicle] =
    useState<Vehicle | null>(null);

  const [settings, setSettings] =
    useState<PublicSettings | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [imageError, setImageError] =
    useState(false);

  const [today, setToday] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [checking, setChecking] =
    useState(false);

  const [availability, setAvailability] =
    useState<AvailabilityStatus>("unchecked");

  const [
    availabilityMessage,
    setAvailabilityMessage,
  ] = useState("");

  const [dateNotice, setDateNotice] =
    useState("");

  const [verifiedRental, setVerifiedRental] =
    useState<VerifiedRental | null>(null);

  const [reloadKey, setReloadKey] =
    useState(0);

  // ==========================================
  // REQUEST REFERENCES
  // ==========================================

  const requestId = useRef(0);

  const checkLock = useRef(false);

  const checkController =
    useRef<AbortController | null>(null);

  // ==========================================
  // DERIVED VALUES
  // ==========================================

  const validStartDate =
    isValidDate(startDate);

  const validEndDate =
    isValidDate(endDate);

  const totalDays =
    validStartDate &&
    validEndDate &&
    endDate > startDate
      ? calculateRentalDays(startDate, endDate)
      : 0;

  const estimatedAmount =
    Math.round(
      totalDays *
        Number(vehicle?.pricePerDay || 0) *
        100
    ) / 100;

  const totalAmount =
    verifiedRental?.totalAmount ??
    estimatedAmount;

  const minReturnDate =
    validStartDate && settings
      ? addDaysToDate(
          startDate,
          settings.minRentalDays
        )
      : undefined;

  const maxReturnDate =
    validStartDate && settings
      ? addDaysToDate(
          startDate,
          settings.maxRentalDays
        )
      : undefined;

  const durationError =
    settings && startDate && endDate
      ? getDateError(
          startDate,
          endDate,
          settings
        )
      : "";

  const activeLocation =
    vehicle !== null &&
    hasActiveLocation(vehicle);

  const locationError = (() => {
    if (!vehicle) return "";

    if (!activeLocation) {
      return "This vehicle does not have an active pickup location. Booking is currently unavailable.";
    }

    if (
      urlLocationId &&
      selectedLocationId === null
    ) {
      return "Invalid pickup location selected. Please search for the vehicle again.";
    }

    if (
      selectedLocationId !== null &&
      vehicle.locationId !== selectedLocationId
    ) {
      return "This vehicle is no longer assigned to your selected pickup location. Please search again.";
    }

    return "";
  })();

  const canCheckAvailability =
    vehicle !== null &&
    canBookVehicle(vehicle.status) &&
    activeLocation &&
    !locationError;

  const hasVerifiedRental =
    verifiedRental !== null &&
    vehicle !== null &&
    verifiedRental.vehicleId === vehicle.id &&
    verifiedRental.locationId === vehicle.locationId &&
    verifiedRental.startDate === startDate &&
    verifiedRental.endDate === endDate;

  const canContinueBooking =
    canCheckAvailability &&
    availability === "available" &&
    hasVerifiedRental &&
    !checking &&
    !durationError &&
    totalDays > 0;

  // ==========================================
  // BACK TO VEHICLES URL
  // ==========================================

  const backParams = new URLSearchParams();

  if (vehicle) {
    backParams.set("type", vehicle.type);
  }

  if (selectedLocationId !== null) {
    backParams.set(
      "locationId",
      String(selectedLocationId)
    );
  }

  if (
    selectedLocationId !== null &&
    isValidDate(urlStartDate) &&
    isValidDate(urlEndDate) &&
    urlStartDate >= getTodayDate() &&
    urlEndDate > urlStartDate
  ) {
    backParams.set("startDate", urlStartDate);
    backParams.set("endDate", urlEndDate);
  }

  const backQuery = backParams.toString();

  const backUrl = backQuery
    ? `/vehicles?${backQuery}`
    : "/vehicles";

  // ==========================================
  // LOAD VEHICLE AND RENTAL SETTINGS
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const controller =
      new AbortController();

    requestId.current++;

    checkController.current?.abort();

    checkLock.current = false;

    setToday(getTodayDate());
    setLoading(true);
    setChecking(false);
    setError("");
    setVehicle(null);
    setSettings(null);
    setStartDate("");
    setEndDate("");
    setImageError(false);
    setAvailability("unchecked");
    setAvailabilityMessage("");
    setVerifiedRental(null);
    setDateNotice("");

    async function loadVehicle() {
      try {
        if (!isValidId(vehicleId)) {
          throw new Error("Invalid vehicle ID.");
        }

        const [
          vehicleData,
          settingsData,
        ] = await Promise.all([
          getVehicleById(
            vehicleId,
            controller.signal
          ),

          getPublicSettings(
            controller.signal
          ),
        ]);

        if (cancelled) return;

        const loadedVehicle =
          vehicleData.vehicle;

        const loadedSettings =
          settingsData.settings;

        validatePolicy(loadedSettings);

        setVehicle(loadedVehicle);
        setSettings(loadedSettings);

        const currentToday =
          getTodayDate();

        setToday(currentToday);

        // ======================================
        // PREFILL RENTAL DATES FROM URL
        // ======================================

        if (urlStartDate || urlEndDate) {
          const dateError = getDateError(
            urlStartDate,
            urlEndDate,
            loadedSettings
          );

          if (!dateError) {
            setStartDate(urlStartDate);
            setEndDate(urlEndDate);

            setDateNotice(
              "Your selected rental dates have been loaded. Check availability to continue."
            );
          } else {
            if (
              isValidDate(urlStartDate) &&
              urlStartDate >= currentToday
            ) {
              setStartDate(urlStartDate);
            }

            setEndDate("");

            setDateNotice(
              `${dateError} Please select your rental dates again.`
            );
          }
        }
      } catch (err) {
        if (
          cancelled ||
          controller.signal.aborted
        ) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load vehicle details."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadVehicle();

    return () => {
      cancelled = true;

      controller.abort();

      checkController.current?.abort();

      requestId.current++;

      checkLock.current = false;
    };
  }, [
    vehicleId,
    urlLocationId,
    urlStartDate,
    urlEndDate,
    reloadKey,
  ]);

  // ==========================================
  // RESET AVAILABILITY
  // ==========================================

  function resetAvailability() {
    requestId.current++;

    checkController.current?.abort();

    checkController.current = null;

    checkLock.current = false;

    setChecking(false);

    setAvailability("unchecked");

    setAvailabilityMessage("");

    setVerifiedRental(null);
  }

  // ==========================================
  // PICKUP DATE CHANGE
  // ==========================================

  function handleStartDate(value: string) {
    resetAvailability();

    setDateNotice("");

    setStartDate(value);

    setToday(getTodayDate());

    if (
      !settings ||
      !isValidDate(value)
    ) {
      setEndDate("");
      return;
    }

    const min = addDaysToDate(
      value,
      settings.minRentalDays
    );

    const max = addDaysToDate(
      value,
      settings.maxRentalDays
    );

    if (
      endDate &&
      (endDate < min || endDate > max)
    ) {
      setEndDate("");
    }
  }

  // ==========================================
  // RETURN DATE CHANGE
  // ==========================================

  function handleEndDate(value: string) {
    resetAvailability();

    setDateNotice("");

    setEndDate(value);
  }

  // ==========================================
  // CHECK VEHICLE AVAILABILITY
  // ==========================================

  async function handleCheckAvailability() {
    if (
      checkLock.current ||
      !vehicle ||
      !settings ||
      !canCheckAvailability
    ) {
      return;
    }

    resetAvailability();

    setDateNotice("");

    const validationError = getDateError(
      startDate,
      endDate,
      settings
    );

    if (validationError) {
      setAvailability("error");

      setAvailabilityMessage(
        validationError
      );

      return;
    }

    const controller =
      new AbortController();

    checkController.current = controller;

    const currentRequest =
      ++requestId.current;

    checkLock.current = true;

    setChecking(true);

    try {
      const currentToday =
        getTodayDate();

      setToday(currentToday);

      // ======================================
      // FETCH LATEST VEHICLE AND SETTINGS
      // ======================================

      const [
        vehicleResponse,
        settingsResponse,
      ] = await Promise.all([
        getVehicleById(
          vehicleId,
          controller.signal
        ),

        getPublicSettings(
          controller.signal
        ),
      ]);

      if (
        currentRequest !== requestId.current
      ) {
        return;
      }

      const latestVehicle =
        vehicleResponse.vehicle;

      const latestSettings =
        settingsResponse.settings;

      validatePolicy(latestSettings);

      setVehicle(latestVehicle);

      setSettings(latestSettings);

      // ======================================
      // VERIFY PICKUP LOCATION
      // ======================================

      if (!hasActiveLocation(latestVehicle)) {
        throw new Error(
          "This vehicle no longer has an active pickup location."
        );
      }

      if (
        latestVehicle.locationId !==
        vehicle.locationId
      ) {
        throw new Error(
          "The vehicle pickup location has changed. Please review the updated location and search again."
        );
      }

      if (
        selectedLocationId !== null &&
        latestVehicle.locationId !==
          selectedLocationId
      ) {
        throw new Error(
          "The vehicle is no longer available at your selected pickup location."
        );
      }

      if (
        !canBookVehicle(latestVehicle.status)
      ) {
        throw new Error(
          "This vehicle is currently not accepting bookings."
        );
      }

      const latestDateError = getDateError(
        startDate,
        endDate,
        latestSettings
      );

      if (latestDateError) {
        throw new Error(latestDateError);
      }

      // ======================================
      // CHECK BACKEND AVAILABILITY
      // ======================================

      const data =
        await checkVehicleAvailability(
          vehicleId,
          startDate,
          endDate,
          controller.signal
        );

      if (
        currentRequest !== requestId.current
      ) {
        return;
      }

      // Recheck the assigned location after
      // the availability request completes.

      const finalVehicleResponse =
        await getVehicleById(
          vehicleId,
          controller.signal
        );

      if (
        currentRequest !== requestId.current
      ) {
        return;
      }

      const finalVehicle =
        finalVehicleResponse.vehicle;

      setVehicle(finalVehicle);

      if (
        !hasActiveLocation(finalVehicle) ||
        finalVehicle.locationId !==
          latestVehicle.locationId
      ) {
        throw new Error(
          "Pickup location changed during verification. Please search again."
        );
      }

      if (
        finalVehicle.status !==
          data.vehicle.status ||
        Number(finalVehicle.pricePerDay) !==
          Number(data.vehicle.pricePerDay)
      ) {
        throw new Error(
          "Vehicle details have changed. Please check availability again."
        );
      }

      // ======================================
      // UPDATE LATEST RENTAL POLICY
      // ======================================

      setSettings((previous) =>
        previous
          ? {
              ...previous,

              minRentalDays:
                data.bookingPolicy.minRentalDays,

              maxRentalDays:
                data.bookingPolicy.maxRentalDays,

              allowCancellation:
                data.bookingPolicy.allowCancellation,
            }
          : previous
      );

      setAvailability(
        data.available
          ? "available"
          : "unavailable"
      );

      setAvailabilityMessage(data.message);

      // ======================================
      // STORE VERIFIED RENTAL DETAILS
      // ======================================

      if (
        data.available &&
        finalVehicle.locationId !== null
      ) {
        setVerifiedRental({
          vehicleId: finalVehicle.id,

          locationId:
            finalVehicle.locationId,

          startDate,

          endDate,

          totalDays: data.totalDays,

          totalAmount: data.totalAmount,
        });
      } else {
        setVerifiedRental(null);
      }
    } catch (err) {
      if (
        currentRequest !== requestId.current ||
        controller.signal.aborted
      ) {
        return;
      }

      setAvailability("error");

      setVerifiedRental(null);

      setAvailabilityMessage(
        err instanceof Error
          ? err.message
          : "Unable to check availability."
      );
    } finally {
      if (
        currentRequest === requestId.current
      ) {
        setChecking(false);

        checkLock.current = false;

        checkController.current = null;
      }
    }
  }

  // ==========================================
  // CONTINUE BOOKING
  // ==========================================

  function handleContinueBooking() {
    if (
      !vehicle ||
      !settings ||
      !verifiedRental ||
      !canContinueBooking
    ) {
      return;
    }

    try {
      if (!hasActiveLocation(vehicle)) {
        throw new Error(
          "Pickup location is unavailable."
        );
      }

      const validationError = getDateError(
        startDate,
        endDate,
        settings
      );

      if (validationError) {
        throw new Error(validationError);
      }

      if (
        verifiedRental.vehicleId !== vehicle.id ||
        verifiedRental.locationId !== vehicle.locationId ||
        verifiedRental.startDate !== startDate ||
        verifiedRental.endDate !== endDate
      ) {
        throw new Error(
          "Rental details have changed. Please check availability again."
        );
      }

      const query = new URLSearchParams({
        vehicleId: String(vehicle.id),

        locationId: String(
          verifiedRental.locationId
        ),

        startDate,

        endDate,
      });

      router.push(
        `/booking?${query.toString()}`
      );
    } catch (err) {
      setAvailability("error");

      setVerifiedRental(null);

      setAvailabilityMessage(
        err instanceof Error
          ? err.message
          : "Invalid rental details."
      );
    }
  }

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {
    return <VehicleDetailsLoading />;
  }

  // ==========================================
  // ERROR STATE
  // ==========================================

  if (error || !vehicle || !settings) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <CircleAlert
          size={48}
          className="mx-auto mb-4 text-red-500"
        />

        <h1 className="text-xl font-bold text-primary-dark">
          {error ||
            "Vehicle details or rental settings unavailable."}
        </h1>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() =>
              setReloadKey(
                (previous) => previous + 1
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            <RefreshCw size={16} />

            Try Again
          </button>

          <Link
            href={backUrl}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-primary"
          >
            <ArrowLeft size={16} />

            Back to Vehicles
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // VEHICLE DISPLAY DATA
  // ==========================================

  const imageUrl =
    getVehicleImage(vehicle.image);

  const VehicleIcon =
    vehicle.type === "car"
      ? CarFront
      : Bike;

  const specs = [
    {
      icon: Fuel,
      label: "Fuel Type",
      value: vehicle.fuelType || "N/A",
    },
    {
      icon: Settings2,
      label: "Transmission",
      value: vehicle.transmission || "N/A",
    },
    {
      icon: UsersRound,
      label: "Seating Capacity",
      value: vehicle.seatingCapacity
        ? `${vehicle.seatingCapacity} Seats`
        : "N/A",
    },
  ];

  // ==========================================
  // PAGE UI
  // ==========================================

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">

        {/* Back Navigation */}

        <Link
          href={backUrl}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-primary"
        >
          <ArrowLeft size={18} />

          Back to Vehicles
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">

          {/* ==================================
              VEHICLE INFORMATION
          ================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

            {/* Vehicle Image */}

            <div className="relative flex h-72 items-center justify-center bg-slate-100 md:h-96">
              {imageUrl && !imageError ? (
                <img
                  src={imageUrl}
                  alt={vehicle.name}
                  onError={() =>
                    setImageError(true)
                  }
                  className="h-full w-full object-contain p-6"
                />
              ) : (
                <VehicleIcon
                  size={130}
                  strokeWidth={1}
                  className="text-slate-300"
                />
              )}

              <span className="absolute left-4 top-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold capitalize text-primary shadow-sm">
                {vehicle.type}
              </span>
            </div>

            <div className="space-y-6 p-6">

              {/* Vehicle Name and Status */}

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">
                    {vehicle.brand}
                  </p>

                  <h1 className="mt-1 text-3xl font-bold text-primary-dark">
                    {vehicle.name}
                  </h1>

                  <p className="mt-2 text-sm text-slate-500">
                    Model: {vehicle.model}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    statusStyles[vehicle.status] ||
                    "bg-slate-100 text-slate-600"
                  }`}
                >
                  {getVehicleStatusLabel(
                    vehicle.status
                  )}
                </span>
              </div>

              {/* Vehicle Specifications */}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {specs.map(
                  ({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      <Icon
                        size={22}
                        className="mb-3 text-primary"
                      />

                      <p className="text-xs text-slate-500">
                        {label}
                      </p>

                      <p className="mt-1 font-semibold capitalize text-primary-dark">
                        {value}
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* ==================================
                  PICKUP LOCATION DETAILS
              ================================== */}

              <div className="border-t border-slate-100 pt-5">
                <h2 className="flex items-center gap-2 text-lg font-bold text-primary-dark">
                  <MapPin
                    size={21}
                    className="text-primary"
                  />

                  Pickup & Return Location
                </h2>

                {vehicle.location ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                        <MapPin size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-primary-dark">
                          {vehicle.location.name}
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-600">
                          {vehicle.location.city}
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-500">
                          {vehicle.location.address}
                        </p>

                        <span
                          className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            activeLocation
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {activeLocation
                            ? "Active Pickup Location"
                            : "Location Unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                    <CircleAlert
                      size={19}
                      className="shrink-0"
                    />

                    Pickup location has not been
                    assigned to this vehicle.
                  </div>
                )}

                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  Collect and return the vehicle
                  at the assigned rental location.
                </p>
              </div>

              {/* About Vehicle */}

              <div className="border-t border-slate-100 pt-5">
                <h2 className="text-lg font-bold text-primary-dark">
                  About This Vehicle
                </h2>

                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {vehicle.description ||
                    "Vehicle description is currently unavailable."}
                </p>
              </div>

              {/* Booking Confirmation Info */}

              <div className="flex items-center gap-3 rounded-xl bg-primary-light p-4">
                <ShieldCheck
                  size={25}
                  className="shrink-0 text-primary"
                />

                <div>
                  <p className="text-sm font-semibold text-primary-dark">
                    Booking Confirmation
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-primary">
                    All booking requests are
                    subject to admin approval.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================
              BOOKING SIDEBAR
          ================================== */}

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 lg:sticky lg:top-24">

            {/* Rental Price */}

            <p className="text-sm text-slate-500">
              Rental Price
            </p>

            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(
                  vehicle.pricePerDay
                )}
              </span>

              <span className="text-sm text-slate-500">
                / day
              </span>
            </div>

            <div className="my-6 border-t border-slate-100" />

            <h2 className="text-xl font-bold text-primary-dark">
              Book Your Ride
            </h2>

            {/* Selected Pickup Location */}

            {vehicle.location && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-primary-light p-4">
                <MapPin
                  size={21}
                  className="mt-0.5 shrink-0 text-primary"
                />

                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary">
                    Pickup & Return Location
                  </p>

                  <p className="mt-1 text-sm font-bold text-primary-dark">
                    {vehicle.location.name}
                  </p>

                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">
                    {vehicle.location.address}
                  </p>
                </div>
              </div>
            )}

            {/* Location Validation Error */}

            {locationError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"
              >
                <div className="flex items-start gap-2 text-sm text-amber-800">
                  <CircleAlert
                    size={19}
                    className="shrink-0"
                  />

                  {locationError}
                </div>

                <Link
                  href="/vehicles"
                  className="mt-3 inline-flex text-xs font-semibold text-amber-800 underline"
                >
                  Search Vehicles Again
                </Link>
              </div>
            )}

            <div className="my-6 border-t border-slate-100" />

            {/* Rental Dates Heading */}

            <h2 className="flex items-center gap-2 text-lg font-bold text-primary-dark">
              <CalendarDays
                size={20}
                className="text-primary"
              />

              Select Rental Dates
            </h2>

            {/* Rental Policy */}

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                {
                  label: "Minimum Rental",
                  days: settings.minRentalDays,
                },
                {
                  label: "Maximum Rental",
                  days: settings.maxRentalDays,
                },
              ].map(({ label, days }) => (
                <div
                  key={label}
                  className="rounded-xl bg-slate-50 p-3"
                >
                  <p className="text-xs text-slate-500">
                    {label}
                  </p>

                  <p className="mt-1 font-semibold text-primary-dark">
                    {days}{" "}
                    {days === 1 ? "Day" : "Days"}
                  </p>
                </div>
              ))}
            </div>

            {/* Prefilled Date Information */}

            {dateNotice && (
              <div
                role="status"
                className="mt-4 flex items-start gap-2 rounded-xl bg-primary-light p-3 text-xs leading-relaxed text-primary"
              >
                <CalendarDays
                  size={17}
                  className="shrink-0"
                />

                {dateNotice}
              </div>
            )}

            {/* Rental Date Inputs */}

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="pickupDate"
                  className={labelClass}
                >
                  Pickup Date
                </label>

                <input
                  id="pickupDate"
                  type="date"
                  min={today}
                  value={startDate}
                  disabled={
                    checking ||
                    !canCheckAvailability
                  }
                  onChange={(event) =>
                    handleStartDate(
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="returnDate"
                  className={labelClass}
                >
                  Return Date
                </label>

                <input
                  id="returnDate"
                  type="date"
                  min={minReturnDate}
                  max={maxReturnDate}
                  value={endDate}
                  disabled={
                    checking ||
                    !validStartDate ||
                    !canCheckAvailability
                  }
                  onChange={(event) =>
                    handleEndDate(
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </div>

              {/* Rental Duration Error */}

              {durationError && (
                <p
                  role="alert"
                  className="rounded-xl bg-red-50 p-3 text-sm text-red-600"
                >
                  {durationError}
                </p>
              )}

              {/* Check Availability Button */}

              <button
                type="button"
                onClick={
                  handleCheckAvailability
                }
                disabled={
                  checking ||
                  !canCheckAvailability ||
                  !startDate ||
                  !endDate ||
                  Boolean(durationError)
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary-light py-3 text-sm font-semibold text-primary transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checking ? (
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <CalendarDays size={18} />
                )}

                {checking
                  ? "Checking Availability..."
                  : availability === "available"
                    ? "Recheck Availability"
                    : "Check Availability"}
              </button>

              {/* Vehicle Status Warning */}

              {!canBookVehicle(vehicle.status) && (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                  This vehicle is currently not
                  accepting bookings.
                </p>
              )}

              {vehicle.status === "rented" &&
                canCheckAvailability && (
                  <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-700">
                    This vehicle is currently
                    rented. You can check future
                    rental dates.
                  </p>
                )}

              {/* Availability Result */}

              {availabilityMessage && (
                <div
                  role="status"
                  className={`flex items-start gap-2 rounded-xl p-3 text-sm leading-relaxed ${
                    availability === "available"
                      ? "bg-green-50 text-green-700"
                      : availability === "unavailable"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  {availability === "available" ? (
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

                  {availabilityMessage}
                </div>
              )}
            </div>

            {/* ==================================
                RENTAL SUMMARY
            ================================== */}

            <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
              <h3 className="font-bold text-primary-dark">
                Rental Summary
              </h3>

              {/* Pickup Location Summary */}

              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="shrink-0 text-slate-500">
                  Pickup location
                </span>

                <span className="text-right font-medium text-primary-dark">
                  {vehicle.location?.name ||
                    "Not assigned"}
                </span>
              </div>

              {/* Price and Duration */}

              {[
                {
                  label: "Price per day",
                  value: formatCurrency(
                    vehicle.pricePerDay
                  ),
                },
                {
                  label: "Rental duration",
                  value: `${totalDays} ${
                    totalDays === 1
                      ? "Day"
                      : "Days"
                  }`,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="text-slate-500">
                    {label}
                  </span>

                  <span className="font-medium text-primary-dark">
                    {value}
                  </span>
                </div>
              ))}

              {/* Total Rental Amount */}

              <div className="rounded-xl bg-primary-light p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-primary-dark">
                    {hasVerifiedRental
                      ? "Total Rental Amount"
                      : "Estimated Rental Amount"}
                  </span>

                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(
                      Number.isFinite(totalAmount)
                        ? totalAmount
                        : 0
                    )}
                  </span>
                </div>

                {!hasVerifiedRental && (
                  <p className="mt-2 text-xs leading-relaxed text-primary">
                    Check availability to verify
                    your rental amount.
                  </p>
                )}
              </div>

              {/* Continue Booking Button */}

              <button
                type="button"
                onClick={
                  handleContinueBooking
                }
                disabled={!canContinueBooking}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue Booking

                <ArrowRight size={18} />
              </button>

              {/* Payment Information */}

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck
                  size={16}
                  className="text-primary"
                />

                No online payment required.
              </div>

              <p className="text-center text-xs leading-relaxed text-slate-400">
                Availability is subject to
                change until your booking
                request is submitted.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PAGE EXPORT
// ==========================================

export default function VehicleDetailsPage() {
  return (
    <Suspense
      fallback={<VehicleDetailsLoading />}
    >
      <VehicleDetailsContent />
    </Suspense>
  );
}