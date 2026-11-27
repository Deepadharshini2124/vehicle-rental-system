"use client";

import { useState } from "react";
import { getVehicleImage } from "@/lib/api";

type VehicleImageProps = {
  image?: string | null;
  name: string;
  type: "car" | "bike";
  large?: boolean;
};

export default function VehicleImage({
  image,
  name,
  type,
  large = false,
}: VehicleImageProps) {
  const imageUrl = getVehicleImage(image);

  const [failedUrl, setFailedUrl] =
    useState<string | null>(null);

  const sizeClass = large
    ? "h-40 w-full"
    : "h-16 w-24";

  // Fallback when image is missing or fails to load
  if (!imageUrl || failedUrl === imageUrl) {
    return (
      <div
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100`}
      >
        <span
          role="img"
          aria-label={`${type} placeholder`}
          className={large ? "text-5xl" : "text-2xl"}
        >
          {type === "car" ? "🚗" : "🏍️"}
        </span>
      </div>
    );
  }

  // Vehicle image
  return (
    <img
      src={imageUrl}
      alt={name || "Vehicle"}
      loading="lazy"
      onError={() => setFailedUrl(imageUrl)}
      className={`${sizeClass} shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-contain`}
    />
  );
}