"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getProductionMetrics } from "./actions";
import { 
    Activity, 
    Box, 
    Package, 
    Clock, 
    TrendingUp, 
    AlertCircle, 
    RefreshCcw,
    ChevronRight,
    Search
} from "lucide-react";
import Link from "next/link";

const GRADE_COLORS = {
    market: "#eab308", // Yellow-500
    retail: "#2e7d32", // Forest Green
    powder: "#3b82f6", // Blue-500
};

export default function ProductionPage() {
    const [metrics, setMetrics] = useState({
        today: { count: 0, weight: 0 },
        grades: { market: 0, retail: 0, powder: 0 },
        recentReadings: [],
        batches: []
    });
    const [loading, setLoading] = useState(true);
    const [latestReading, setLatestReading] = useState(null);
    const [isFlashing, setIsFlashing] = useState(false);

    const fetchData = useCallback(async () => {
        const data = await getProductionMetrics();
        setMetrics(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Polling backup
    useEffect(() => {
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Realtime integration
    useEffect(() => {
        const channel = supabase
            .channel('production-updates')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'egg_readings' },
                (payload) => {
                    setLatestReading(payload.new);
                    setIsFlashing(true);
                    setTimeout(() => setIsFlashing(false), 1000);
                    fetchData(); // Refresh everything
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData]);

    const formatTime = (isoString) => {
        if (!isoString) return "";
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    if (loading && !metrics.recentReadings.length) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2e7d32]"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 pb-12">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl text-[#152815] tracking-tight font-bold">Production Hub</h1>
                    <p className="text-[#152815]/60 font-medium">Real-time conveyor monitoring and batch management.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#c8e6c9] text-[#2e7d32] font-semibold rounded-xl hover:bg-[#f4f9f5] transition-all shadow-sm"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Refresh Feed
                    </button>
                    <Link 
                        href="/manual-entry"
                        className="bg-[#2e7d32] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1b431d] shadow-sm transition-all"
                    >
                        <Activity className="w-4 h-4" />
                        Manual Entry
                    </Link>
                </div>
            </div>

            {/* LIVE STATUS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LIVE CONVEYOR FEED */}
                <div className="lg:col-span-1 bg-white rounded-3xl p-8 border border-[#c8e6c9] shadow-sm flex flex-col items-center justify-center relative overflow-hidden min-h-[400px]">
                    <div className="absolute top-6 left-6 flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#2e7d32] rounded-full animate-ping"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#152815]/40">Live Feed</span>
                    </div>

                    <div 
                        className={`w-52 h-52 rounded-full border-[8px] flex flex-col items-center justify-center transition-all duration-300 ${isFlashing ? 'scale-105 shadow-2xl' : 'shadow-lg'}`}
                        style={{ 
                            borderColor: latestReading ? GRADE_COLORS[latestReading.grade] : '#f4f9f5',
                            backgroundColor: latestReading ? `${GRADE_COLORS[latestReading.grade]}08` : '#ffffff'
                        }}
                    >
                        <span className="text-5xl font-heading font-black text-[#152815]">
                            {latestReading ? latestReading.weight_grams.toFixed(1) : "0.0"}
                        </span>
                        <span className="text-sm font-bold text-[#152815]/40 uppercase tracking-widest mt-1">grams</span>
                    </div>

                    <div className="mt-8 text-center flex flex-col gap-2">
                        {latestReading ? (
                            <>
                                <span 
                                    className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] text-white shadow-md inline-block"
                                    style={{ backgroundColor: GRADE_COLORS[latestReading.grade] }}
                                >
                                    {latestReading.grade} Grade
                                </span>
                                <p className="text-xs font-bold text-[#152815]/40 mt-1">
                                    Detected at {formatTime(latestReading.recorded_at)}
                                </p>
                            </>
                        ) : (
                            <span className="text-xs font-black text-[#152815]/30 uppercase tracking-widest bg-[#f4f9f5] px-4 py-2 rounded-full border border-[#c8e6c9]">Awaiting Signal...</span>
                        )}
                    </div>
                </div>

                {/* TODAY'S GRADING MIX */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-[#c8e6c9] shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#152815]/50">Today&apos;s Yield by Grade</h3>
                        <div className="text-right">
                            <p className="text-3xl font-heading font-black text-[#152815]">{metrics.today.count.toLocaleString()}</p>
                            <p className="text-[10px] font-bold text-[#152815]/40 uppercase tracking-widest">Total Produced</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
                        {Object.entries(metrics.grades).map(([grade, count]) => (
                            <div key={grade} className="p-6 rounded-2xl bg-[#f4f9f5]/50 border border-[#c8e6c9]/40 flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GRADE_COLORS[grade] }}></div>
                                    <span className="text-xs font-black uppercase tracking-wider text-[#152815]/60">{grade}</span>
                                </div>
                                <div>
                                    <p className="text-4xl font-heading font-black text-[#152815] mb-1">{count.toLocaleString()}</p>
                                    <div className="w-full bg-white h-1.5 rounded-full overflow-hidden border border-[#c8e6c9]/30">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{ 
                                                width: `${metrics.today.count > 0 ? (count / metrics.today.count) * 100 : 0}%`,
                                                backgroundColor: GRADE_COLORS[grade]
                                            }}
                                        ></div>
                                    </div>
                                    <p className="text-[10px] font-bold text-[#152815]/30 uppercase tracking-widest mt-2">
                                        {metrics.today.count > 0 ? ((count / metrics.today.count) * 100).toFixed(1) : 0}% of yield
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* ACTIVE BATCHES */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#152815]/50 flex items-center gap-2">
                            <Box className="w-4 h-4" /> Active Batches
                        </h3>
                        <button className="text-[10px] font-bold text-[#2e7d32] uppercase tracking-widest hover:underline">View All Batches</button>
                    </div>

                    <div className="flex flex-col gap-3">
                        {metrics.batches.length === 0 ? (
                            <div className="p-12 border border-dashed border-[#c8e6c9] rounded-2xl bg-[#f4f9f5]/30 text-center">
                                <p className="text-[#152815]/40 font-bold text-sm">No batch data recorded today.</p>
                            </div>
                        ) : (
                            metrics.batches.map((batch) => (
                                <div key={batch.id} className="bg-white p-5 rounded-2xl border border-[#c8e6c9] shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#f4f9f5] border border-[#c8e6c9] rounded-xl flex items-center justify-center text-[#2e7d32]">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-[#152815]">{batch.id}</span>
                                            <span className="text-[10px] font-bold text-[#152815]/40 uppercase tracking-widest">
                                                Active Since {formatTime(batch.lastSeen)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="font-heading font-black text-[#152815]">{batch.count.toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-[#152815]/40 uppercase tracking-widest">Eggs</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-[#152815]/20 group-hover:text-[#2e7d32] transition-colors" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* RECENT PRODUCTION LOG */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#152815]/50 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Recent Samples
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#152815]/40" />
                            <input 
                                type="text" 
                                placeholder="Search logs..." 
                                className="pl-9 pr-4 py-1.5 bg-[#f4f9f5] border border-[#c8e6c9] rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#2e7d32]/30 w-48"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#c8e6c9] shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-[#f4f9f5] border-b border-[#c8e6c9] text-[10px] font-black uppercase tracking-widest text-[#152815]/40">
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">Weight</th>
                                    <th className="px-6 py-4 text-center">Qty</th>
                                    <th className="px-6 py-4 text-right">Grade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f4f9f5]">
                                {metrics.recentReadings.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-[#152815]/30 font-bold uppercase tracking-widest text-xs">No logs found</td>
                                    </tr>
                                ) : (
                                    metrics.recentReadings.map((reading, i) => (
                                        <tr key={i} className="hover:bg-[#f4f9f5]/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-[#152815]/70">{formatTime(reading.recorded_at)}</td>
                                            <td className="px-6 py-4 font-heading font-black text-[#152815]">{reading.weight_grams.toFixed(2)}<span className="text-[10px] opacity-30 ml-0.5">g</span></td>
                                            <td className="px-6 py-4 text-center font-bold text-[#2e7d32]">{reading.egg_count || 1}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span 
                                                    className="px-2 py-0.5 rounded text-[10px] font-black underline underline-offset-4 decoration-2"
                                                    style={{ color: GRADE_COLORS[reading.grade], textDecorationColor: `${GRADE_COLORS[reading.grade]}30` }}
                                                >
                                                    {reading.grade}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex items-center gap-6 p-8 bg-[#152815] rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-full bg-white/5 skew-x-[-20deg] translate-x-32" />
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                    <AlertCircle className="w-8 h-8 text-green-400" />
                </div>
                <div className="flex flex-col flex-1">
                    <p className="font-heading font-black text-2xl leading-none uppercase tracking-tight">Export Production Logs</p>
                    <p className="text-white/60 text-sm font-medium mt-1">Generate ISO-compliant documentation for today&apos;s sorting activities.</p>
                </div>
                <button className="px-8 py-3 bg-white text-[#152815] font-black rounded-xl text-sm uppercase tracking-widest hover:bg-green-100 transition-all shadow-lg active:scale-95">
                    Download CSV
                </button>
            </div>
        </div>
    );
}
