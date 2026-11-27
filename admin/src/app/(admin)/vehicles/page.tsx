"use client";

import { useVehicles } from "./hooks/useVehicles";

import VehicleHeader from "./components/VehicleHeader";
import VehicleAlerts from "./components/VehicleAlerts";
import VehicleStats from "./components/VehicleStats";
import VehicleForm from "./components/VehicleForm";
import VehicleFilters from "./components/VehicleFilters";
import VehicleTable from "./components/VehicleTable";
import VehicleEmptyState from "./components/VehicleEmptyState";
import VehicleStatusInfo from "./components/VehicleStatusInfo";

export default function VehiclesPage() {
  const vm = useVehicles();

  return (
    <main className="min-h-full bg-slate-100 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADER */}

        <VehicleHeader
          busy={vm.busy}
          showForm={vm.showForm}
          refreshing={vm.refreshing}
          locationsLoading={vm.locationsLoading}
          onRefresh={() => void vm.refreshData()}
          onAddVehicle={vm.openAddForm}
        />

        {/* ERROR AND SUCCESS ALERTS */}

        <VehicleAlerts
          error={vm.error}
          message={vm.message}
          onDismissError={() => vm.setError("")}
          onDismissMessage={() => vm.setMessage("")}
        />

        {/* VEHICLE STATISTICS */}

        <VehicleStats
          stats={vm.stats}
          loading={vm.loading}
        />

        {/* ADD / EDIT VEHICLE FORM */}

        {vm.showForm && (
          <VehicleForm
            form={vm.form}
            editingId={vm.editingId}
            editingVehicle={vm.editingVehicle ?? null}
            isEditingRented={vm.isEditingRented}
            saving={vm.saving}
            busy={vm.busy}
            formError={vm.formError}
            activeLocations={vm.activeLocations}
            locationsLoading={vm.locationsLoading}
            locationsError={vm.locationsError}
            updateField={vm.updateField}
            changeVehicleType={vm.changeVehicleType}
            onSubmit={vm.saveVehicle}
            onClose={vm.closeForm}
            onReloadLocations={() =>
              void vm.loadLocations()
            }
          />
        )}

        {/* VEHICLE LIST */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* SEARCH AND FILTERS */}

          <VehicleFilters
            loading={vm.loading}
            totalCount={vm.vehicles.length}
            filteredCount={vm.filteredVehicles.length}
            search={vm.search}
            typeFilter={vm.typeFilter}
            statusFilter={vm.statusFilter}
            locationFilter={vm.locationFilter}
            locations={vm.locations}
            locationsLoading={vm.locationsLoading}
            locationsError={vm.locationsError}
            hasFilters={vm.hasFilters}
            setSearch={vm.setSearch}
            setTypeFilter={vm.setTypeFilter}
            setStatusFilter={vm.setStatusFilter}
            setLocationFilter={vm.setLocationFilter}
            clearFilters={vm.clearFilters}
            onReloadLocations={() =>
              void vm.loadLocations()
            }
          />

          {/* LOADING AND EMPTY STATES */}

          {vm.loading ||
          vm.filteredVehicles.length === 0 ? (
            <VehicleEmptyState
              loading={vm.loading}
              totalCount={vm.vehicles.length}
              filteredCount={vm.filteredVehicles.length}
              error={vm.error}
              hasFilters={vm.hasFilters}
              busy={vm.busy}
              showForm={vm.showForm}
              onRetry={() =>
                void vm.loadVehicles(true)
              }
              onClearFilters={vm.clearFilters}
              onAddVehicle={vm.openAddForm}
            />
          ) : (
            <VehicleTable
              filteredVehicles={vm.filteredVehicles}
              totalCount={vm.vehicles.length}
              busy={vm.busy}
              showForm={vm.showForm}
              updatingId={vm.updatingId}
              onEdit={vm.openEditForm}
              onUpdateStatus={vm.handleUpdateStatus}
            />
          )}
        </section>

        {/* VEHICLE STATUS INFORMATION */}

        <VehicleStatusInfo />

        {/* PAGE FOOTER */}

        <footer className="py-8 text-center text-xs text-slate-400">
          Car & Bike Rental Management System
        </footer>
      </div>
    </main>
  );
}