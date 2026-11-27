export default function VehicleStatusInfo() {
  return (
    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-800">
        Vehicle Status Information
      </p>

      <p className="mt-2 text-xs leading-relaxed text-blue-700">
        Vehicles are automatically marked as
        Rented when a rental starts and
        Available when the rental is completed.
        Available status does not guarantee
        availability for every date. Existing
        reservations are checked by the
        booking system.
      </p>
    </div>
  );
}