"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  CarFront,
  Bike,
  Search,
  Fuel,
  Settings2,
  UsersRound,
  ArrowRight,
  LoaderCircle,
  RefreshCw,
  SlidersHorizontal,
  MapPin,
  CalendarDays,
  CheckCircle2,
  X,
} from "lucide-react";

import {
  getVehicles,
  getVehicleImage,
  getPublicLocations,
  getPublicSettings,
  checkVehicleAvailability,
  getVehicleStatusLabel,
  canBookVehicle,
  formatCurrency,
  getTodayDate,
  isValidDate,
  calculateRentalDays,
  validateRentalDuration,
  type Vehicle,
  type VehicleFilters,
  type PickupLocation,
  type RentalPolicy,
  type AvailabilityResponse,
} from "@/lib/api";

// ==========================================
// TYPES
// ==========================================

type VehicleFilter = "all" | "car" | "bike";

type SortOption =
  | "default"
  | "price-low"
  | "price-high";

type RentalSearch = {
  type: VehicleFilter;
  locationId: string;
  startDate: string;
  endDate: string;
};

type VehicleResult = {
  vehicle: Vehicle;
  availability: AvailabilityResponse | null;
  availabilityError: string | null;
};

// ==========================================
// CONSTANTS
// ==========================================

const filters: {
  label: string;
  value: VehicleFilter;
}[] = [
  { label: "All Vehicles", value: "all" },
  { label: "Cars", value: "car" },
  { label: "Bikes", value: "bike" },
];

const emptySearch: RentalSearch = {
  type: "all",
  locationId: "",
  startDate: "",
  endDate: "",
};

const statusStyles: Record<string, string> = {
  available: "bg-green-50 text-green-700",
  rented: "bg-amber-50 text-amber-700",
  maintenance: "bg-red-50 text-red-700",
  inactive: "bg-slate-100 text-slate-600",
};

const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";

const labelClass =
  "mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700";

// ==========================================
// HELPERS
// ==========================================

function parseVehicleType(
  value: string | null
): VehicleFilter {
  return value === "car" || value === "bike"
    ? value
    : "all";
}

function isValidLocationId(
  value: string
): boolean {
  if (!/^[1-9]\d*$/.test(value)) {
    return false;
  }

  const id = Number(value);

  return (
    Number.isSafeInteger(id) &&
    id > 0 &&
    id <= 4294967295
  );
}

function addDays(
  value: string,
  days: number
): string {
  if (!isValidDate(value)) return "";

  const date = new Date(
    `${value}T00:00:00Z`
  );

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date.toISOString().slice(0, 10);
}

function hasRentalDates(
  criteria: RentalSearch
): boolean {
  return Boolean(
    criteria.startDate && criteria.endDate
  );
}

function buildSearchUrl(
  criteria: RentalSearch
): string {
  const params = new URLSearchParams();

  if (criteria.type !== "all") {
    params.set("type", criteria.type);
  }

  if (criteria.locationId) {
    params.set(
      "locationId",
      criteria.locationId
    );
  }

  if (criteria.startDate) {
    params.set(
      "startDate",
      criteria.startDate
    );
  }

  if (criteria.endDate) {
    params.set(
      "endDate",
      criteria.endDate
    );
  }

  const query = params.toString();

  return query
    ? `/vehicles?${query}`
    : "/vehicles";
}

function validateSearch(
  criteria: RentalSearch,
  locations: PickupLocation[],
  policy: RentalPolicy | null
): string | null {
  if (criteria.locationId) {
    if (
      !isValidLocationId(
        criteria.locationId
      )
    ) {
      return "Invalid pickup location.";
    }

    const locationExists = locations.some(
      (location) =>
        String(location.id) ===
        criteria.locationId
    );

    if (!locationExists) {
      return "Selected pickup location is no longer available.";
    }
  }

  const hasStart = Boolean(
    criteria.startDate
  );

  const hasEnd = Boolean(
    criteria.endDate
  );

  if (hasStart !== hasEnd) {
    return "Please select both pickup and return dates.";
  }

  if (!hasStart && !hasEnd) {
    return null;
  }

  if (!criteria.locationId) {
    return "Please select a pickup location.";
  }

  if (!policy) {
    return "Unable to verify rental policy.";
  }

  if (
    !isValidDate(criteria.startDate) ||
    !isValidDate(criteria.endDate)
  ) {
    return "Please select valid rental dates.";
  }

  if (
    criteria.startDate < getTodayDate()
  ) {
    return "Pickup date cannot be in the past.";
  }

  if (
    criteria.endDate <= criteria.startDate
  ) {
    return "Return date must be after pickup date.";
  }

  const totalDays = calculateRentalDays(
    criteria.startDate,
    criteria.endDate
  );

  try {
    validateRentalDuration(
      totalDays,
      policy
    );
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Invalid rental duration.";
  }

  return null;
}

// ==========================================
// VEHICLE CARD
// ==========================================

function VehicleCard({
  result,
  criteria,
}: {
  result: VehicleResult;
  criteria: RentalSearch;
}) {
  const {
    vehicle,
    availability,
    availabilityError,
  } = result;

  const [failedImage, setFailedImage] =
    useState<string | null>(null);

  const imageUrl = getVehicleImage(
    vehicle.image
  );

  const VehicleIcon =
    vehicle.type === "car"
      ? CarFront
      : Bike;

  const dateSearch =
    hasRentalDates(criteria);

  const activeLocation =
    vehicle.location?.status === "active";

  const bookable =
    activeLocation &&
    (dateSearch
      ? availability?.available === true
      : canBookVehicle(vehicle.status));

  const params = new URLSearchParams();

  if (vehicle.locationId) {
    params.set(
      "locationId",
      String(vehicle.locationId)
    );
  }

  if (dateSearch) {
    params.set(
      "startDate",
      criteria.startDate
    );

    params.set(
      "endDate",
      criteria.endDate
    );
  }

  const query = params.toString();

  const detailsUrl =
    `/vehicles/${vehicle.id}` +
    (query ? `?${query}` : "");

  const dailyPrice =
    availability?.vehicle.pricePerDay ??
    vehicle.pricePerDay;

  const currentStatus =
    availability?.vehicle.status ??
    vehicle.status;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg">

      {/* Vehicle Image */}

      <div className="relative flex h-52 items-center justify-center overflow-hidden bg-slate-100">
        {imageUrl &&
        failedImage !== imageUrl ? (
          <img
            src={imageUrl}
            alt={vehicle.name}
            loading="lazy"
            onError={() =>
              setFailedImage(imageUrl)
            }
            className="h-full w-full object-contain p-4 transition duration-500 group-hover:scale-105"
          />
        ) : (
          <VehicleIcon
            size={90}
            strokeWidth={1}
            className="text-slate-300"
          />
        )}

        <span className="absolute left-3 top-3 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold capitalize text-primary shadow-sm">
          {vehicle.type}
        </span>

        {dateSearch &&
          availability?.available === true && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700">
              <CheckCircle2 size={13} />
              Dates Available
            </span>
          )}
      </div>

      {/* Vehicle Information */}

      <div className="flex flex-1 flex-col gap-4 p-5">

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {vehicle.brand}
            </p>

            <h2 className="mt-1 text-lg font-bold text-primary-dark">
              {vehicle.name}
            </h2>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              statusStyles[currentStatus] ||
              "bg-slate-100 text-slate-600"
            }`}
          >
            {getVehicleStatusLabel(
              currentStatus
            )}
          </span>
        </div>

        {/* Pickup Location */}

        <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
          <MapPin
            size={17}
            className="mt-0.5 shrink-0 text-primary"
          />

          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700">
              {vehicle.location?.name ||
                "Pickup location not assigned"}
            </p>

            {vehicle.location?.city && (
              <p className="mt-1 text-xs text-slate-500">
                {vehicle.location.city}
              </p>
            )}

            {vehicle.location &&
              !activeLocation && (
                <p className="mt-1 text-xs text-amber-700">
                  Pickup location unavailable
                </p>
              )}
          </div>
        </div>

        {/* Specifications */}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {vehicle.fuelType && (
            <span className="flex items-center gap-1.5 capitalize">
              <Fuel size={15} />
              {vehicle.fuelType}
            </span>
          )}

          {vehicle.transmission && (
            <span className="flex items-center gap-1.5 capitalize">
              <Settings2 size={15} />
              {vehicle.transmission}
            </span>
          )}

          {!!vehicle.seatingCapacity && (
            <span className="flex items-center gap-1.5">
              <UsersRound size={15} />
              {vehicle.seatingCapacity} Seats
            </span>
          )}
        </div>

        {/* Availability Information */}

        {dateSearch && availability && (
          <div
            className={`rounded-xl p-3 text-xs leading-relaxed ${
              availability.available
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {availability.message}
          </div>
        )}

        {availabilityError && (
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            Unable to verify availability.
            Please try again.
          </div>
        )}

        {!activeLocation && (
          <p className="text-xs text-amber-700">
            This vehicle is not currently
            accepting location-based bookings.
          </p>
        )}

        {/* Rental Price */}

        <div className="mt-auto border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Rental Price
          </p>

          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(dailyPrice)}
            </span>

            <span className="text-sm text-slate-400">
              / day
            </span>
          </div>

          {dateSearch &&
            availability?.available === true && (
              <div className="mt-3 rounded-xl bg-primary-light p-3">
                <p className="text-xs text-primary">
                  Total for{" "}
                  {availability.totalDays}{" "}
                  {availability.totalDays === 1
                    ? "day"
                    : "days"}
                </p>

                <p className="mt-1 text-xl font-bold text-primary-dark">
                  {formatCurrency(
                    availability.totalAmount
                  )}
                </p>
              </div>
            )}
        </div>

        {/* View Vehicle */}

        <Link
          href={detailsUrl}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
            bookable
              ? "bg-primary text-white hover:bg-primary-hover"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {bookable
            ? "View & Book"
            : "View Details"}

          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}

// ==========================================
// VEHICLE LISTING CONTENT
// ==========================================

function VehiclesContent() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const urlType = parseVehicleType(
    searchParams.get("type")
  );

  const urlLocationId =
    searchParams.get("locationId") || "";

  const urlStartDate =
    searchParams.get("startDate") || "";

  const urlEndDate =
    searchParams.get("endDate") || "";

  const criteria = useMemo<RentalSearch>(
    () => ({
      type: urlType,
      locationId: urlLocationId,
      startDate: urlStartDate,
      endDate: urlEndDate,
    }),
    [
      urlType,
      urlLocationId,
      urlStartDate,
      urlEndDate,
    ]
  );

  const [draft, setDraft] =
    useState<RentalSearch>(criteria);

  const [locations, setLocations] =
    useState<PickupLocation[]>([]);

  const [policy, setPolicy] =
    useState<RentalPolicy | null>(null);

  const [results, setResults] =
    useState<VehicleResult[]>([]);

  const [search, setSearch] =
    useState("");

  const [availableOnly, setAvailableOnly] =
    useState(false);

  const [sort, setSort] =
    useState<SortOption>("default");

  const [metadataLoading, setMetadataLoading] =
    useState(true);

  const [metadataError, setMetadataError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [formError, setFormError] =
    useState("");

  const [metadataReload, setMetadataReload] =
    useState(0);

  const [vehicleReload, setVehicleReload] =
    useState(0);

  const dateSearch =
    hasRentalDates(criteria);

  // ==========================================
  // SYNC URL WITH FILTER FORM
  // ==========================================

  useEffect(() => {
    setDraft(criteria);
    setFormError("");
  }, [criteria]);

  // ==========================================
  // LOAD LOCATIONS AND RENTAL POLICY
  // ==========================================

  useEffect(() => {
    const controller =
      new AbortController();

    let cancelled = false;

    async function loadMetadata() {
      setMetadataLoading(true);
      setMetadataError("");

      try {
        const [
          locationResponse,
          settingsResponse,
        ] = await Promise.all([
          getPublicLocations(
            controller.signal
          ),
          getPublicSettings(
            controller.signal
          ),
        ]);

        if (cancelled) return;

        const settings =
          settingsResponse.settings;

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
            "Invalid rental policy settings."
          );
        }

        setLocations(
          locationResponse.locations
        );

        setPolicy({
          minRentalDays:
            settings.minRentalDays,

          maxRentalDays:
            settings.maxRentalDays,

          allowCancellation:
            settings.allowCancellation,
        });
      } catch (err) {
        if (
          cancelled ||
          controller.signal.aborted
        ) {
          return;
        }

        setLocations([]);
        setPolicy(null);

        setMetadataError(
          err instanceof Error
            ? err.message
            : "Unable to load rental details."
        );
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    }

    void loadMetadata();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [metadataReload]);

  // ==========================================
  // LOAD VEHICLES AND CHECK AVAILABILITY
  // ==========================================

  useEffect(() => {
    if (metadataLoading) return;

    const controller =
      new AbortController();

    let cancelled = false;

    async function loadVehicles() {
      setLoading(true);
      setError("");
      setResults([]);

      try {
        if (metadataError) {
          throw new Error(
            "Unable to verify rental locations and settings."
          );
        }

        const validationError =
          validateSearch(
            criteria,
            locations,
            policy
          );

        if (validationError) {
          throw new Error(validationError);
        }

        const apiFilters: VehicleFilters = {};

        if (criteria.type !== "all") {
          apiFilters.type = criteria.type;
        }

        if (criteria.locationId) {
          apiFilters.locationId = Number(
            criteria.locationId
          );
        }

        const response = await getVehicles(
          apiFilters,
          controller.signal
        );

        if (cancelled) return;

        const vehicles =
          response.vehicles.filter(
            (vehicle) =>
              vehicle.status !== "inactive"
          );

        // Normal browsing without rental dates

        if (!dateSearch) {
          setResults(
            vehicles.map((vehicle) => ({
              vehicle,
              availability: null,
              availabilityError: null,
            }))
          );

          return;
        }

        // Date-based search

        const candidates = vehicles.filter(
          (vehicle) =>
            canBookVehicle(vehicle.status) &&
            vehicle.location?.status ===
              "active" &&
            vehicle.locationId ===
              Number(criteria.locationId)
        );

        const checkedVehicles: VehicleResult[] =
          [];

        // Limit concurrent availability requests

        const batchSize = 5;

        for (
          let index = 0;
          index < candidates.length;
          index += batchSize
        ) {
          if (
            cancelled ||
            controller.signal.aborted
          ) {
            return;
          }

          const batch = candidates.slice(
            index,
            index + batchSize
          );

          const batchResults =
            await Promise.all(
              batch.map(
                async (
                  vehicle
                ): Promise<VehicleResult> => {
                  try {
                    const availability =
                      await checkVehicleAvailability(
                        vehicle.id,
                        criteria.startDate,
                        criteria.endDate,
                        controller.signal
                      );

                    return {
                      vehicle,
                      availability,
                      availabilityError: null,
                    };
                  } catch (err) {
                    return {
                      vehicle,
                      availability: null,
                      availabilityError:
                        err instanceof Error
                          ? err.message
                          : "Availability check failed.",
                    };
                  }
                }
              )
            );

          checkedVehicles.push(
            ...batchResults
          );
        }

        if (cancelled) return;

        setResults(checkedVehicles);
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
            : "Unable to load vehicles."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadVehicles();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    criteria,
    locations,
    policy,
    metadataLoading,
    metadataError,
    dateSearch,
    vehicleReload,
  ]);

  // ==========================================
  // DERIVED VALUES
  // ==========================================

  const today = getTodayDate();

  const selectedLocation =
    locations.find(
      (location) =>
        String(location.id) ===
        draft.locationId
    );

  const appliedLocation =
    locations.find(
      (location) =>
        String(location.id) ===
        criteria.locationId
    );

  const draftRentalDays =
    isValidDate(draft.startDate) &&
    isValidDate(draft.endDate)
      ? calculateRentalDays(
          draft.startDate,
          draft.endDate
        )
      : 0;

  const minReturnDate =
    draft.startDate && policy
      ? addDays(
          draft.startDate,
          policy.minRentalDays
        )
      : "";

  const maxReturnDate =
    draft.startDate && policy
      ? addDays(
          draft.startDate,
          policy.maxRentalDays
        )
      : "";

  const availabilityErrorCount =
    results.filter(
      (result) =>
        result.availabilityError !== null
    ).length;

  const isLoading =
    loading || metadataLoading;

  // ==========================================
  // FILTER AND SORT VEHICLES
  // ==========================================

  const filteredVehicles = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    const filtered = results.filter(
      (result) => {
        const { vehicle, availability } =
          result;

        const matchesType =
          criteria.type === "all" ||
          vehicle.type === criteria.type;

        const matchesSearch = [
          vehicle.name,
          vehicle.brand,
          vehicle.model,
          vehicle.location?.name,
          vehicle.location?.city,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query)
        );

        const matchesAvailability =
          dateSearch
            ? availability?.available ===
              true
            : !availableOnly ||
              (
                vehicle.status ===
                  "available" &&
                vehicle.location?.status ===
                  "active"
              );

        return (
          matchesType &&
          matchesSearch &&
          matchesAvailability
        );
      }
    );

    const getPrice = (
      result: VehicleResult
    ) =>
      Number(
        result.availability?.vehicle
          .pricePerDay ??
          result.vehicle.pricePerDay
      );

    if (sort === "price-low") {
      filtered.sort(
        (a, b) => getPrice(a) - getPrice(b)
      );
    }

    if (sort === "price-high") {
      filtered.sort(
        (a, b) => getPrice(b) - getPrice(a)
      );
    }

    return filtered;
  }, [
    results,
    criteria.type,
    search,
    availableOnly,
    dateSearch,
    sort,
  ]);

  // ==========================================
  // FILTER HANDLERS
  // ==========================================

  function handleLocation(value: string) {
    setDraft((previous) => ({
      ...previous,
      locationId: value,
      startDate: value
        ? previous.startDate
        : "",
      endDate: value
        ? previous.endDate
        : "",
    }));

    setFormError("");
  }

  function handleStartDate(value: string) {
    setDraft((previous) => {
      let nextEndDate = previous.endDate;

      if (
        !value ||
        !policy ||
        !isValidDate(value) ||
        !isValidDate(previous.endDate)
      ) {
        nextEndDate = "";
      } else {
        const days = calculateRentalDays(
          value,
          previous.endDate
        );

        if (
          days < policy.minRentalDays ||
          days > policy.maxRentalDays
        ) {
          nextEndDate = "";
        }
      }

      return {
        ...previous,
        startDate: value,
        endDate: nextEndDate,
      };
    });

    setFormError("");
  }

  function handleEndDate(value: string) {
    setDraft((previous) => ({
      ...previous,
      endDate: value,
    }));

    setFormError("");
  }

  function applySearch(
    nextCriteria: RentalSearch
  ) {
    if (
      metadataLoading ||
      metadataError
    ) {
      return;
    }

    const validationError =
      validateSearch(
        nextCriteria,
        locations,
        policy
      );

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");

    const nextUrl =
      buildSearchUrl(nextCriteria);

    const currentUrl =
      buildSearchUrl(criteria);

    if (nextUrl === currentUrl) {
      setVehicleReload(
        (previous) => previous + 1
      );

      return;
    }

    router.push(nextUrl, {
      scroll: false,
    });
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    applySearch(draft);
  }

  function handleTypeChange(
    type: VehicleFilter
  ) {
    const nextCriteria = {
      ...criteria,
      type,
    };

    applySearch(nextCriteria);
  }

  function clearDates() {
    setDraft((previous) => ({
      ...previous,
      startDate: "",
      endDate: "",
    }));

    setFormError("");
  }

  function clearFilters() {
    setDraft({ ...emptySearch });
    setSearch("");
    setAvailableOnly(false);
    setSort("default");
    setFormError("");

    if (
      buildSearchUrl(criteria) ===
      "/vehicles"
    ) {
      setVehicleReload(
        (previous) => previous + 1
      );
    } else {
      router.push("/vehicles", {
        scroll: false,
      });
    }
  }

  // ==========================================
  // PAGE UI
  // ==========================================

  return (
    <div className="min-h-screen bg-background">

      {/* ======================================
          HERO SECTION
      ====================================== */}

      <section className="bg-primary-dark px-4 pb-20 pt-12 text-white md:pt-16">
        <div className="mx-auto max-w-7xl">

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Explore Our Fleet
          </p>

          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Find Your Perfect Ride
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
            Choose from our collection of
            cars and bikes for your next
            journey.
          </p>

          {/* Vehicle Search */}

          <div className="relative mt-7 max-w-xl">
            <Search
              size={20}
              className="absolute left-4 top-4 text-slate-400"
            />

            <input
              type="search"
              aria-label="Search vehicles"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by vehicle, brand or model..."
              className="w-full rounded-xl bg-white py-4 pl-12 pr-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </section>

      {/* ======================================
          RENTAL SEARCH FILTERS
      ====================================== */}

      <section className="relative mx-auto -mt-8 max-w-7xl px-4 lg:px-8">

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg md:p-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-primary-dark">
                Your Rental Details
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Choose your pickup location
                and preferred rental dates.
              </p>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <X size={15} />
              Reset Filters
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {/* Pickup Location */}

            <div className="min-w-0">
              <label
                htmlFor="listing-location"
                className={labelClass}
              >
                <MapPin
                  size={16}
                  className="text-primary"
                />

                Pickup Location
              </label>

              <select
                id="listing-location"
                value={draft.locationId}
                onChange={(event) =>
                  handleLocation(
                    event.target.value
                  )
                }
                disabled={
                  metadataLoading ||
                  Boolean(metadataError)
                }
                className={inputClass}
              >
                <option value="">
                  {metadataLoading
                    ? "Loading locations..."
                    : "All Pickup Locations"}
                </option>

                {draft.locationId &&
                  !selectedLocation && (
                    <option
                      value={draft.locationId}
                      disabled
                    >
                      Location unavailable
                    </option>
                  )}

                {locations.map(
                  (location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {location.name} —{" "}
                      {location.city}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Pickup Date */}

            <div className="min-w-0">
              <label
                htmlFor="listing-start-date"
                className={labelClass}
              >
                <CalendarDays
                  size={16}
                  className="text-primary"
                />

                Pickup Date
              </label>

              <input
                id="listing-start-date"
                type="date"
                value={draft.startDate}
                min={today}
                disabled={
                  metadataLoading ||
                  !policy ||
                  !selectedLocation
                }
                onChange={(event) =>
                  handleStartDate(
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            {/* Return Date */}

            <div className="min-w-0">
              <label
                htmlFor="listing-end-date"
                className={labelClass}
              >
                <CalendarDays
                  size={16}
                  className="text-primary"
                />

                Return Date
              </label>

              <input
                id="listing-end-date"
                type="date"
                value={draft.endDate}
                min={minReturnDate || today}
                max={
                  maxReturnDate ||
                  undefined
                }
                disabled={
                  metadataLoading ||
                  !policy ||
                  !selectedLocation ||
                  !isValidDate(
                    draft.startDate
                  )
                }
                onChange={(event) =>
                  handleEndDate(
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </div>

            {/* Update Search */}

            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  metadataLoading ||
                  Boolean(metadataError)
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search size={18} />

                Update Search
              </button>
            </div>
          </div>

          {/* Selected Location Address */}

          {selectedLocation && (
            <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
              <MapPin
                size={15}
                className="shrink-0 text-primary"
              />

              {selectedLocation.address}
            </p>
          )}

          {/* Rental Policy */}

          {policy && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Rental duration:{" "}
                {policy.minRentalDays}
                {" – "}
                {policy.maxRentalDays} days
              </p>

              {(draft.startDate ||
                draft.endDate) && (
                <button
                  type="button"
                  onClick={clearDates}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Clear Dates
                </button>
              )}
            </div>
          )}

          {/* Rental Duration */}

          {policy &&
            draftRentalDays >=
              policy.minRentalDays &&
            draftRentalDays <=
              policy.maxRentalDays && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-primary-light px-4 py-3">
                <span className="text-sm font-medium text-primary">
                  Total Rental Duration
                </span>

                <span className="font-bold text-primary-dark">
                  {draftRentalDays}{" "}
                  {draftRentalDays === 1
                    ? "Day"
                    : "Days"}
                </span>
              </div>
            )}

          {/* Metadata Error */}

          {metadataError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
            >
              <p className="text-sm text-red-700">
                {metadataError}
              </p>

              <button
                type="button"
                onClick={() =>
                  setMetadataReload(
                    (previous) =>
                      previous + 1
                  )
                }
                className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-700"
              >
                <RefreshCw size={15} />
                Retry Rental Details
              </button>
            </div>
          )}

          {/* Validation Error */}

          {formError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {formError}
            </div>
          )}
        </form>
      </section>

      {/* ======================================
          VEHICLE LISTING
      ====================================== */}

      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-8">

        {/* Applied Search Details */}

        {(appliedLocation ||
          dateSearch) && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-100 bg-primary-light p-4 text-sm text-primary">

            {appliedLocation && (
              <span className="flex items-center gap-2">
                <MapPin size={16} />

                {appliedLocation.name}
              </span>
            )}

            {dateSearch && (
              <span className="flex items-center gap-2">
                <CalendarDays size={16} />

                {criteria.startDate}
                {" → "}
                {criteria.endDate}
              </span>
            )}
          </div>
        )}

        {/* Category Filters */}

        <div className="flex flex-wrap items-center gap-3">
          {filters.map((item) => {
            const Icon =
              item.value === "bike"
                ? Bike
                : CarFront;

            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={
                  criteria.type ===
                  item.value
                }
                disabled={
                  metadataLoading ||
                  Boolean(metadataError)
                }
                onClick={() =>
                  handleTypeChange(
                    item.value
                  )
                }
                className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${
                  criteria.type ===
                  item.value
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-primary"
                }`}
              >
                <Icon size={18} />

                {item.label}
              </button>
            );
          })}
        </div>

        {/* Sorting and Availability */}

        <div className="my-6 flex flex-wrap items-center justify-between gap-4">

          <p className="text-sm text-slate-500">
            {isLoading ? (
              "Searching vehicles..."
            ) : error ? (
              "Unable to display results"
            ) : (
              <>
                <span className="font-bold text-primary-dark">
                  {filteredVehicles.length}
                </span>

                {" "}
                {dateSearch
                  ? "available vehicles found"
                  : "vehicles found"}
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-4">

            {/* Available Only */}

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={
                  dateSearch ||
                  availableOnly
                }
                disabled={dateSearch}
                onChange={(event) =>
                  setAvailableOnly(
                    event.target.checked
                  )
                }
                className="h-4 w-4 accent-primary"
              />

              {dateSearch
                ? "Available for selected dates"
                : "Available only"}
            </label>

            {/* Price Sorting */}

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <SlidersHorizontal
                size={16}
                className="text-slate-500"
              />

              <select
                aria-label="Sort vehicles"
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target
                      .value as SortOption
                  )
                }
                className="bg-white text-sm text-slate-700 outline-none"
              >
                <option value="default">
                  Sort by
                </option>

                <option value="price-low">
                  Price: Low to High
                </option>

                <option value="price-high">
                  Price: High to Low
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Partial Availability Failure */}

        {!isLoading &&
          !error &&
          availabilityErrorCount > 0 && (
            <div
              role="alert"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <p className="text-sm text-amber-800">
                Availability could not be
                verified for{" "}
                {availabilityErrorCount}{" "}
                vehicle(s). These vehicles
                have been excluded from
                the results.
              </p>

              <button
                type="button"
                onClick={() =>
                  setVehicleReload(
                    (previous) =>
                      previous + 1
                  )
                }
                className="flex items-center gap-2 text-sm font-semibold text-amber-800"
              >
                <RefreshCw size={15} />

                Retry
              </button>
            </div>
          )}

        {/* ======================================
            LOADING STATE
        ====================================== */}

        {isLoading ? (
          <div
            role="status"
            className="flex min-h-64 flex-col items-center justify-center gap-3"
          >
            <LoaderCircle
              size={34}
              className="animate-spin text-primary"
            />

            <p className="text-sm text-slate-500">
              {dateSearch
                ? "Checking vehicle availability..."
                : "Loading vehicles..."}
            </p>
          </div>
        ) : error ? (

          /* ====================================
              ERROR STATE
          ==================================== */

          <div
            role="alert"
            className="rounded-2xl border border-red-100 bg-white p-10 text-center"
          >
            <p className="font-medium text-red-600">
              {error}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (metadataError) {
                    setMetadataReload(
                      (previous) =>
                        previous + 1
                    );
                  } else {
                    setVehicleReload(
                      (previous) =>
                        previous + 1
                    );
                  }
                }}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
              >
                <RefreshCw size={16} />

                Try Again
              </button>

              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : filteredVehicles.length === 0 ? (

          /* ====================================
              EMPTY STATE
          ==================================== */

          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <CarFront
              size={55}
              className="mx-auto mb-4 text-slate-300"
            />

            <h2 className="text-lg font-semibold text-primary-dark">
              {availabilityErrorCount > 0
                ? "No verified available vehicles"
                : dateSearch
                  ? "No available vehicles found"
                  : "No vehicles found"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {availabilityErrorCount > 0
                ? "Some availability checks failed. Please retry before changing your rental dates."
                : dateSearch
                  ? "No matching vehicles are available for your selected location and rental dates. Try another date or location."
                  : "Try changing your search or vehicle filters."}
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
            >
              Clear Filters
            </button>
          </div>
        ) : (

          /* ====================================
              VEHICLE GRID
          ==================================== */

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredVehicles.map(
              (result) => (
                <VehicleCard
                  key={result.vehicle.id}
                  result={result}
                  criteria={criteria}
                />
              )
            )}
          </div>
        )}

        {/* Booking Information */}

        {!isLoading &&
          !error &&
          filteredVehicles.length > 0 && (
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-center text-xs leading-relaxed text-slate-500">
              Vehicle availability is
              subject to change. All booking
              requests require admin
              confirmation. Online payment
              is not required to submit a
              booking request.
            </div>
          )}
      </section>
    </div>
  );
}

// ==========================================
// SUSPENSE FALLBACK
// ==========================================

function VehiclesPageLoading() {
  return (
    <div
      role="status"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background"
    >
      <LoaderCircle
        size={36}
        className="animate-spin text-primary"
      />

      <p className="text-sm text-slate-500">
        Loading vehicle listing...
      </p>
    </div>
  );
}

// ==========================================
// PAGE EXPORT
// ==========================================

export default function VehiclesPage() {
  return (
    <Suspense
      fallback={<VehiclesPageLoading />}
    >
      <VehiclesContent />
    </Suspense>
  );
}