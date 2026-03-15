"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getDashboardStats, getRecentReadings, getHourlyData } from "./actions";
import { Activity, Plus } from "lucide-react";
import Link from "next/link";

// Colors corresponding to grades (Organic Light Theme compatible)
const GRADE_COLORS = {
    market: "#eab308", // Yellow-500
    retail: "#2e7d32", // Forest Green (Primary)
    powder: "#3b82f6", // Blue-500
};

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        total: { count: 0, weight: 0 },
        market: { count: 0, weight: 0 },
        retail: { count: 0, weight: 0 },
        powder: { count: 0, weight: 0 }
    });
    const [recentReadings, setRecentReadings] = useState([]);
    const [hourlyData, setHourlyData] = useState([]);
    const [latestReading, setLatestReading] = useState(null);
    const [isFlashing, setIsFlashing] = useState(false);

    const fetchAllData = useCallback(async () => {
        try {
            const [newStats, newRecent, newHourly] = await Promise.all([
                getDashboardStats(),
                getRecentReadings(),
                getHourlyData()
            ]);
            setStats(newStats);
            setRecentReadings(newRecent || []);
            setHourlyData(newHourly || []);

            if (newRecent && newRecent.length > 0) {
                setLatestReading(newRecent[0]);
            }
        } catch (e) {
            console.error("Failed to fetch initial data", e);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Polling for recent readings table (every 30 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            getRecentReadings().then((data) => {
                if (data) setRecentReadings(data);
            });
            getDashboardStats().then((data) => {
                if (data) setStats(data);
            });
            getHourlyData().then((data) => {
                if (data) setHourlyData(data);
            });
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Supabase Realtime Subscription for Live Weight Monitor
    useEffect(() => {
        let emptyTimeout;

        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'egg_readings',
                },
                (payload) => {
                    console.log("Realtime payload received:", payload.new);
                    setLatestReading(payload.new);

                    // Trigger flash animation
                    setIsFlashing(true);
                    setTimeout(() => setIsFlashing(false), 1000);

                    // Set timeout to clear reading when scale is empty (4s)
                    if (emptyTimeout) clearTimeout(emptyTimeout);
                    emptyTimeout = setTimeout(() => {
                        setLatestReading(null);
                    }, 4000);

                    // Optimistically update counts
                    setStats(prev => {
                        const count = payload.new.egg_count || 1;
                        const weight = payload.new.weight_grams;
                        const next = { ...prev };

                        next.total = {
                            count: prev.total.count + count,
                            weight: prev.total.weight + weight
                        };

                        if (payload.new.grade === 'market') {
                            next.market = {
                                count: prev.market.count + count,
                                weight: prev.market.weight + weight
                            };
                        }
                        if (payload.new.grade === 'retail') {
                            next.retail = {
                                count: prev.retail.count + count,
                                weight: prev.retail.weight + weight
                            };
                        }
                        if (payload.new.grade === 'powder') {
                            next.powder = {
                                count: prev.powder.count + count,
                                weight: prev.powder.weight + weight
                            };
                        }
                        return next;
                    });
                }
            )
            .subscribe((status) => {
                console.log("Supabase Realtime Status:", status);
            });

        return () => {
            if (emptyTimeout) clearTimeout(emptyTimeout);
            supabase.removeChannel(channel);
        };
    }, []);

    // Format timestamp
    const formatTime = (isoString) => {
        if (!isoString) return "";
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-end gap-6 mb-2">
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl text-[#152815] tracking-tight font-bold">Live Dashboard</h1>
                    <p className="text-[#152815]/60 font-medium">Realtime overview of today&apos;s production metrics.</p>
                </div>
                <Link 
                    href="/manual-entry"
                    className="bg-[#2e7d32] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1b431d] shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Manual Entry
                </Link>
            </div>

            {/* 1. TOP STATS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col">
                    <h3 className="text-xs font-bold text-[#152815]/50 uppercase tracking-widest mb-2">Total Produced Today</h3>
                    <p className="text-3xl font-heading text-[#152815] mb-4">{stats.total.count.toLocaleString()} <span className="text-lg">eggs</span></p>
                    <div className="mt-auto pt-3 border-t border-[#c8e6c9]/50">
                        <p className="text-[10px] text-[#152815]/50 font-black uppercase tracking-widest mb-1">Global Available Inventory</p>
                        <p className="text-xl font-heading text-[#2e7d32]">{stats.available?.total?.toLocaleString() || 0} <span className="text-sm">eggs</span></p>
                    </div>
                </div>
                <div className="bg-white rounded-[1rem] p-6 shadow-sm border-b-4 flex flex-col" style={{ borderBottomColor: GRADE_COLORS.market }}>
                    <h3 className="text-xs font-bold text-[#152815]/50 uppercase tracking-widest mb-2">Market Grade</h3>
                    <p className="text-3xl font-heading text-[#152815] mb-4">{stats.market.count.toLocaleString()} <span className="text-lg">eggs</span></p>
                    <div className="mt-auto pt-3 border-t border-[#c8e6c9]/50">
                        <p className="text-[10px] text-[#152815]/50 font-black uppercase tracking-widest mb-1">Available</p>
                        <p className="text-xl font-heading text-[#2e7d32]">{stats.available?.market?.toLocaleString() || 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-[1rem] p-6 shadow-sm border-b-4 flex flex-col" style={{ borderBottomColor: GRADE_COLORS.retail }}>
                    <h3 className="text-xs font-bold text-[#152815]/50 uppercase tracking-widest mb-2">Retail Grade</h3>
                    <p className="text-3xl font-heading text-[#152815] mb-4">{stats.retail.count.toLocaleString()} <span className="text-lg">eggs</span></p>
                    <div className="mt-auto pt-3 border-t border-[#c8e6c9]/50">
                        <p className="text-[10px] text-[#152815]/50 font-black uppercase tracking-widest mb-1">Available</p>
                        <p className="text-xl font-heading text-[#2e7d32]">{stats.available?.retail?.toLocaleString() || 0}</p>
                    </div>
                </div>
                <div className="bg-white rounded-[1rem] p-6 shadow-sm border-b-4 flex flex-col" style={{ borderBottomColor: GRADE_COLORS.powder }}>
                    <h3 className="text-xs font-bold text-[#152815]/50 uppercase tracking-widest mb-2">Powder Grade</h3>
                    <p className="text-3xl font-heading text-[#152815] mb-4">{stats.powder.count.toLocaleString()} <span className="text-lg">eggs</span></p>
                    <div className="mt-auto pt-3 border-t border-[#c8e6c9]/50">
                        <p className="text-[10px] text-[#152815]/50 font-black uppercase tracking-widest mb-1">Available</p>
                        <p className="text-xl font-heading text-[#2e7d32]">{stats.available?.powder?.toLocaleString() || 0}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 2. LIVE WEIGHT MONITOR */}
                <div className="lg:col-span-1 bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col items-center justify-center min-h-[400px]">
                    <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest w-full text-center mb-8">Live Conveyor Reading</h3>

                    <div
                        className={`w-56 h-56 rounded-full flex flex-col items-center justify-center transition-all duration-300 relative ${isFlashing ? 'scale-110 shadow-lg' : 'scale-100 shadow-md'}`}
                        style={{
                            backgroundColor: latestReading ? `${GRADE_COLORS[latestReading.grade]}15` : '#f4f9f5',
                            border: `4px solid ${latestReading ? GRADE_COLORS[latestReading.grade] : '#e5e7eb'}`
                        }}
                    >
                        {isFlashing && (
                            <div
                                className="absolute inset-0 rounded-full animate-ping opacity-20"
                                style={{ backgroundColor: GRADE_COLORS[latestReading?.grade] }}
                            />
                        )}
                        <span className="text-6xl font-heading font-bold text-[#152815]">
                            {stats.total.count.toLocaleString()}
                        </span>
                        <span className="text-lg text-[#152815]/60 font-medium">eggs</span>
                        {latestReading ? (
                            <span className="text-sm font-black text-[#2e7d32] mt-2 opacity-60">
                                Last: {latestReading.weight_grams.toFixed(1)}g
                            </span>
                        ) : (
                            <span className="text-sm font-black text-[#152815]/40 mt-2">
                                Scale Empty
                            </span>
                        )}
                    </div>

                    {latestReading ? (
                        <div className="mt-8 text-center flex flex-col items-center gap-2">
                            <span
                                className="px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase text-white shadow-sm"
                                style={{ backgroundColor: GRADE_COLORS[latestReading.grade] }}
                            >
                                {latestReading.grade} Grade
                            </span>
                            <span className="text-xs font-medium text-[#152815]/40">
                                Source: {latestReading.source || "Conveyor A"} • {formatTime(latestReading.recorded_at)}
                            </span>
                        </div>
                    ) : (
                        <div className="mt-8 text-[#152815]/40 text-sm font-black tracking-widest uppercase bg-[#f4f9f5] px-4 py-1.5 rounded-full border border-[#c8e6c9]">Scale Empty</div>
                    )}
                </div>

                {/* 3. TODAY'S CLASSIFICATION BAR CHART */}
                <div className="lg:col-span-2 bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col">
                    <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest mb-6">Today&apos;s Classification by Hour</h3>
                    <div className="flex-1 w-full min-h-[300px]">
                        {hourlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#152815', opacity: 0.5 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#152815', opacity: 0.5 }} />
                                    <Tooltip
                                        cursor={{ fill: '#f4f9f5' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #c8e6c9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                    <Bar dataKey="market" name="Market (< 50g)" fill={GRADE_COLORS.market} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="retail" name="Retail (50-60g)" fill={GRADE_COLORS.retail} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey="powder" name="Powder (> 60g)" fill={GRADE_COLORS.powder} radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[#152815]/40 text-sm font-medium border border-[#c8e6c9] border-dashed rounded-xl">
                                No data points yet today
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* 4. RECENT READINGS TABLE */}
            <div className="bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5">
                <div className="flex justify-between items-end mb-6">
                    <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest">Recent Readings</h3>
                    <span className="text-xs text-[#152815]/40 font-medium flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2e7d32] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2e7d32]"></span>
                        </span>
                        Auto-refreshes 30s
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-[#c8e6c9]/60 text-[#152815]/40">
                                <th className="pb-3 font-semibold">Time</th>
                                <th className="pb-3 font-semibold">Weight (g)</th>
                                <th className="pb-3 font-semibold text-center">Egg Count</th>
                                <th className="pb-3 font-semibold">Grade</th>
                                <th className="pb-3 font-semibold">Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentReadings.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-[#152815]/40">No readings found in database.</td>
                                </tr>
                            ) : (
                                recentReadings.map((reading) => (
                                    <tr key={reading.id} className="border-b border-[#f4f9f5] hover:bg-[#f4f9f5]/50 transition-colors">
                                        <td className="py-3 font-medium text-[#152815]">{formatTime(reading.recorded_at)}</td>
                                        <td className="py-3 font-heading font-medium text-[#152815]">{reading.weight_grams.toFixed(2)}</td>
                                        <td className="py-3 text-center font-black text-[#2e7d32]">{reading.egg_count || 1}</td>
                                        <td className="py-3">
                                            <span
                                                className="px-2.5 py-1 rounded text-xs font-bold tracking-wider uppercase"
                                                style={{
                                                    backgroundColor: `${GRADE_COLORS[reading.grade]}20`, // 20% opacity background
                                                    color: GRADE_COLORS[reading.grade]
                                                }}
                                            >
                                                {reading.grade}
                                            </span>
                                        </td>
                                        <td className="py-3 text-[#152815]/60">{reading.source || "System"}</td>
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
