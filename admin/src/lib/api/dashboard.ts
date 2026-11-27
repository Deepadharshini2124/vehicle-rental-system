import { apiRequest } from "./client";
import type { DashboardResponse } from "./types";

// Get dashboard statistics
export async function getDashboard(): Promise<DashboardResponse> {
  const response = await apiRequest<DashboardResponse>(
    "/api/admin/dashboard"
  );

  if (response.success !== true || !response.dashboard) {
    throw new Error(
      response.message || "Failed to fetch dashboard statistics"
    );
  }

  const dashboard = response.dashboard;

  // Validate dashboard structure
  if (
    typeof dashboard.date !== "string" ||
    !dashboard.vehicles ||
    !dashboard.customers ||
    !dashboard.bookings ||
    !dashboard.operations ||
    !dashboard.rentalValue ||
    !Array.isArray(dashboard.recentBookings) ||
    !Array.isArray(dashboard.todayPickups) ||
    !Array.isArray(dashboard.todayReturns) ||
    !Array.isArray(dashboard.activeRentals) ||
    !Array.isArray(dashboard.overdueRentals) ||
    !Array.isArray(dashboard.missedPickups)
  ) {
    throw new Error(
      "Invalid dashboard response. Please check whether the updated dashboard controller is running."
    );
  }

  return response;
}