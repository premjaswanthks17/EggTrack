"use client";

import { useState, useEffect } from "react";
import { getDashboardStats } from "../dashboard/actions";
import { Package, TrendingUp, Archive, AlertCircle, RefreshCcw } from "lucide-react";

export default function InventoryPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    async function loadStats() {
        setLoading(true);
        const data = await getDashboardStats();
        setStats(data);
        setLoading(false);
    }

    useEffect(() => {
        loadStats();
    }, []);

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e7d32]"></div>
            </div>
        );
    }

    const { 
        available = { total: 0, market: 0, retail: 0, powder: 0 }, 
        produced = { total: 0, market: 0, retail: 0, powder: 0 } 
    } = stats || {};

    return (
        <div className="flex flex-col gap-10 pb-10">
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl text-[#152815] tracking-tight font-bold">Remaining Egg Count</h1>
                    <p className="text-[#152815]/60 font-medium">Detailed breakdown of available stock across all grades.</p>
                </div>
                <button
                    onClick={loadStats}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#c8e6c9] text-[#2e7d32] font-semibold rounded-xl hover:bg-[#f4f9f5] transition-all shadow-sm"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Sync Data
                </button>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Global Available", value: available.total, icon: Package, color: "#2e7d32", bg: "bg-green-50" },
                    { label: "Total Produced", value: produced.total, icon: Archive, color: "#152815", bg: "bg-gray-50" },
                    { label: "Total Committed", value: Math.max(0, produced.total - available.total), icon: TrendingUp, color: "#3b82f6", bg: "bg-blue-50" },
                ].map((card, i) => (
                    <div key={i} className={`p-8 rounded-2xl border border-[#c8e6c9] shadow-sm flex items-center gap-6 ${card.bg}`}>
                        <div className="p-4 rounded-xl bg-white border border-[#c8e6c9]/50 text-[#2e7d32] shadow-sm">
                            <card.icon className="w-8 h-8" style={{ color: card.color }} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest">{card.label}</span>
                            <span className="text-4xl font-bold text-[#152815] tracking-tighter">
                                {card.value.toLocaleString()} <span className="text-lg opacity-40">EGGS</span>
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* GRADE BREAKDOWN TABLE */}
            <div className="bg-white rounded-3xl border border-[#c8e6c9] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#c8e6c9] bg-[#f4f9f5]">
                    <h3 className="text-lg font-bold text-[#152815] flex items-center gap-2">
                        <Archive className="w-5 h-5 text-[#2e7d32]" />
                        Grade-wise Availability
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-[#c8e6c9] text-[11px] font-bold uppercase tracking-widest text-[#152815]/50">
                                <th className="px-8 py-5">Grade Type</th>
                                <th className="px-8 py-5">Produced</th>
                                <th className="px-8 py-5">Allocated</th>
                                <th className="px-8 py-5">Remaining</th>
                                <th className="px-8 py-5 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {[
                                { name: "Market", grade: "market", color: "#eab308" },
                                { name: "Retail", grade: "retail", color: "#2e7d32" },
                                { name: "Powder", grade: "powder", color: "#3b82f6" }
                            ].map((row) => {
                                const prod = produced[row.grade];
                                const avail = available[row.grade];
                                const allocated = Math.max(0, prod - avail);
                                const percentage = prod > 0 ? (avail / prod) * 100 : 0;

                                return (
                                    <tr key={row.grade} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }}></div>
                                                <span className="font-bold text-[#152815]">{row.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 font-medium text-[#152815]">{prod.toLocaleString()}</td>
                                        <td className="px-8 py-6 text-blue-600 font-bold">{allocated.toLocaleString()}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="font-bold text-[#2e7d32] text-lg">{avail.toLocaleString()}</span>
                                                <div className="w-32 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-1000"
                                                        style={{ width: `${percentage}%`, backgroundColor: row.color }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${avail > 100 ? 'bg-green-50 text-green-700 border-green-200' :
                                                avail > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                {avail > 100 ? 'Healthy' : avail > 0 ? 'Low Stock' : 'Critical'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* LIVE FEED NOTICE */}
            <div className="flex items-center gap-4 p-6 bg-[#152815] rounded-2xl text-white shadow-xl">
                <div className="p-3 bg-white/10 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex flex-col">
                    <p className="font-bold text-lg leading-tight uppercase tracking-tight">Sync Status: Active</p>
                    <p className="text-white/60 text-sm font-medium">Inventory updates automatically every time a production pallet is scanned or an order is approved.</p>
                </div>
            </div>
        </div>
    );
}
