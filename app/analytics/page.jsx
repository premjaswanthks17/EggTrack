"use client";

import { useState, useEffect } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";
import {
    LayoutDashboard,
    TrendingUp,
    MapPin,
    Users,
    Package,
    Calendar,
    Loader2,
    ChevronRight,
    Search,
    Download
} from "lucide-react";
import { getAnalyticsData } from "./actions";

const PERIODS = [
    { id: "30_days", label: "Last 30 Days" },
    { id: "3_months", label: "Last 3 Months" },
    { id: "all_time", label: "All Time" }
];

const GRADE_COLORS = {
    market: "#F9A825", // Yellow
    retail: "#2E7D32", // Green
    powder: "#1565C0"  // Blue
};

const PIE_COLORS = ["#2E7D32", "#F9A825", "#1565C0", "#6A1B9A", "#AD1457"];

export default function AnalyticsPage() {
    const [period, setPeriod] = useState("30_days");
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchData();
    }, [period]);

    async function fetchData() {
        setLoading(true);
        const result = await getAnalyticsData(period);
        setData(result);
        setLoading(false);
    }

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-[#2e7d32] mb-4" />
                <p className="text-[#152815]/60 font-medium anim-pulse">Gathering intelligence...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-heading font-bold text-[#152815] tracking-tight">
                        Sales Analytics
                    </h1>
                    <p className="text-[#152815]/50 mt-1 font-medium italic">
                        Top Buyers & Delivery Locations
                    </p>
                </div>

                <div className="flex bg-[#f4f9f5] p-1 rounded-xl border border-[#c8e6c9] shadow-inner self-start">
                    {PERIODS.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${period === p.id
                                ? "bg-white text-[#2e7d32] shadow-sm ring-1 ring-[#2e7d32]/5"
                                : "text-[#152815]/40 hover:text-[#152815]/70"
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Section 1: Top Buyers */}
            <div className="theme-card overflow-hidden">
                <div className="p-6 border-b border-[#c8e6c9]/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f4f9f5] rounded-xl flex items-center justify-center border border-[#c8e6c9]">
                            <TrendingUp className="w-5 h-5 text-[#2e7d32]" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-[#152815]">Top Buyers</h2>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#2e7d32] bg-[#f4f9f5] rounded-lg border border-[#c8e6c9] hover:bg-white transition-all shadow-sm">
                        <Download className="w-4 h-4" /> Export Data
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="p-6 border-r border-[#c8e6c9]/30 min-h-[400px]">
                        <p className="text-xs font-black text-[#152815]/30 uppercase tracking-widest mb-6">Volume by Shop (EGGS)</p>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart
                                layout="vertical"
                                data={data?.topBuyers}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E8F5E9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="shop_name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#152815', fontSize: 11, fontWeight: 700 }}
                                    width={100}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #c8e6c9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f4f9f5' }}
                                />
                                <Bar
                                    dataKey="total_eggs"
                                    fill="#2e7d32"
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-[#f4f9f5]/30 p-0 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#f4f9f5]/50 text-[10px] font-black text-[#152815]/30 uppercase tracking-widest">
                                <tr>
                                    <th className="py-4 px-6">Rank</th>
                                    <th className="py-4 px-6">Shop / Owner</th>
                                    <th className="py-4 px-6 text-center">Type</th>
                                    <th className="py-4 px-6 text-right">Total EGGS</th>
                                    <th className="py-4 px-6 text-right">Orders</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {data?.topBuyers.map((buyer, idx) => (
                                    <tr key={idx} className="border-b border-[#c8e6c9]/20 hover:bg-white transition-colors group">
                                        <td className="py-4 px-6 font-black text-[#2e7d32]/40">#{idx + 1}</td>
                                        <td className="py-4 px-6">
                                            <p className="font-bold text-[#152815]">{buyer.shop_name}</p>
                                            <p className="text-xs text-[#152815]/50 flex items-center gap-1">
                                                <Users className="w-3 h-3" /> {buyer.owner_name}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${buyer.customer_type === 'company' ? 'bg-blue-100 text-blue-700' :
                                                buyer.customer_type === 'individual' ? 'bg-purple-100 text-purple-700' :
                                                    buyer.customer_type === 'retail' ? 'bg-green-100 text-green-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {buyer.customer_type}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right font-heading font-bold text-[#152815]">
                                            {buyer.total_eggs.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-right text-[#152815]/60 pr-8">
                                            {buyer.total_orders}
                                        </td>
                                    </tr>
                                ))}
                                {(!data?.topBuyers || data.topBuyers.length === 0) && (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-[#152815]/40 italic">
                                            No sales recorded for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Section 2: Top Locations */}
                <div className="theme-card lg:col-span-1 flex flex-col">
                    <div className="p-6 border-b border-[#c8e6c9]/50 flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f4f9f5] rounded-xl flex items-center justify-center border border-[#c8e6c9]">
                            <MapPin className="w-5 h-5 text-[#2e7d32]" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-[#152815]">Top Locations</h2>
                    </div>
                    <div className="p-6 space-y-6 flex-1">
                        {data?.topLocations.map((loc, idx) => {
                            const maxEggs = data.topLocations[0]?.total_eggs || 1;
                            const percentage = (loc.total_eggs / maxEggs) * 100;
                            return (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-[10px] font-black text-[#2e7d32]/40 mr-2 uppercase tracking-widest">#{idx + 1}</span>
                                            <span className="font-bold text-[#152815]">{loc.location}</span>
                                        </div>
                                        <span className="font-heading font-medium text-sm text-[#152815]">{loc.total_eggs.toLocaleString()} EGGS</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[#f4f9f5] rounded-full overflow-hidden border border-[#c8e6c9]/20">
                                        <div
                                            className="h-full bg-[#2e7d32] rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-[#152815]/40 uppercase tracking-widest">
                                        {loc.total_orders} deliveries handled
                                    </p>
                                </div>
                            );
                        })}
                        {(!data?.topLocations || data.topLocations.length === 0) && (
                            <div className="py-12 text-center text-[#152815]/40 italic">
                                No location data available.
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 4: Delivery Frequency */}
                <div className="theme-card lg:col-span-2">
                    <div className="p-6 border-b border-[#c8e6c9]/50 flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f4f9f5] rounded-xl flex items-center justify-center border border-[#c8e6c9]">
                            <Users className="w-5 h-5 text-[#2e7d32]" />
                        </div>
                        <h2 className="text-xl font-heading font-bold text-[#152815]">Customer Logistics</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.deliveryFrequency}
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data?.deliveryFrequency.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #c8e6c9' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-[#152815]/60 leading-relaxed italic">
                                Breakdown of preferred delivery schedules across your entire approved customer base. This helps in mapping weekly production targets.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {data?.deliveryFrequency.map((f, i) => (
                                    <div key={i} className="p-4 bg-[#f4f9f5] rounded-xl border border-[#c8e6c9]/50 shadow-sm">
                                        <p className="text-[10px] font-black text-[#152815]/40 uppercase tracking-widest mb-1">{f.name}</p>
                                        <p className="text-2xl font-heading font-bold text-[#2e7d32]">{f.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3: Grade Popularity */}
            <div className="theme-card">
                <div className="p-6 border-b border-[#c8e6c9]/50 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#f4f9f5] rounded-xl flex items-center justify-center border border-[#c8e6c9]">
                        <Package className="w-5 h-5 text-[#2e7d32]" />
                    </div>
                    <h2 className="text-xl font-heading font-bold text-[#152815]">Grade Popularity by Segment</h2>
                </div>
                <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {['company', 'individual', 'market', 'retail'].map((type) => (
                        <div key={type} className="flex flex-col items-center">
                            <span className={`mb-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${type === 'company' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                type === 'individual' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                    type === 'market' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                        'bg-green-50 text-green-700 border-green-200'
                                }`}>
                                {type} segment
                            </span>
                            <div className="h-[180px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data?.gradePopularity[type]}
                                            innerRadius={45}
                                            outerRadius={65}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {data?.gradePopularity[type]?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex gap-4 text-[9px] font-black uppercase tracking-tighter text-[#152815]/40">
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#F9A825]" /> Market</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#2E7D32]" /> Retail</div>
                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#1565C0]" /> Powder</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats Summary Footer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-6 bg-white rounded-2xl border border-[#c8e6c9] shadow-sm flex flex-col items-center text-center">
                    <LayoutDashboard className="w-5 h-5 text-[#2e7d32]/30 mb-2" />
                    <p className="text-3xl font-heading font-bold text-[#152815]">
                        {data?.topBuyers.length || 0}
                    </p>
                    <p className="text-[10px] font-black text-[#152815]/40 uppercase tracking-widest mt-1">Active Buyers</p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-[#c8e6c9] shadow-sm flex flex-col items-center text-center">
                    <Calendar className="w-5 h-5 text-[#2e7d32]/30 mb-2" />
                    <p className="text-3xl font-heading font-bold text-[#152815]">
                        {period === "30_days" ? "30" : period === "3_months" ? "90" : "∞"}
                    </p>
                    <p className="text-[10px] font-black text-[#152815]/40 uppercase tracking-widest mt-1">Day Window</p>
                </div>
                <div className="p-6 bg-white rounded-2xl border border-[#c8e6c9] shadow-sm flex flex-col items-center text-center">
                    <MapPin className="w-5 h-5 text-[#2e7d32]/30 mb-2" />
                    <p className="text-3xl font-heading font-bold text-[#152815]">
                        {data?.topLocations.length || 0}
                    </p>
                    <p className="text-[10px] font-black text-[#152815]/40 uppercase tracking-widest mt-1">Unique Locs</p>
                </div>
                <div className="p-6 bg-[#2e7d32] rounded-2xl border border-[#2e7d32] shadow-sm flex flex-col items-center text-center">
                    <Download className="w-5 h-5 text-white/30 mb-2" />
                    <button className="text-sm font-bold text-white uppercase tracking-widest mt-1 hover:underline">
                        Get Full Report
                    </button>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">CSV Format</p>
                </div>
            </div>
        </div>
    );
}
