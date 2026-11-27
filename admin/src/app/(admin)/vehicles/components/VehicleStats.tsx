import type { VehicleStatsData } from "../types";

type StatCardProps = {
  title: string;
  value: number;
  color: string;
  description?: string;
};

type VehicleStatsProps = {
  stats: VehicleStatsData;
  loading: boolean;
};

// Reusable statistics card
function StatCard({
  title,
  value,
  color,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className={`mt-3 text-3xl font-bold ${color}`}>
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}

// Vehicle statistics section
export default function VehicleStats({
  stats,
  loading,
}: VehicleStatsProps) {
  if (loading) return null;

  const cards: StatCardProps[] = [
    {
      title: "Total Vehicles",
      value: stats.total,
      color: "text-slate-900",
      description: `${stats.cars} Cars · ${stats.bikes} Bikes`,
    },
    {
      title: "Available",
      value: stats.available,
      color: "text-green-700",
      description: "Available fleet status",
    },
    {
      title: "Currently Rented",
      value: stats.rented,
      color: "text-orange-600",
      description: "Vehicles with customers",
    },
    {
      title: "Unavailable",
      value: stats.maintenance + stats.inactive,
      color: "text-red-600",
      description: `${stats.maintenance} Maintenance · ${stats.inactive} Inactive`,
    },
  ];

  return (
    <section className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCard key={card.title} {...card} />
      ))}
    </section>
  );
}