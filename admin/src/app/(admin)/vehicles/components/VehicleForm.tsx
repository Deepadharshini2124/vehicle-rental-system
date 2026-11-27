"use client";

import Link from "next/link";
import type { FormEvent } from "react";

import type {
  Vehicle,
  Location,
} from "@/lib/api";

import {
  inputClass,
  labelClass,
  fuelTypes,
  transmissions,
} from "../constants";

import type {
  VehicleForm as VehicleFormData,
  UpdateVehicleField,
} from "../types";

import VehicleImage from "./VehicleImage";

type VehicleFormProps = {
  form: VehicleFormData;
  editingId: number | null;
  editingVehicle: Vehicle | null;
  isEditingRented: boolean;

  saving: boolean;
  busy: boolean;
  formError: string;

  activeLocations: Location[];
  locationsLoading: boolean;
  locationsError: string;

  updateField: UpdateVehicleField;
  changeVehicleType: (type: "car" | "bike") => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onReloadLocations: () => void;
};

export default function VehicleForm({
  form,
  editingId,
  editingVehicle,
  isEditingRented,

  saving,
  busy,
  formError,

  activeLocations,
  locationsLoading,
  locationsError,

  updateField,
  changeVehicleType,

  onSubmit,
  onClose,
  onReloadLocations,
}: VehicleFormProps) {
  const isEditing = editingId !== null;

  const originalLocationId = String(
    editingVehicle?.locationId ?? ""
  );

  const locationChanged =
    form.locationId !== originalLocationId;

  const currentLocation = editingVehicle?.location;

  const selectedLocation = activeLocations.find(
    (location) =>
      String(location.id) === form.locationId
  );

  const hasCurrentLocationOption =
    originalLocationId !== "" &&
    !activeLocations.some(
      (location) =>
        String(location.id) === originalLocationId
    );

  const requiresLocation =
    !isEditing || locationChanged;

  const locationDisabled =
    saving ||
    isEditingRented ||
    locationsLoading ||
    Boolean(locationsError);

  const locationUnavailable =
    requiresLocation &&
    (
      locationsLoading ||
      Boolean(locationsError) ||
      !selectedLocation
    );

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* ======================================
          FORM HEADER
      ====================================== */}

      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-xl font-bold">
            {isEditing
              ? "Edit Vehicle"
              : "Add New Vehicle"}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isEditing
              ? "Update existing vehicle information."
              : "Enter the details of your new rental vehicle."}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label="Close form"
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xl text-slate-600 disabled:opacity-50"
        >
          ×
        </button>
      </div>

      {/* ======================================
          FORM CONTENT
      ====================================== */}

      <div className="p-5 md:p-6">

        {/* Rented vehicle warning */}

        {isEditingRented && (
          <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
            This vehicle is currently rented.
            Vehicle type, brand, model,
            registration number and pickup location
            cannot be changed until the rental is
            completed.
          </div>
        )}

        {/* Form validation error */}

        {formError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {formError}
          </div>
        )}

        <fieldset
          disabled={saving}
          className="min-w-0"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* ======================================
                VEHICLE DETAILS
            ====================================== */}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:col-span-2">

              {/* Vehicle Name */}

              <label>
                <span className={labelClass}>
                  Vehicle Name *
                </span>

                <input
                  type="text"
                  required
                  maxLength={150}
                  placeholder="e.g. Hyundai Creta"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              {/* Vehicle Type */}

              <label>
                <span className={labelClass}>
                  Vehicle Type *
                </span>

                <select
                  value={form.type}
                  disabled={isEditingRented}
                  onChange={(event) =>
                    changeVehicleType(
                      event.target.value as
                        | "car"
                        | "bike"
                    )
                  }
                  className={inputClass}
                >
                  <option value="car">Car</option>
                  <option value="bike">Bike</option>
                </select>
              </label>

              {/* Brand */}

              <label>
                <span className={labelClass}>
                  Brand *
                </span>

                <input
                  type="text"
                  required
                  maxLength={100}
                  disabled={isEditingRented}
                  placeholder="e.g. Hyundai"
                  value={form.brand}
                  onChange={(event) =>
                    updateField(
                      "brand",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              {/* Model */}

              <label>
                <span className={labelClass}>
                  Model *
                </span>

                <input
                  type="text"
                  required
                  maxLength={100}
                  disabled={isEditingRented}
                  placeholder="e.g. Creta"
                  value={form.model}
                  onChange={(event) =>
                    updateField(
                      "model",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              {/* Registration Number */}

              <label>
                <span className={labelClass}>
                  Registration Number *
                </span>

                <input
                  type="text"
                  required
                  maxLength={30}
                  disabled={isEditingRented}
                  placeholder="e.g. TN01AB1234"
                  value={form.registrationNumber}
                  onChange={(event) =>
                    updateField(
                      "registrationNumber",
                      event.target.value.toUpperCase()
                    )
                  }
                  className={inputClass}
                />
              </label>

              {/* Fuel Type */}

              <label>
                <span className={labelClass}>
                  Fuel Type *
                </span>

                <select
                  value={form.fuelType}
                  onChange={(event) =>
                    updateField(
                      "fuelType",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  {fuelTypes.map((fuel) => (
                    <option key={fuel} value={fuel}>
                      {fuel === "cng"
                        ? "CNG"
                        : fuel.charAt(0).toUpperCase() +
                          fuel.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              {/* Transmission */}

              <label>
                <span className={labelClass}>
                  Transmission *
                </span>

                <select
                  value={form.transmission}
                  onChange={(event) =>
                    updateField(
                      "transmission",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  {transmissions.map((transmission) => (
                    <option
                      key={transmission}
                      value={transmission}
                    >
                      {transmission
                        .charAt(0)
                        .toUpperCase() +
                        transmission.slice(1)}
                    </option>
                  ))}
                </select>
              </label>

              {/* Seating Capacity */}

              <label>
                <span className={labelClass}>
                  Seating Capacity *
                </span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.seatingCapacity}
                  onChange={(event) =>
                    updateField(
                      "seatingCapacity",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>

              {/* ======================================
                  PICKUP LOCATION
              ====================================== */}

              <div className="md:col-span-2">
                <label htmlFor="vehicle-location">
                  <span className={labelClass}>
                    Pickup Location
                    {requiresLocation ? " *" : ""}
                  </span>
                </label>

                <select
                  id="vehicle-location"
                  value={form.locationId}
                  required={requiresLocation}
                  disabled={locationDisabled}
                  onChange={(event) =>
                    updateField(
                      "locationId",
                      event.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option
                    value=""
                    disabled={
                      !isEditing ||
                      originalLocationId !== ""
                    }
                  >
                    {locationsLoading
                      ? "Loading pickup locations..."
                      : isEditing &&
                          originalLocationId === ""
                        ? "Unassigned — Select pickup location"
                        : "Select pickup location"}
                  </option>

                  {/* Preserve existing inactive location */}

                  {hasCurrentLocationOption && (
                    <option value={originalLocationId}>
                      {currentLocation?.name ??
                        `Location #${originalLocationId}`}
                      {currentLocation?.city
                        ? ` — ${currentLocation.city}`
                        : ""}
                      {currentLocation?.status === "inactive"
                        ? " (Inactive)"
                        : " (Current location)"}
                    </option>
                  )}

                  {/* Active pickup locations */}

                  {activeLocations.map((location) => (
                    <option
                      key={location.id}
                      value={String(location.id)}
                    >
                      {location.name} — {location.city}
                    </option>
                  ))}
                </select>

                {/* Selected location address */}

                {(selectedLocation ||
                  (
                    !locationChanged &&
                    currentLocation
                  )) && (
                  <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-semibold text-blue-700">
                      Pickup Address
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {selectedLocation?.address ??
                        currentLocation?.address}
                    </p>
                  </div>
                )}

                {/* Location loading error */}

                {locationsError && (
                  <div
                    role="alert"
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3"
                  >
                    <p className="text-xs text-red-700">
                      {locationsError}
                    </p>

                    <button
                      type="button"
                      onClick={onReloadLocations}
                      disabled={locationsLoading || saving}
                      className="mt-2 text-xs font-semibold text-red-700 hover:underline"
                    >
                      Retry Loading Locations
                    </button>
                  </div>
                )}

                {/* No active locations */}

                {!locationsLoading &&
                  !locationsError &&
                  activeLocations.length === 0 && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">
                        No active pickup locations available.
                        Create or activate a location before
                        assigning a vehicle.
                      </p>

                      <Link
                        href="/locations"
                        className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Manage Pickup Locations →
                      </Link>
                    </div>
                  )}

                {/* Existing unassigned vehicle */}

                {isEditing &&
                  originalLocationId === "" &&
                  form.locationId === "" && (
                    <p className="mt-2 text-xs text-amber-600">
                      This vehicle has no assigned pickup
                      location.
                    </p>
                  )}

                <p className="mt-2 text-xs text-slate-500">
                  {isEditingRented
                    ? "Pickup location is locked during an active rental."
                    : "Select the location where customers will collect this vehicle."}
                </p>
              </div>

              {/* Daily Rental Price */}

              <label className="md:col-span-2">
                <span className={labelClass}>
                  Rental Price Per Day (₹) *
                </span>

                <input
                  type="number"
                  min="0.01"
                  max="99999999.99"
                  step="0.01"
                  required
                  placeholder="e.g. 1500"
                  value={form.pricePerDay}
                  onChange={(event) =>
                    updateField(
                      "pricePerDay",
                      event.target.value
                    )
                  }
                  className={inputClass}
                />
              </label>
            </div>

            {/* ======================================
                IMAGE PREVIEW
            ====================================== */}

            <div>
              <label>
                <span className={labelClass}>
                  Vehicle Image
                </span>

                <VehicleImage
                  image={form.image}
                  name={form.name}
                  type={form.type}
                  large
                />

                <input
                  type="text"
                  maxLength={500}
                  placeholder="Image URL or upload path"
                  value={form.image}
                  onChange={(event) =>
                    updateField(
                      "image",
                      event.target.value
                    )
                  }
                  className={`mt-3 ${inputClass}`}
                />
              </label>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Enter an image URL or an existing
                server image path. Image is optional.
              </p>

              {form.image && (
                <button
                  type="button"
                  onClick={() =>
                    updateField("image", "")
                  }
                  className="mt-3 text-xs font-semibold text-red-600 hover:underline"
                >
                  Remove Image
                </button>
              )}
            </div>
          </div>

          {/* ======================================
              DESCRIPTION
          ====================================== */}

          <label className="mt-5 block">
            <span className={labelClass}>
              Description
            </span>

            <textarea
              rows={4}
              placeholder="Enter vehicle features and additional information..."
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              className={inputClass}
            />
          </label>
        </fieldset>

        {/* Default vehicle status */}

        {!isEditing && (
          <div className="mt-5 rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
            New vehicles will automatically be
            created with Available status.
          </div>
        )}
      </div>

      {/* ======================================
          FORM FOOTER
      ====================================== */}

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 p-5">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={busy || locationUnavailable}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : isEditing
              ? "Update Vehicle"
              : "Save Vehicle"}
        </button>
      </div>
    </form>
  );
}