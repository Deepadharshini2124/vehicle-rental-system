"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import {
  ArrowRight,
  ArrowUpRight,
  CarFront,
  Bike,
  CalendarCheck,
  ShieldCheck,
  KeyRound,
  Search,
  Headphones,
  Clock3,
  CheckCircle2,
  Fuel,
  UsersRound,
  Settings2,
  ChevronDown,
} from "lucide-react";

import {
  getVehicles,
  getVehicleImage,
  getPublicSettings,
  formatCurrency,
  type Vehicle,
  type PublicSettings,
} from "@/lib/api";

import RentalSearch from "./components/RentalSearch";

// ==========================================
// VEHICLE CATEGORIES
// ==========================================

const categories = [
  {
    title: "Rent a Car",
    description:
      "Comfortable rides for family trips, business and weekend getaways.",
    image: "/images/categories/car.png",
    href: "/vehicles?type=car",
    icon: CarFront,
  },
  {
    title: "Rent a Bike",
    description:
      "Explore the city and beyond with freedom on two wheels.",
    image: "/images/categories/bike.png",
    href: "/vehicles?type=bike",
    icon: Bike,
  },
];

// ==========================================
// HOW IT WORKS
// ==========================================

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Find Your Ride",
    description:
      "Explore our collection of cars and bikes and choose your preferred vehicle.",
  },
  {
    number: "02",
    icon: CalendarCheck,
    title: "Request a Booking",
    description:
      "Select your rental dates, check availability and submit your booking request.",
  },
  {
    number: "03",
    icon: KeyRound,
    title: "Pickup & Ride",
    description:
      "Once your booking is confirmed, collect your vehicle and enjoy your journey.",
  },
];

// ==========================================
// BENEFITS
// ==========================================

const benefits = [
  {
    icon: CarFront,
    title: "Cars & Bikes",
    description: "Choose a ride that suits your journey.",
  },
  {
    icon: Clock3,
    title: "Flexible Rentals",
    description: "Select your preferred rental duration.",
  },
  {
    icon: ShieldCheck,
    title: "Simple Booking",
    description: "Clear rental details and admin confirmation.",
  },
  {
    icon: Headphones,
    title: "Customer Support",
    description: "Contact our team for rental assistance.",
  },
];

// ==========================================
// FAQ
// ==========================================

const faqs = [
  {
    question: "Do I need an account to explore vehicles?",
    answer:
      "No. You can explore cars and bikes, view vehicle details and check availability without logging in. You need an account to submit a booking request.",
  },
  {
    question: "How do I book a vehicle?",
    answer:
      "Choose your vehicle, select pickup and return dates, check availability, log in and submit your booking request.",
  },
  {
    question: "Is online payment required?",
    answer:
      "No. Online payment is not required to submit a booking request. Contact the rental provider for payment arrangements.",
  },
  {
    question: "Is my booking confirmed immediately?",
    answer:
      "No. Your booking request will be reviewed by the admin. You can track its status from the My Bookings page.",
  },
  {
    question: "Can I cancel my booking?",
    answer:
      "Pending bookings can be cancelled when cancellation is enabled by the rental provider. Contact the provider for assistance with confirmed bookings.",
  },
];

// ==========================================
// SECTION HEADING
// ==========================================

function SectionHeading({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10 text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
        {label}
      </p>

      <h2 className="text-3xl font-bold tracking-tight text-primary-dark md:text-4xl">
        {title}
      </h2>

      {description && (
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

// ==========================================
// VEHICLE CARD
// ==========================================

function FleetCard({ vehicle }: { vehicle: Vehicle }) {
  const [imageError, setImageError] = useState(false);

  const imageUrl = getVehicleImage(vehicle.image);

  const VehicleIcon =
    vehicle.type === "car" ? CarFront : Bike;

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Vehicle Image */}

      <div className="relative flex h-52 items-center justify-center overflow-hidden bg-slate-100">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={vehicle.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-105"
          />
        ) : (
          <VehicleIcon
            size={80}
            strokeWidth={1}
            className="text-slate-300"
          />
        )}

        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-semibold capitalize text-primary shadow-sm">
          {vehicle.type}
        </span>
      </div>

      {/* Vehicle Details */}

      <div className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {vehicle.brand}
        </p>

        <h3 className="mt-1 text-xl font-bold text-primary-dark">
          {vehicle.name}
        </h3>

        {/* Vehicle Specifications */}

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
          {vehicle.fuelType && (
            <span className="flex items-center gap-1.5 capitalize">
              <Fuel size={15} />
              {vehicle.fuelType}
            </span>
          )}

          {vehicle.transmission && (
            <span className="flex items-center gap-1.5 capitalize">
              <Settings2 size={15} />
              {vehicle.transmission}
            </span>
          )}

          {!!vehicle.seatingCapacity && (
            <span className="flex items-center gap-1.5">
              <UsersRound size={15} />
              {vehicle.seatingCapacity} Seats
            </span>
          )}
        </div>

        {/* Vehicle Price */}

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-5">
          <div>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(vehicle.pricePerDay)}
            </span>

            <span className="ml-1 text-xs text-slate-400">
              / day
            </span>
          </div>

          <Link
            href={`/vehicles/${vehicle.id}`}
            aria-label={`View ${vehicle.name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary-hover"
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}

// ==========================================
// HOME PAGE
// ==========================================

export default function HomePage() {
  const [settings, setSettings] =
    useState<PublicSettings | null>(null);

  const [vehicles, setVehicles] =
    useState<Vehicle[]>([]);

  const [loading, setLoading] = useState(true);

  const [fleetError, setFleetError] = useState("");

  const [activeFaq, setActiveFaq] =
    useState<number | null>(0);

  // ==========================================
  // LOAD HOME DATA
  // ==========================================

  useEffect(() => {
    let cancelled = false;

    const controller = new AbortController();

    async function loadHomeData() {
      setLoading(true);
      setFleetError("");

      const [settingsResult, vehiclesResult] =
        await Promise.allSettled([
          getPublicSettings(controller.signal),
          getVehicles({}, controller.signal),
        ]);

      if (cancelled) return;

      if (settingsResult.status === "fulfilled") {
        setSettings(settingsResult.value.settings);
      }

      if (vehiclesResult.status === "fulfilled") {
        setVehicles(
          vehiclesResult.value.vehicles
            .filter(
              (vehicle) =>
                vehicle.status === "available" ||
                vehicle.status === "rented"
            )
            .slice(0, 6)
        );
      } else {
        setFleetError(
          "Unable to load vehicles at the moment."
        );
      }

      setLoading(false);
    }

    void loadHomeData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const businessName =
    settings?.businessName || "Vehicle Rental";

  return (
    <div className="overflow-hidden bg-background">
      {/* ======================================
          HERO SECTION
      ====================================== */}

      <section className="relative isolate overflow-hidden bg-primary-dark text-white">
        {/* Desktop Banner */}

        <div className="absolute inset-0 -z-20 hidden md:block">
          <Image
            src="/images/banners/hero-banner.png"
            alt="Car and motorcycle on a scenic mountain road"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-[center_75%]"
          />
        </div>

        {/* Desktop Gradient */}

        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 hidden md:block"
          style={{
            background:
              "linear-gradient(90deg, rgba(16,42,54,0.96) 0%, rgba(16,42,54,0.88) 22%, rgba(16,42,54,0.48) 43%, rgba(16,42,54,0.08) 65%, rgba(16,42,54,0) 85%)",
          }}
        />

        {/* Mobile Banner */}

        <div className="relative aspect-[7/4] w-full md:hidden">
          <Image
            src="/images/banners/hero-banner.png"
            alt="Car and motorcycle on a scenic mountain road"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-contain"
          />
        </div>

        {/* Hero Content */}

        <div className="relative mx-auto flex max-w-7xl items-center px-5 py-8 sm:px-8 md:min-h-[580px] md:py-10 lg:min-h-[620px] lg:px-10">
          <div className="w-full max-w-xl">
            {/* Hero Label */}

            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold tracking-wider text-cyan-200 backdrop-blur-sm sm:text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />

              SELF-DRIVE CAR & BIKE RENTALS
            </div>

            {/* Main Heading */}

            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Your Journey.

              <span className="mt-2 block text-accent">
                Your Rules.
              </span>
            </h1>

            {/* Description */}

            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-100 sm:text-base">
              Discover the freedom of self-drive rentals.
              Find the perfect car or bike for your next
              adventure with {businessName}.
            </p>

            {/* ======================================
                RENTAL SEARCH COMPONENT

                - Car / Bike Selection
                - Pickup Location
                - Pickup Date
                - Return Date
                - Rental Duration
                - Search Vehicles
            ====================================== */}

            <RentalSearch />

            {/* Hero Highlights */}

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-100 sm:text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-accent"
                />

                Flexible rentals
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-accent"
                />

                Easy booking
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================
          BENEFITS STRIP
      ====================================== */}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 lg:grid-cols-4 lg:px-10">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-start gap-3 sm:flex-row"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <Icon size={23} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-primary-dark">
                  {title}
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================
          VEHICLE CATEGORIES
      ====================================== */}

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
        <SectionHeading
          label="Explore Categories"
          title="Choose Your Ride"
          description="From comfortable city drives to exciting weekend adventures, find the right vehicle for every journey."
        />

        <div className="grid gap-6 md:grid-cols-2">
          {categories.map((category) => (
            <article
              key={category.title}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-xl"
            >
              <div className="relative h-60 overflow-hidden bg-white sm:h-72">
                <Image
                  src={category.image}
                  alt={category.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain p-6 transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="border-t border-slate-100 p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <category.icon
                    size={27}
                    className="text-primary"
                  />

                  <h3 className="text-2xl font-bold text-primary-dark">
                    {category.title}
                  </h3>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  {category.description}
                </p>

                <Link
                  href={category.href}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  Explore Now

                  <ArrowRight size={17} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ======================================
          VEHICLE FLEET
      ====================================== */}

      <section className="bg-primary-light/60 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Our Fleet
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-primary-dark md:text-4xl">
                Find Your Perfect Ride
              </h2>

              <p className="mt-3 text-sm text-slate-500">
                Explore vehicles from our rental collection.
              </p>
            </div>

            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 rounded-xl border border-primary px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              View All Vehicles

              <ArrowRight size={17} />
            </Link>
          </div>

          {/* Loading State */}

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-80 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
          ) : fleetError ? (
            /* Error State */

            <div
              role="alert"
              className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500"
            >
              {fleetError}
            </div>
          ) : vehicles.length === 0 ? (
            /* Empty State */

            <div className="rounded-2xl bg-white p-10 text-center">
              <CarFront
                size={48}
                className="mx-auto mb-4 text-slate-300"
              />

              <p className="text-sm text-slate-500">
                No vehicles are currently listed for rental.
              </p>
            </div>
          ) : (
            /* Vehicle Cards */

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => (
                <FleetCard
                  key={vehicle.id}
                  vehicle={vehicle}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ======================================
          HOW IT WORKS
      ====================================== */}

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
        <SectionHeading
          label="Simple Process"
          title="Three Steps. One Great Ride."
          description="Renting a vehicle is simple and convenient."
        />

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, number, title, description }) => (
            <div
              key={number}
              className="relative rounded-2xl border border-slate-200 bg-white p-8"
            >
              <span className="absolute right-6 top-5 text-5xl font-bold text-slate-100">
                {number}
              </span>

              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <Icon size={30} />
              </div>

              <h3 className="mt-6 text-xl font-bold text-primary-dark">
                {title}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================
          ROAD TRIP PROMOTION
      ====================================== */}

      <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-10 lg:pb-24">
        <div className="relative flex min-h-[420px] items-center overflow-hidden rounded-3xl bg-primary-dark">
          <Image
            src="/images/about/road-trip.png"
            alt="Car and motorcycle travelling through mountains"
            fill
            sizes="(max-width: 1280px) 100vw, 1200px"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#102A36]/95 via-[#102A36]/75 to-transparent" />

          <div className="relative max-w-xl p-8 text-white md:p-14">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Go Beyond the Ordinary
            </p>

            <h2 className="text-3xl font-bold leading-tight md:text-5xl">
              Great journeys begin with the right ride.
            </h2>

            <p className="mt-5 text-sm leading-relaxed text-slate-200 md:text-base">
              Weekend trips, city rides or long journeys.
              Explore our rental collection and make
              every kilometre count.
            </p>

            <Link
              href="/vehicles"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-primary-dark transition hover:bg-cyan-300"
            >
              Start Exploring

              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================
          RENTAL POLICIES
      ====================================== */}

      {settings && (
        <section className="border-y border-slate-200 bg-white py-10">
          <div className="mx-auto max-w-7xl px-5 lg:px-10">
            <div className="grid gap-6 sm:grid-cols-3">
              {/* Minimum Rental Days */}

              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {settings.minRentalDays}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Minimum Rental Days
                </p>
              </div>

              {/* Maximum Rental Days */}

              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {settings.maxRentalDays}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Maximum Rental Days
                </p>
              </div>

              {/* Cancellation Policy */}

              <div className="text-center">
                <p className="text-lg font-bold text-primary">
                  {settings.allowCancellation
                    ? "Pending booking cancellation"
                    : "Contact rental provider"}
                </p>

                <Link
                  href="/terms-and-conditions"
                  className="mt-2 inline-block text-sm text-slate-500 hover:text-primary"
                >
                  View Rental Policies
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ======================================
          FAQ SECTION
      ====================================== */}

      <section className="mx-auto max-w-4xl px-5 py-16 lg:py-24">
        <SectionHeading
          label="Need Help?"
          title="Frequently Asked Questions"
          description="Everything you need to know before starting your rental journey."
        />

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const expanded = activeFaq === index;

            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() =>
                    setActiveFaq(
                      expanded ? null : index
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-sm font-semibold text-primary-dark md:text-base"
                >
                  {faq.question}

                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-primary transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  id={`faq-answer-${index}`}
                  hidden={!expanded}
                  className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-500"
                >
                  {faq.answer}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================
          FINAL CTA
      ====================================== */}

      <section className="bg-primary py-14 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 text-center md:flex-row md:text-left lg:px-10">
          <div>
            <h2 className="text-3xl font-bold">
              Ready to hit the road?
            </h2>

            <p className="mt-3 text-sm text-cyan-100">
              Your next adventure is just a ride away.
            </p>
          </div>

          <Link
            href="/vehicles"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-7 py-4 text-sm font-bold text-primary transition hover:bg-primary-light"
          >
            Find Your Ride

            <ArrowRight size={19} />
          </Link>
        </div>
      </section>
    </div>
  );
}