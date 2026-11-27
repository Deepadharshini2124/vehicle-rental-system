
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavbar from "./AdminNavbar";
import { getAdminToken } from "@/lib/api";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      router.replace("/login");
      return;
    }

    setAuthenticated(true);
  }, [router]);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Checking authentication...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AdminNavbar />

      <div className="min-h-screen pt-16 lg:pl-64">
        {children}
      </div>
    </div>
  );
}
