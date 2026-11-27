import { apiRequest } from "./client";
import { isValidId } from "./utils";

import type {
  CustomersResponse,
  CustomerDetailsResponse,
} from "./types";

// Get all customers
export async function getCustomers(): Promise<CustomersResponse> {
  return apiRequest<CustomersResponse>(
    "/api/customers"
  );
}

// Get customer details
export async function getCustomerDetails(
  id: number
): Promise<CustomerDetailsResponse> {
  if (!isValidId(id)) {
    throw new Error("Invalid customer ID");
  }

  return apiRequest<CustomerDetailsResponse>(
    `/api/customers/${id}`
  );
}

// Activate or block customer
export async function updateCustomerStatus(
  id: number,
  status: "active" | "blocked"
): Promise<{
  success: boolean;
  message: string;
}> {
  if (!isValidId(id)) {
    throw new Error("Invalid customer ID");
  }

  if (status !== "active" && status !== "blocked") {
    throw new Error("Invalid customer status");
  }

  return apiRequest<{
    success: boolean;
    message: string;
  }>(
    `/api/customers/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}