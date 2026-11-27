"use client";

import {
  getVehicleStatusLabel,
  type Location,
} from "@/lib/api";

import {
  inputClass,
  allStatuses,
} from "../constants";

import type {
  TypeFilter,
  StatusFilter,
  LocationFilter,
} from "../types";

type VehicleFiltersProps = {
  loading: boolean;
  totalCount: number;
  filteredCount: number;

  search: string;
  typeFilter: TypeFilter;
  statusFilter: StatusFilter;
  locationFilter: LocationFilter;

  locations: Location[];
  locationsLoading: boolean;
  locationsError: string;

  hasFilters: boolean;

  setSearch: (value: string) => void;
  setTypeFilter: (value: TypeFilter) => void;
  setStatusFilter: (value: StatusFilter) => void;
  setLocationFilter: (value: LocationFilter) => void;

  clearFilters: () => void;
  onReloadLocations: () => void;
};

export default function VehicleFilters({
  loading,
  totalCount,
  filteredCount,

  search,
  typeFilter,
  statusFilter,
  locationFilter,

  locations,
  locationsLoading,
  locationsError,

  hasFilters,

  setSearch,
  setTypeFilter,
  setStatusFilter,
  setLocationFilter,

  clearFilters,
  onReloadLocations,
}: VehicleFiltersProps) {
  return (
    <div className="border-b border-slate-100 p-5">

      {/* ======================================
          LIST HEADER
      ====================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            All Vehicles
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? "Loading vehicles..."
              : `Showing ${filteredCount} of ${totalCount} vehicles`}
          </p>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ======================================
          SEARCH AND FILTERS
      ====================================== */}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">

        {/* Search Vehicles */}

        <input
          type="search"
          aria-label="Search vehicles"
          placeholder="Search name, brand, registration or location..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          className={`${inputClass} sm:col-span-2`}
        />

        {/* Vehicle Type Filter */}

        <select
          aria-label="Filter by vehicle type"
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(
              event.target.value as TypeFilter
            )
          }
          className={inputClass}
        >
          <option value="all">
            All Vehicle Types
          </option>

          <option value="car">
            Cars
          </option>

          <option value="bike">
            Bikes
          </option>
        </select>

        {/* Vehicle Status Filter */}

        <select
          aria-label="Filter by vehicle status"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as StatusFilter
            )
          }
          className={inputClass}
        >
          <option value="all">
            All Statuses
          </option>

          {allStatuses.map((status) => (
            <option
              key={status}
              value={status}
            >
              {getVehicleStatusLabel(status)}
            </option>
          ))}
        </select>

        {/* ======================================
            PICKUP LOCATION FILTER
        ====================================== */}

        <select
          aria-label="Filter by pickup location"
          value={locationFilter}
          disabled={locationsLoading}
          onChange={(event) =>
            setLocationFilter(
              event.target.value as LocationFilter
            )
          }
          className={`${inputClass} sm:col-span-2 xl:col-span-1`}
        >
          <option value="all">
            {locationsLoading
              ? "Loading Locations..."
              : "All Locations"}
          </option>

          <option value="unassigned">
            Unassigned Vehicles
          </option>

          {/* Preserve selected location if unavailable */}

          {locationFilter !== "all" &&
            locationFilter !== "unassigned" &&
            !locations.some(
              (location) =>
                String(location.id) === locationFilter
            ) && (
              <option value={locationFilter}>
                Location #{locationFilter}
              </option>
            )}

          {/* Dynamic location options */}

          {locations.map((location) => (
            <option
              key={location.id}
              value={String(location.id)}
            >
              {location.name} — {location.city}
              {location.status === "inactive"
                ? " (Inactive)"
                : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ======================================
          LOCATION API ERROR
      ====================================== */}

      {locationsError && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-xs text-amber-700">
            Unable to load pickup locations.
            {` ${locationsError}`}
          </p>

          <button
            type="button"
            onClick={onReloadLocations}
            disabled={locationsLoading}
            className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
          >
            Retry Loading Locations
          </button>
        </div>
      )}
    </div>
  );
}