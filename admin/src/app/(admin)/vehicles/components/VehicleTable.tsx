"use client";

import Link from "next/link";

import {
  formatCurrency,
  getVehicleStatusLabel,
  type Vehicle,
  type VehicleStatus,
} from "@/lib/api";

import { manualStatuses } from "../constants";

import VehicleImage from "./VehicleImage";
import VehicleStatusBadge from "./VehicleStatusBadge";

type VehicleTableProps = {
  filteredVehicles: Vehicle[];
  totalCount: number;
  busy: boolean;
  showForm: boolean;
  updatingId: number | null;

  onEdit: (vehicle: Vehicle) => void;

  onUpdateStatus: (
    vehicle: Vehicle,
    status: VehicleStatus
  ) => void | Promise<void>;
};

export default function VehicleTable({
  filteredVehicles,
  totalCount,
  busy,
  showForm,
  updatingId,
  onEdit,
  onUpdateStatus,
}: VehicleTableProps) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1250px] text-left text-sm">

          {/* ======================================
              TABLE HEADER
          ====================================== */}

          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              <th className="px-5 py-4">
                Vehicle
              </th>

              <th className="px-5 py-4">
                Type
              </th>

              <th className="px-5 py-4">
                Registration
              </th>

              <th className="px-5 py-4">
                Pickup Location
              </th>

              <th className="px-5 py-4">
                Daily Price
              </th>

              <th className="px-5 py-4">
                Status
              </th>

              <th className="px-5 py-4">
                Change Status
              </th>

              <th className="px-5 py-4">
                Actions
              </th>
            </tr>
          </thead>

          {/* ======================================
              TABLE BODY
          ====================================== */}

          <tbody className="divide-y divide-slate-100">
            {filteredVehicles.map((vehicle) => {
              const isRented =
                vehicle.status === "rented";

              const isUpdating =
                updatingId === vehicle.id;

              return (
                <tr
                  key={vehicle.id}
                  className="transition hover:bg-slate-50"
                >

                  {/* VEHICLE DETAILS */}

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <VehicleImage
                        image={vehicle.image}
                        name={vehicle.name}
                        type={vehicle.type}
                      />

                      <div>
                        <p className="font-semibold text-slate-900">
                          {vehicle.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {vehicle.brand}{" "}
                          {vehicle.model}
                        </p>

                        <p className="mt-1 text-xs capitalize text-slate-400">
                          {[
                            vehicle.fuelType,
                            vehicle.transmission,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* VEHICLE TYPE */}

                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium capitalize text-slate-700">
                      {vehicle.type}
                    </span>
                  </td>

                  {/* REGISTRATION */}

                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="font-medium">
                      {vehicle.registrationNumber}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {vehicle.seatingCapacity ?? "—"}{" "}
                      Seats
                    </p>
                  </td>

                  {/* ======================================
                      PICKUP LOCATION
                  ====================================== */}

                  <td className="min-w-[190px] px-5 py-4">
                    {vehicle.location ? (
                      <div>
                        <p className="font-medium text-slate-900">
                          {vehicle.location.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {vehicle.location.city}
                        </p>

                        {vehicle.location.status ===
                          "inactive" && (
                          <span className="mt-2 inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600">
                            Inactive Location
                          </span>
                        )}
                      </div>
                    ) : vehicle.locationId !== null ? (
                      <div>
                        <p className="text-xs font-medium text-amber-700">
                          Location #{vehicle.locationId}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Details unavailable
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
                          Unassigned
                        </span>

                        <p className="mt-1 text-xs text-slate-400">
                          No pickup location
                        </p>
                      </div>
                    )}
                  </td>

                  {/* DAILY RENTAL PRICE */}

                  <td className="whitespace-nowrap px-5 py-4">
                    <p className="font-bold text-slate-900">
                      {formatCurrency(
                        vehicle.pricePerDay
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      per day
                    </p>
                  </td>

                  {/* STATUS BADGE */}

                  <td className="px-5 py-4">
                    <VehicleStatusBadge
                      status={vehicle.status}
                    />
                  </td>

                  {/* ======================================
                      STATUS CONTROL
                  ====================================== */}

                  <td className="min-w-[155px] px-5 py-4">
                    {isRented ? (
                      <div>
                        <select
                          value="rented"
                          disabled
                          aria-label={`${vehicle.name} rental status`}
                          className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500"
                        >
                          <option value="rented">
                            Rented
                          </option>
                        </select>

                        <Link
                          href="/bookings"
                          className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline"
                        >
                          Manage Rental →
                        </Link>
                      </div>
                    ) : (
                      <div>
                        <select
                          value={vehicle.status}
                          disabled={busy || showForm}
                          aria-label={`Change ${vehicle.name} status`}
                          onChange={(event) =>
                            void onUpdateStatus(
                              vehicle,
                              event.target
                                .value as VehicleStatus
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {manualStatuses.map(
                            (status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {getVehicleStatusLabel(
                                  status
                                )}
                              </option>
                            )
                          )}
                        </select>

                        {isUpdating && (
                          <p className="mt-2 text-xs text-blue-600">
                            Updating...
                          </p>
                        )}
                      </div>
                    )}
                  </td>

                  {/* EDIT ACTION */}

                  <td className="px-5 py-4">
                    <button
                      type="button"
                      disabled={busy || showForm}
                      onClick={() => onEdit(vehicle)}
                      aria-label={`Edit ${vehicle.name}`}
                      className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ======================================
          TABLE FOOTER
      ====================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-xs text-slate-500">
        <p>
          Showing {filteredVehicles.length} of{" "}
          {totalCount} vehicles
        </p>

        <p>
          Rental status is managed through bookings.
        </p>
      </div>
    </>
  );
}