"use client";

import { useEffect, useState } from "react";

interface AdMetric {
  ad_id: string;
  total_mensajes: number;
  total_conversaciones: number;
  leads_hot: number;
  leads_warm: number;
  leads_cold: number;
}

export default function AdsDashboard() {
  const [data, setData] = useState<AdMetric[]>([]);

  useEffect(() => {
    fetch("/api/ads/performance").then((r) => r.json()).then(setData);
  }, []);

  const totals = data.reduce((s, a) => ({
    conv: s.conv + a.total_conversaciones,
    hot: s.hot + a.leads_hot,
    warm: s.warm + a.leads_warm,
    cold: s.cold + a.leads_cold,
  }), { conv: 0, hot: 0, warm: 0, cold: 0 });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Rendimiento de Anuncios</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Conversaciones</p>
          <p className="text-3xl font-bold">{totals.conv}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Hot</p>
          <p className="text-3xl font-bold text-red-600">{totals.hot}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Warm</p>
          <p className="text-3xl font-bold text-yellow-600">{totals.warm}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">Cold</p>
          <p className="text-3xl font-bold text-gray-500">{totals.cold}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Ad ID</th>
              <th className="px-4 py-3 text-left font-medium">Msgs</th>
              <th className="px-4 py-3 text-left font-medium">Conversaciones</th>
              <th className="px-4 py-3 text-left font-medium">Hot</th>
              <th className="px-4 py-3 text-left font-medium">Warm</th>
              <th className="px-4 py-3 text-left font-medium">Cold</th>
            </tr>
          </thead>
          <tbody>
            {data.map((ad) => (
              <tr key={ad.ad_id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{ad.ad_id}</td>
                <td className="px-4 py-3">{ad.total_mensajes}</td>
                <td className="px-4 py-3">{ad.total_conversaciones}</td>
                <td className="px-4 py-3 text-red-600">{ad.leads_hot}</td>
                <td className="px-4 py-3 text-yellow-600">{ad.leads_warm}</td>
                <td className="px-4 py-3 text-gray-500">{ad.leads_cold}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <p className="py-8 text-center text-gray-400">Sin datos de anuncios</p>}
      </div>
    </div>
  );
}
