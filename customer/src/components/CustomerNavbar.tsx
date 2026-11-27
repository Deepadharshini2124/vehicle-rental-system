
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  CarFront,
  House,
  CalendarDays,
  UserRound,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
} from "lucide-react";

import {
  getCustomerToken,
  getCustomerUser,
  clearCustomerSession,
  customerLogout,
  getPublicSettings,
  type CustomerUser,
} from "@/lib/api";

const DEFAULT_BUSINESS_NAME = "Vehicle Rental";

const publicNavigation = [
  {
    name: "Home",
    href: "/home",
    icon: House,
  },
  {
    name: "Explore Vehicles",
    href: "/vehicles",
    icon: CarFront,
  },
];

const privateNavigation = [
  {
    name: "My Bookings",
    href: "/my-bookings",
    icon: CalendarDays,
  },
  {
    name: "My Profile",
    href: "/profile",
    icon: UserRound,
  },
];

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-5 py-2.5 text-sm font-semibold text-[#102A36] transition-colors hover:bg-[#67E8F9]";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10";

export default function CustomerNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const [user, setUser] =
    useState<CustomerUser | null>(null);

  const [businessName, setBusinessName] =
    useState(DEFAULT_BUSINESS_NAME);

  // ==========================================
  // CUSTOMER SESSION
  // ==========================================

  useEffect(() => {
    function syncCustomerSession() {
      const token = getCustomerToken();
      const customer = getCustomerUser();

      if (
        token &&
        customer &&
        customer.role === "customer"
      ) {
        setUser(customer);
      } else {
        setUser(null);

        if (token || customer) {
          clearCustomerSession();
        }
      }

      setSessionReady(true);
    }

    syncCustomerSession();

    window.addEventListener(
      "customer-session-updated",
      syncCustomerSession
    );

    return () => {
      window.removeEventListener(
        "customer-session-updated",
        syncCustomerSession
      );
    };
  }, []);

  // ==========================================
  // BUSINESS SETTINGS
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadSettings() {
      try {
        const { settings } = await getPublicSettings(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setBusinessName(
            settings.businessName.trim() ||
            DEFAULT_BUSINESS_NAME
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setBusinessName(DEFAULT_BUSINESS_NAME);
        }
      }
    }

    void loadSettings();

    return () => controller.abort();
  }, [pathname]);

  // Close mobile menu on navigation.

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const authenticated = sessionReady && user !== null;

  const navigation = authenticated
    ? [...publicNavigation, ...privateNavigation]
    : publicNavigation;

  function isActive(href: string) {
    if (href === "/home") {
      return pathname === "/" || pathname === "/home";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function closeMenu() {
    setMobileOpen(false);
  }

  function handleLogout() {
    closeMenu();
    customerLogout();
    setUser(null);
    router.replace("/home");
  }

  // ==========================================
  // NAVIGATION LINKS
  // ==========================================

  function renderNavigation(mobile = false) {
    return navigation.map(
      ({ name, href, icon: Icon }) => {
        const active = isActive(href);

        return (
          <Link
            key={href}
            href={href}
            onClick={closeMenu}
            aria-current={active ? "page" : undefined}
            className={`flex items-center whitespace-nowrap
              rounded-xl px-3 text-sm font-medium
              transition-colors ${mobile ? "gap-3 py-3" : "gap-2 py-2.5"
              } ${active
                ? "bg-[#155E75] text-[#A5F3FC]"
                : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
          >
            <Icon size={18} />
            {name}
          </Link>
        );
      }
    );
  }

  // ==========================================
  // NAVBAR UI
  // ==========================================

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#102A36] text-white shadow-sm">

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">

        {/* Business Logo */}

        <Link
          href="/home"
          onClick={closeMenu}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#155E75] text-[#A5F3FC]">
            <CarFront size={27} />
          </div>

          <div className="min-w-0">
            <p
              title={businessName}
              className="max-w-52 truncate text-base font-bold tracking-tight text-white sm:text-lg"
            >
              {businessName}
            </p>

            <p className="mt-0.5 text-xs font-medium text-[#67E8F9]">
              Cars & Bikes
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}

        <nav
          aria-label="Main navigation"
          className="hidden shrink-0 items-center gap-1 xl:flex"
        >
          {renderNavigation()}
        </nav>

        {/* Desktop Account */}

        <div className="hidden shrink-0 items-center gap-3 xl:flex">

          {!sessionReady ? (
            <div
              aria-label="Loading account"
              className="h-10 w-32 animate-pulse rounded-xl bg-white/10"
            />
          ) : authenticated ? (
            <>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-xl p-2 transition hover:bg-white/10"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#155E75] text-[#A5F3FC]">
                  <UserRound size={20} />
                </div>

                <div className="min-w-0">
                  <p
                    title={user?.name}
                    className="max-w-28 truncate text-sm font-semibold text-white"
                  >
                    {user?.name || "Customer"}
                  </p>

                  <p className="text-xs text-slate-300">
                    My Account
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className={secondaryButton}
              >
                <LogOut size={17} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={secondaryButton}
              >
                <LogIn size={17} />
                Login
              </Link>

              <Link
                href="/register"
                className={primaryButton}
              >
                <UserPlus size={17} />
                Sign Up
              </Link>
            </>
          )}

        </div>

        {/* Mobile Menu Toggle */}

        <button
          type="button"
          aria-label={
            mobileOpen
              ? "Close navigation"
              : "Open navigation"
          }
          aria-expanded={mobileOpen}
          aria-controls="customer-mobile-navigation"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="shrink-0 rounded-xl p-2.5 text-white transition hover:bg-white/10 xl:hidden"
        >
          {mobileOpen ? <X size={25} /> : <Menu size={25} />}
        </button>

      </div>

      {/* Mobile Navigation */}

      {mobileOpen && (
        <div
          id="customer-mobile-navigation"
          className="space-y-3 border-t border-white/10 bg-[#102A36] p-4 xl:hidden"
        >

          {authenticated && (
            <Link
              href="/profile"
              onClick={closeMenu}
              className="mb-3 flex items-center gap-3 rounded-xl bg-white/10 p-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#155E75] text-[#A5F3FC]">
                <UserRound size={23} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name || "Customer"}
                </p>

                <p className="mt-1 truncate text-xs text-slate-300">
                  {user?.email || "My Account"}
                </p>
              </div>
            </Link>
          )}

          <nav
            aria-label="Mobile navigation"
            className="space-y-1"
          >
            {renderNavigation(true)}
          </nav>

          {sessionReady && (
            <div className="border-t border-white/10 pt-3">

              {authenticated ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className={secondaryButton}
                  >
                    <LogIn size={17} />
                    Login
                  </Link>

                  <Link
                    href="/register"
                    onClick={closeMenu}
                    className={primaryButton}
                  >
                    <UserPlus size={17} />
                    Sign Up
                  </Link>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </header>
  );
}
