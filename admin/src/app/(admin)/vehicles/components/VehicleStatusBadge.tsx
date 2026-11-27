import {
  getVehicleStatusLabel,
  type VehicleStatus,
} from "@/lib/api";

import { statusColors } from "../constants";

type VehicleStatusBadgeProps = {
  status: VehicleStatus;
};

export default function VehicleStatusBadge({
  status,
}: VehicleStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
        statusColors[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {getVehicleStatusLabel(status)}
    </span>
  );
}