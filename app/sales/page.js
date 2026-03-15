"use client";

import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Search, Download, TrendingUp } from "lucide-react";
import { getSalesData } from "./actions";

// Organic color mapping
const GRADE_COLORS = {
    market: "#eab308", // Yellow
    retail: "#2e7d32", // Green
    powder: "#3b82f6", // Blue
};

export default function SalesPage() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Timeframe Filter
    const [timeframe, setTimeframe] = useState("month"); // week, month, 3months

    // Table Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    useEffect(() => {
        async function load() {
            const data = await getSalesData();
            setOrders(data || []);
            setIsLoading(false);
        }
        load();
    }, []);

    // 1. TOP SUMMARY CARDS
    const summary = useMemo(() => {
        let pending = 0;
        let confirmed = 0;
        let totalEggs = 0;

        orders.forEach(o => {
            if (o.status === 'pending') pending++;
            if (o.status === 'confirmed' || o.status === 'shipped') confirmed++;
            totalEggs += o.quantity_kg;
        });

        return {
            total: orders.length,
            pending,
            confirmed,
            totalEggs: totalEggs.toFixed(0)
        };
    }, [orders]);

    // 2. SALES BY GRADE TABLE
    const gradeMetrics = useMemo(() => {
        const metrics = {
            market: { count: 0, eggs: 0 },
            retail: { count: 0, eggs: 0 },
            powder: { count: 0, eggs: 0 }
        };

        orders.forEach(o => {
            if (metrics[o.grade]) {
                metrics[o.grade].count++;
                metrics[o.grade].eggs += o.quantity_kg;
            }
        });

        const totalCount = orders.length || 1; // prevent div by zero

        return [
            { name: "Market", ...metrics.market, pct: ((metrics.market.count / totalCount) * 100).toFixed(1), color: GRADE_COLORS.market },
            { name: "Retail", ...metrics.retail, pct: ((metrics.retail.count / totalCount) * 100).toFixed(1), color: GRADE_COLORS.retail },
            { name: "Powder", ...metrics.powder, pct: ((metrics.powder.count / totalCount) * 100).toFixed(1), color: GRADE_COLORS.powder },
        ];
    }, [orders]);

    // 3. ORDERS OVER TIME CHART
    const chartData = useMemo(() => {
        if (orders.length === 0) return [];

        // Determine cutoff date based on timeframe
        const now = new Date();
        let cutoff = new Date();
        if (timeframe === "week") cutoff.setDate(now.getDate() - 7);
        if (timeframe === "month") cutoff.setMonth(now.getMonth() - 1);
        if (timeframe === "3months") cutoff.setMonth(now.getMonth() - 3);

        const filtered = orders.filter(o => new Date(o.created_at) >= cutoff);

        // Group by Date
        const grouped = {};
        filtered.forEach(o => {
            const dateStr = new Date(o.created_at).toISOString().split('T')[0];
            if (!grouped[dateStr]) grouped[dateStr] = 0;
            grouped[dateStr]++;
        });

        // Sort chronologically
        return Object.keys(grouped).sort().map(k => ({
            date: k,
            orders: grouped[k]
        }));
    }, [orders, timeframe]);

    // 4. TOP SHOPKEEPERS
    const topShops = useMemo(() => {
        const grouped = {};
        orders.forEach(o => {
            if (!grouped[o.shop_id]) {
                grouped[o.shop_id] = {
                    name: o.shop_name,
                    owner: o.shop_owner,
                    orderCount: 0,
                    totalEggs: 0
                };
            }
            grouped[o.shop_id].orderCount++;
            grouped[o.shop_id].totalEggs += o.quantity_kg;
        });

        // Convert to array, sort by totalEggs DESC, take top 5
        return Object.values(grouped)
            .sort((a, b) => b.totalEggs - a.totalEggs)
            .slice(0, 5);
    }, [orders]);

    // 5. FULL ORDERS TABLE LOGIC
    const filteredTableData = useMemo(() => {
        return orders.filter(o => {
            // Search
            const matchesSearch = (o.shop_name || "").toLowerCase().includes(searchQuery.toLowerCase());
            // Status
            const matchesStatus = statusFilter === "all" || o.status === statusFilter;
            // Date Range
            let matchesDates = true;
            const oDate = new Date(o.created_at);
            if (dateRange.start) {
                matchesDates = matchesDates && oDate >= new Date(dateRange.start);
            }
            if (dateRange.end) {
                const endD = new Date(dateRange.end);
                endD.setHours(23, 59, 59, 999);
                matchesDates = matchesDates && oDate <= endD;
            }

            return matchesSearch && matchesStatus && matchesDates;
        });
    }, [orders, searchQuery, statusFilter, dateRange]);

    const handleExportCSV = () => {
        if (filteredTableData.length === 0) return;

        const headers = ["Order ID", "Shop Name", "Grade", "Quantity (EGGS)", "Status", "Ordered At"];
        const rows = filteredTableData.map(r => [
            r.id,
            `"${r.shop_name}"`, // Quote to handle commas in names
            r.grade,
            r.quantity_kg,
            r.status,
            new Date(r.created_at).toISOString()
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `eggtrack_sales_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (isoString) => {
        if (!isoString) return "";
        return new Date(isoString).toLocaleString([], { year: "numeric", month: "short", day: "numeric" });
    };

    if (isLoading) {
        return <div className="flex items-center justify-center p-20 text-[#152815]/50 animate-pulse font-medium">Loading sales analytics...</div>;
    }

    return (
        <div className="flex flex-col gap-8 pb-10">

            <div className="flex flex-col gap-1">
                <h1 className="text-4xl text-[#152815] tracking-tight">Sales & Analytics</h1>
                <p className="text-[#152815]/60">Monitor revenue streams, customer demand, and historical volume.</p>
            </div>

            {/* 1. TOP SUMMARY CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5">
                    <h3 className="text-xs font-bold text-[#152815]/50 uppercase tracking-widest mb-2 flex items-center gap-2">
                        Total Orders <TrendingUp className="w-3.5 h-3.5 text-[#2e7d32]" />
                    </h3>
                    <p className="text-4xl font-heading text-[#152815]">{summary.total.toLocaleString()}</p>
                </div>
                <div className="bg-[#f4f9f5] rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9]">
                    <h3 className="text-xs font-bold text-[#3b82f6]/70 uppercase tracking-widest mb-2">Confirmed Orders</h3>
                    <p className="text-4xl font-heading text-[#3b82f6] shadow-sm">{summary.confirmed.toLocaleString()}</p>
                </div>
                <div className="bg-[#fcf8e3] rounded-[1rem] p-6 shadow-sm border border-[#fde047]">
                    <h3 className="text-xs font-bold text-[#ca8a04]/70 uppercase tracking-widest mb-2">Pending Orders</h3>
                    <p className="text-4xl font-heading text-[#ca8a04]">{summary.pending.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5">
                    <h3 className="text-xs font-bold text-[#152815]/50 uppercase tracking-widest mb-2">Total Volume</h3>
                    <p className="text-4xl font-heading text-[#152815]">{summary.totalEggs.toLocaleString()} <span className="text-lg text-[#152815]/40 ml-1">EGGS</span></p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 2. SALES BY GRADE TABLE */}
                <div className="lg:col-span-1 bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col">
                    <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest mb-6">Sales by Grade</h3>
                    <div className="flex flex-col gap-4">
                        {gradeMetrics.map(g => (
                            <div key={g.name} className="flex flex-col gap-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: g.color }}>
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }}></div> {g.name}
                                    </span>
                                    <div className="flex flex-col items-end">
                                        <span className="font-heading font-bold text-xl text-[#152815]">{g.eggs.toFixed(0)} <span className="text-xs text-[#152815]/40">EGGS</span></span>
                                        <span className="text-[10px] font-bold text-[#152815]/40 uppercase tracking-widest">({g.count} Orders)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-[#f4f9f5] h-1.5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${g.pct}%`, backgroundColor: g.color }}></div>
                                </div>
                                <div className="text-xs font-medium text-[#152815]/50 text-right">{g.pct}% of total demand</div>
                                <div className="w-full h-px bg-[#c8e6c9]/40 my-1 last:hidden"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. ORDERS OVER TIME CHART */}
                <div className="lg:col-span-2 bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col">
                    <div className="flex justify-between items-end mb-6">
                        <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest">Order Frequency</h3>
                        <div className="flex gap-2 bg-[#f4f9f5] p-1 rounded-lg border border-[#c8e6c9]">
                            {["week", "month", "3months"].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTimeframe(t)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeframe === t ? 'bg-white text-[#2e7d32] shadow-sm' : 'text-[#152815]/50 hover:text-[#152815]'}`}
                                >
                                    {t === 'week' ? '7 Days' : t === 'month' ? '30 Days' : '90 Days'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[250px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#152815', opacity: 0.5 }} />
                                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#152815', opacity: 0.5 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #c8e6c9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                                        cursor={{ stroke: '#c8e6c9', strokeWidth: 1, strokeDasharray: "5 5" }}
                                    />
                                    <Line type="monotone" dataKey="orders" name="Total Orders" stroke="#2e7d32" strokeWidth={3} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#152815]/30 text-sm font-medium border border-[#c8e6c9] border-dashed rounded-xl">No orders in this timeframe.</div>
                        )}
                    </div>
                </div>

            </div>

            {/* 4. TOP SHOPKEEPERS */}
            <div className="bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5">
                <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest mb-6 border-b border-[#c8e6c9]/50 pb-4">Top 5 Vendors by Volume</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {topShops.length === 0 ? (
                        <div className="col-span-5 text-center text-[#152815]/40 text-sm font-medium">No vendor data available.</div>
                    ) : (
                        topShops.map((shop, i) => (
                            <div key={i} className={`p-4 rounded-xl border ${i === 0 ? 'bg-[#f4f9f5] border-[#2e7d32]/30 ring-1 ring-[#2e7d32]/10' : 'bg-white border-[#c8e6c9]'} flex flex-col gap-1`}>
                                <span className="text-xs font-bold text-[#152815]/40 mb-1">#{i + 1}</span>
                                <span className="font-bold text-[#152815] truncate">{shop.name}</span>
                                <span className="text-xs text-[#152815]/60 mb-3">{shop.owner}</span>
                                <div className="mt-auto grid grid-cols-2 gap-2 pt-3 border-t border-[#c8e6c9]">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#152815]/40">Orders</span>
                                        <span className="font-bold text-[#152815]">{shop.orderCount}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#152815]/40">Volume</span>
                                        <span className="font-bold text-[#2e7d32]">{shop.totalEggs.toFixed(0)} EGGS</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 5. FULL ORDERS TABLE LOGIC */}
            <div className="bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col gap-6">

                <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest">Full Sales Ledger</h3>
                    <p className="text-xs text-[#152815]/50 font-medium">Search and filter the complete order history.</p>
                </div>

                {/* Filtering Controls */}
                <div className="flex flex-wrap items-center gap-4 bg-[#f4f9f5] p-3 rounded-xl border border-[#c8e6c9]/60">
                    <div className="flex-1 relative min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#152815]/40" />
                        <input
                            type="text"
                            placeholder="Search by shop name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-[#c8e6c9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="py-2 px-3 bg-white border border-[#c8e6c9] rounded-lg text-sm font-medium pr-8 focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                    </select>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="py-2 px-3 bg-white border border-[#c8e6c9] rounded-lg text-sm text-[#152815]/80 focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20"
                        />
                        <span className="text-[#152815]/30 block w-2 h-px bg-[#152815]/30"></span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="py-2 px-3 bg-white border border-[#c8e6c9] rounded-lg text-sm text-[#152815]/80 focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20"
                        />
                    </div>

                    <button
                        onClick={handleExportCSV}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-white border border-[#c8e6c9] text-[#2e7d32] font-semibold text-sm rounded-lg hover:bg-[#d7ecd7]/30 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                </div>

                <div className="border border-[#c8e6c9]/60 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#f4f9f5]">
                            <tr className="text-[#152815]/70 text-xs tracking-wider uppercase">
                                <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Order ID</th>
                                <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Shop Name</th>
                                <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Grade Requirement</th>
                                <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Qty (EGGS)</th>
                                <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Status</th>
                                <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] text-right">Order Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTableData.length === 0 ? (
                                <tr><td colSpan="6" className="py-8 text-center text-[#152815]/40 font-medium">No orders match these filters.</td></tr>
                            ) : (
                                filteredTableData.map(o => (
                                    <tr key={o.id} className="border-b border-[#f4f9f5] hover:bg-[#f4f9f5]/50 transition-colors">
                                        <td className="py-3 px-4 font-heading font-semibold text-[#152815]">{o.id.split("-")[0].toUpperCase()}</td>
                                        <td className="py-3 px-4 text-[#152815]/80 font-bold">{o.shop_name}</td>
                                        <td className="py-3 px-4">
                                            <span
                                                className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
                                                style={{ backgroundColor: `${GRADE_COLORS[o.grade]}20`, color: GRADE_COLORS[o.grade] }}
                                            >
                                                {o.grade}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-heading font-medium text-[#152815]">{o.quantity_kg.toFixed(0)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${o.status === "pending" ? 'bg-[#ca8a04]/10 text-[#ca8a04]' : o.status === "confirmed" ? 'bg-[#3b82f6]/10 text-[#3b82f6]' : 'bg-[#2e7d32]/10 text-[#2e7d32]'}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right text-[#152815]/60 font-medium">{formatDate(o.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

        </div>
    );
}
