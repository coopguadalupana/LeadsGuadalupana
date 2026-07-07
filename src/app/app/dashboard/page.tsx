"use client";

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col" style={{ background: "#f5f5f5" }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold" style={{ color: "#003160" }}>
          Dashboard
        </h1>
        <a
          href="http://10.60.81.130:3110/public/dashboard/eb26a683-fa81-42b6-aa13-4e9774fdd427"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#0e5bb0" }}
        >
          Abrir en Metabase
        </a>
      </div>

      <div className="min-h-0 flex-1 px-6 pb-6">
        <iframe
          src="http://10.60.81.130:3110/public/dashboard/eb26a683-fa81-42b6-aa13-4e9774fdd427"
          className="h-full w-full rounded-xl border"
          style={{ borderColor: "#e5e5e5" }}
          title="Dashboard Leads Guadalupana"
        />
      </div>
    </div>
  );
}
