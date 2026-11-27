
"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { LoaderCircle } from "lucide-react";

import CustomerNavbar from "@/components/CustomerNavbar";
import CustomerFooter from "@/components/CustomerFooter";

import {
  getCustomerToken,
  getCustomerUser,
  clearCustomerSession,
} from "@/lib/api";

import { getLoginUrl } from "@/lib/authRedirect";

export default function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [authenticated, setAuthenticated] =
    useState(false);

  useEffect(() => {
    let redirecting = false;

    function checkSession() {
      const token = getCustomerToken();
      const user = getCustomerUser();

      if (
        !token ||
        !user ||
        user.role !== "customer"
      ) {
        setAuthenticated(false);

        if (redirecting) return;

        redirecting = true;

        const destination =
          window.location.pathname +
          window.location.search;

        if (token || user) {
          clearCustomerSession();
        }

        router.replace(
          getLoginUrl(destination)
        );

        return;
      }

      redirecting = false;
      setAuthenticated(true);
    }

    checkSession();

    window.addEventListener(
      "customer-session-updated",
      checkSession
    );

    return () => {
      window.removeEventListener(
        "customer-session-updated",
        checkSession
      );
    };
  }, [router, pathname]);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAFC]">

        <LoaderCircle
          size={32}
          className="animate-spin text-[#155E75]"
        />

        <p className="text-sm font-medium text-slate-500">
          Checking your session...
        </p>

      </div>
    );
  }

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
