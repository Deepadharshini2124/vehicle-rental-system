
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CarFront,
  Menu,
  X,
  UserRound,
  CalendarDays,
} from "lucide-react";

const links = [
  { label: "Home", href: "/" },
  { label: "Explore Vehicles", href: "/vehicles" },
  { label: "My Bookings", href: "/my-bookings" },
];

export default function CustomerNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <CarFront size={24} />
          </span>

          <div>
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              Vehicle Rental
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Cars & Bikes
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold transition ${
                pathname === link.href
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-blue-600"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <UserRound size={17} />
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-xl border border-slate-200 p-2.5 md:hidden"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <nav className="space-y-2 border-t border-slate-100 bg-white p-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {link.href === "/my-bookings" && (
                <CalendarDays size={17} />
              )}
              {link.label}
            </Link>
          ))}

          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Login
          </Link>

          <Link
            href="/register"
            onClick={() => setMenuOpen(false)}
            className="block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            Create Account
          </Link>
        </nav>
      )}
    </header>
  );
}
