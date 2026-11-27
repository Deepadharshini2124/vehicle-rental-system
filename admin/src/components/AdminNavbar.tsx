"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CarFront,
  MapPin,
  CalendarDays,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  CircleUserRound,
} from "lucide-react";

import {
  clearAdminSession,
  getAdminUser,
} from "@/lib/api";

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Vehicles",
    href: "/vehicles",
    icon: CarFront,
  },
  {
    label: "Locations",
    href: "/locations",
    icon: MapPin,
  },
  {
    label: "Bookings",
    href: "/bookings",
    icon: CalendarDays,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const admin =
    typeof window !== "undefined" ? getAdminUser() : null;

  function logout() {
    clearAdminSession();
    router.replace("/login");
  }

  return (
    <>
      {/* TOP NAVBAR */}
      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <CarFront size={24} />
          </div>

          <div>
            <h1 className="text-base font-bold text-slate-900">
              Vehicle Rental Admin
            </h1>

            <p className="text-xs text-slate-500">
              Rental Management System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Bell size={20} className="text-slate-500" />

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">
              {admin?.name || "Administrator"}
            </p>

            <p className="text-xs text-slate-500">
              Admin
            </p>
          </div>

          <CircleUserRound
            size={32}
            className="text-slate-700"
          />
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed bottom-0 left-0 top-16 z-50 w-64 bg-slate-900 text-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col justify-between p-4">
          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;

              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-amber-500 text-slate-950"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-300 hover:bg-slate-800"
          >
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}