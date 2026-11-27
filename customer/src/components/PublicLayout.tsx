import type { ReactNode } from "react";

import CustomerNavbar from "@/components/CustomerNavbar";
import CustomerFooter from "@/components/CustomerFooter";

export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <CustomerNavbar />

      <main className="flex-1">
        {children}
      </main>

      <CustomerFooter />
    </div>
  );
}