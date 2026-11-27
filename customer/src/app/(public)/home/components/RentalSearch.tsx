"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  CarFront,
  Bike,
  MapPin,
  CalendarDays,
  Search,
  ArrowRight,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import {
  getPublicLocations,
  getPublicSettings,
  type PickupLocation,
  type RentalPolicy,
} from "@/lib/api";

// ==========================================
// DATE HELPERS
// ==========================================

function getTodayDate(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  const day = parts.find(
    (part) => part.type === "day"
  )?.value;

  return `${year}-${month}-${day}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function addDays(
  value: string,
  days: number
): string {
  if (!isValidDate(value)) return "";

  const date = new Date(`${value}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function getRentalDays(
  startDate: string,
  endDate: string
): number {
  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate)
  ) {
    return 0;
  }

  const start = Date.parse(
    `${startDate}T00:00:00Z`
  );

  const end = Date.parse(
    `${endDate}T00:00:00Z`
  );

  return (end - start) / 86400000;
}

// ==========================================
// STYLES
// ==========================================

const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

const labelClass =
  "mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700";

// ==========================================
// RENTAL SEARCH COMPONENT
// ==========================================

export default function RentalSearch() {
  const router = useRouter();

  const [vehicleType, setVehicleType] =
    useState<"car" | "bike">("car");

  const [locations, setLocations] =
    useState<PickupLocation[]>([]);

  const [locationId, setLocationId] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [policy, setPolicy] =
    useState<RentalPolicy | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [reloadKey, setReloadKey] =
    useState(0);

  // ==========================================
  // LOAD LOCATIONS AND RENTAL SETTINGS
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    let cancelled = false;

    async function loadSearchData() {
      setLoading(true);
      setLoadError("");
      setPolicy(null);

      try {
        const [
          locationsResponse,
          settingsResponse,
        ] = await Promise.all([
          getPublicLocations(controller.signal),
          getPublicSettings(controller.signal),
        ]);

        if (cancelled) return;

        const settings = settingsResponse.settings;

        if (
          !Number.isSafeInteger(
            settings.minRentalDays
          ) ||
          !Number.isSafeInteger(
            settings.maxRentalDays
          ) ||
          settings.minRentalDays < 1 ||
          settings.maxRentalDays <
            settings.minRentalDays ||
          settings.maxRentalDays > 366
        ) {
          throw new Error(
            "Invalid rental policy settings"
          );
        }

        setLocations(
          locationsResponse.locations
        );

        setPolicy({
          minRentalDays:
            settings.minRentalDays,

          maxRentalDays:
            settings.maxRentalDays,

          allowCancellation:
            settings.allowCancellation,
        });

        // Preserve selected location if valid

        setLocationId((previous) => {
          const exists =
            locationsResponse.locations.some(
              (location) =>
                String(location.id) === previous
            );

          return exists ? previous : "";
        });
      } catch (error) {
        if (
          cancelled ||
          controller.signal.aborted
        ) {
          return;
        }

        setLocations([]);

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load rental search details."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSearchData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadKey]);

  // ==========================================
  // DERIVED VALUES
  // ==========================================

  const today = getTodayDate();

  const selectedLocation = locations.find(
    (location) =>
      String(location.id) === locationId
  );

  const rentalDays = getRentalDays(
    startDate,
    endDate
  );

  const minReturnDate =
    startDate && policy
      ? addDays(
          startDate,
          policy.minRentalDays
        )
      : "";

  const maxReturnDate =
    startDate && policy
      ? addDays(
          startDate,
          policy.maxRentalDays
        )
      : "";

  // ==========================================
  // HANDLE VEHICLE TYPE
  // ==========================================

  function handleVehicleType(
    type: "car" | "bike"
  ) {
    setVehicleType(type);
    setFormError("");
  }

  // ==========================================
  // HANDLE LOCATION
  // ==========================================

  function handleLocation(value: string) {
    setLocationId(value);
    setFormError("");
  }

  // ==========================================
  // HANDLE PICKUP DATE
  // ==========================================

  function handleStartDate(value: string) {
    setStartDate(value);
    setFormError("");

    if (!value || !policy) {
      setEndDate("");
      return;
    }

    const days = getRentalDays(
      value,
      endDate
    );

    if (
      days < policy.minRentalDays ||
      days > policy.maxRentalDays
    ) {
      setEndDate("");
    }
  }

  // ==========================================
  // HANDLE RETURN DATE
  // ==========================================

  function handleEndDate(value: string) {
    setEndDate(value);
    setFormError("");
  }

  // ==========================================
  // SEARCH VALIDATION
  // ==========================================

  function validateSearch(): string | null {
    if (loading) {
      return "Please wait while rental details are loading.";
    }

    if (loadError || !policy) {
      return "Unable to verify rental settings. Please try again.";
    }

    if (!selectedLocation) {
      return "Please select a pickup location.";
    }

    if (!isValidDate(startDate)) {
      return "Please select a valid pickup date.";
    }

    if (startDate < getTodayDate()) {
      return "Pickup date cannot be in the past.";
    }

    if (!isValidDate(endDate)) {
      return "Please select a valid return date.";
    }

    if (endDate <= startDate) {
      return "Return date must be after pickup date.";
    }

    if (rentalDays < policy.minRentalDays) {
      return `Minimum rental duration is ${policy.minRentalDays} day(s).`;
    }

    if (rentalDays > policy.maxRentalDays) {
      return `Maximum rental duration is ${policy.maxRentalDays} day(s).`;
    }

    return null;
  }

  // ==========================================
  // SEARCH VEHICLES
  // ==========================================

  function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");

    const error = validateSearch();

    if (error) {
      setFormError(error);
      return;
    }

    const params = new URLSearchParams({
      type: vehicleType,
      locationId,
      startDate,
      endDate,
    });

    router.push(
      `/vehicles?${params.toString()}`
    );
  }

  // ==========================================
  // SEARCH UI
  // ==========================================

  return (
    <form
      onSubmit={handleSearch}
      className="mt-7 w-full max-w-lg rounded-2xl bg-white p-4 text-primary-dark shadow-xl sm:p-5"
    >
      <div className="mb-4">
        <h2 className="text-lg font-bold">
          Find Your Ride
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Choose your location and rental dates.
        </p>
      </div>

      {/* Vehicle Type */}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          aria-pressed={vehicleType === "car"}
          onClick={() =>
            handleVehicleType("car")
          }
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
            vehicleType === "car"
              ? "border-primary bg-primary text-white"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-primary"
          }`}
        >
          <CarFront size={21} />
          Rent a Car
        </button>

        <button
          type="button"
          aria-pressed={vehicleType === "bike"}
          onClick={() =>
            handleVehicleType("bike")
          }
          className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
            vehicleType === "bike"
              ? "border-primary bg-primary text-white"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-primary"
          }`}
        >
          <Bike size={21} />
          Rent a Bike
        </button>
      </div>

      {/* Pickup Location */}

      <div className="mt-4">
        <label
          htmlFor="pickup-location"
          className={labelClass}
        >
          <MapPin
            size={16}
            className="text-primary"
          />

          Pickup Location
        </label>

        <select
          id="pickup-location"
          value={locationId}
          onChange={(event) =>
            handleLocation(event.target.value)
          }
          disabled={
            loading ||
            Boolean(loadError) ||
            locations.length === 0
          }
          className={inputClass}
          required
        >
          <option value="">
            {loading
              ? "Loading locations..."
              : locations.length === 0
                ? "No locations available"
                : "Select pickup location"}
          </option>

          {locations.map((location) => (
            <option
              key={location.id}
              value={location.id}
            >
              {location.name} — {location.city}
            </option>
          ))}
        </select>

        {selectedLocation && (
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
            <MapPin
              size={14}
              className="mt-0.5 shrink-0 text-primary"
            />

            {selectedLocation.address}
          </p>
        )}

        {!loading &&
          !loadError &&
          locations.length === 0 && (
            <p className="mt-2 text-xs text-amber-700">
              No active pickup locations are
              currently available.
            </p>
          )}
      </div>

      {/* Rental Dates */}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label
            htmlFor="pickup-date"
            className={labelClass}
          >
            <CalendarDays
              size={16}
              className="text-primary"
            />

            Pickup Date
          </label>

          <input
            id="pickup-date"
            type="date"
            value={startDate}
            min={today}
            onChange={(event) =>
              handleStartDate(event.target.value)
            }
            disabled={loading || !policy}
            className={inputClass}
            required
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="return-date"
            className={labelClass}
          >
            <CalendarDays
              size={16}
              className="text-primary"
            />

            Return Date
          </label>

          <input
            id="return-date"
            type="date"
            value={endDate}
            min={minReturnDate || today}
            max={maxReturnDate || undefined}
            onChange={(event) =>
              handleEndDate(event.target.value)
            }
            disabled={
              loading ||
              !policy ||
              !startDate
            }
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* Rental Policy */}

      {policy && (
        <p className="mt-2 text-xs text-slate-500">
          Rental duration: {policy.minRentalDays}
          {" – "}
          {policy.maxRentalDays} days
        </p>
      )}

      {/* Rental Duration */}

      {policy &&
        rentalDays >= policy.minRentalDays &&
        rentalDays <= policy.maxRentalDays && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-primary-light px-3 py-2.5">
            <span className="text-xs font-medium text-primary">
              Total Rental Duration
            </span>

            <span className="text-sm font-bold text-primary">
              {rentalDays}{" "}
              {rentalDays === 1 ? "Day" : "Days"}
            </span>
          </div>
        )}

      {/* API Error */}

      {loadError && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3"
        >
          <p className="text-xs text-red-700">
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              setReloadKey((previous) =>
                previous + 1
              )
            }
            className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-red-700"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      )}

      {/* Form Error */}

      {formError && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
        >
          {formError}
        </div>
      )}

      {/* Search Button */}

      <button
        type="submit"
        disabled={
          loading ||
          Boolean(loadError) ||
          !policy ||
          locations.length === 0
        }
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-dark px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            Loading...
          </>
        ) : (
          <>
            <Search size={18} />

            Search{" "}
            {vehicleType === "car"
              ? "Cars"
              : "Bikes"}

            <ArrowRight size={18} />
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-slate-500">
        Explore vehicles without logging in.
      </p>
    </form>
  );
}