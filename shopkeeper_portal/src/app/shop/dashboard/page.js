"use client";

import { useState, useEffect } from "react";
import { useShop } from "@/components/ShopProvider";
import { supabase } from "@/lib/supabase";
import { getDashboardData } from "./actions";
import { ShoppingBag, Package, TrendingUp, Clock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
    const { shop } = useShop();
    const [data, setData] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [toast, setToast] = useState(null);
    const [highlightedGrade, setHighlightedGrade] = useState(null);

    const loadData = async () => {
        if (!shop?.shop_id) return;
        const result = await getDashboardData(shop.shop_id);
        if (result) {
            setData(result);
            setLastUpdated(new Date());
        }
    };

    useEffect(() => {
        if (shop?.id) {
            loadData();

            // Realtime subscription to egg_readings for stock/production updates
            const channel = supabase
                .channel('dashboard-updates')
                .on(
                    'postgres_changes',
                    { event: '*', table: 'egg_readings' },
                    () => {
                        loadData();
                    }
                )
                .subscribe();

            // Realtime subscription to egg_prices
            const priceChannel = supabase
                .channel('price-updates')
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', table: 'egg_prices' },
                    (payload) => {
                        const updatedPrice = payload.new;
                        setData(prev => ({
                            ...prev,
                            prices: {
                                ...prev.prices,
                                [updatedPrice.grade]: {
                                    price: updatedPrice.price_per_egg,
                                    updated_at: updatedPrice.updated_at
                                }
                            }
                        }));

                        setHighlightedGrade(updatedPrice.grade);
                        setToast({
                            message: `Price Update: ${updatedPrice.grade.toUpperCase()} is now ₹${updatedPrice.price_per_egg}/egg`,
                            type: 'success'
                        });

                        setTimeout(() => setHighlightedGrade(null), 1000);
                        setTimeout(() => setToast(null), 5000);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
                supabase.removeChannel(priceChannel);
            };
        }
    }, [shop?.id]);

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="relative">
                    <Loader2 className="w-8 h-8 text-primary animate-spin opacity-20" />
                    <Loader2 className="w-8 h-8 text-primary animate-spin absolute inset-0" style={{ animationDirection: 'reverse' }} />
                </div>
                <div className="text-primary/40 animate-pulse font-black uppercase tracking-[0.3em] text-[10px]">
                    EGG TRACK
                </div>
            </div>
        );
    }

    const availabilityCards = [
        { grade: 'market', name: 'Market Grade', color: 'bg-white text-[#152815] border-[#c8e6c9]', btnClass: 'bg-[#f4f9f5] text-[#2e7d32] border-transparent hover:bg-[#2e7d32] hover:text-white transition-all', iconColor: 'text-amber-500 bg-amber-50' },
        { grade: 'retail', name: 'Retail Grade', color: 'bg-white text-[#152815] border-[#c8e6c9]', btnClass: 'bg-[#f4f9f5] text-[#2e7d32] border-transparent hover:bg-[#2e7d32] hover:text-white transition-all', iconColor: 'text-green-600 bg-green-50' },
        { grade: 'powder', name: 'Powder Grade', color: 'bg-white text-[#152815] border-[#c8e6c9]', btnClass: 'bg-[#f4f9f5] text-[#2e7d32] border-transparent hover:bg-[#2e7d32] hover:text-white transition-all', iconColor: 'text-blue-500 bg-blue-50' },
    ];

    return (
        <div className="flex flex-col gap-10 pb-10">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-[#c8e6c9]/50 pb-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-heading font-bold text-[#152815] tracking-tight">Stock Dashboard</h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#c8e6c9] rounded-lg text-[#152815]/60 font-medium text-xs shadow-sm">
                    <Clock className="w-4 h-4" /> {lastUpdated.toLocaleTimeString()}
                </div>
            </div>

            {/* AVAILABILITY SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availabilityCards.map((card) => (
                    <div key={card.grade} className={`p-8 flex flex-col items-center text-center gap-6 rounded-2xl shadow-sm border ${card.color} transition-all hover:shadow-md`}>
                        <div className={`p-4 rounded-2xl ${card.iconColor}`}>
                            <Package className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#152815]/60 mb-1">{card.name}</h3>
                            <p className="text-4xl font-heading font-black text-[#152815]">
                                {Math.floor(data.availability[card.grade]).toLocaleString()} <span className="text-lg font-bold opacity-40 block mt-1 uppercase">EGGS</span>
                            </p>
                            <span className="text-xs font-medium mt-3 text-[#2e7d32] bg-[#d7ecd7]/40 rounded-full px-3 py-1 inline-block">Available to Order</span>
                        </div>
                        <Link
                            href={`/shop/order?grade=${card.grade}`}
                            className={`w-full py-3 mt-2 rounded-xl text-center font-bold text-sm tracking-wide border-2 ${card.btnClass}`}
                        >
                            Initiate Order
                        </Link>
                    </div>
                ))}
            </div>

            {/* CURRENT PRICES SECTION */}
            <div className="flex flex-col gap-5 mt-4">
                <div className="flex items-center justify-between border-b border-[#c8e6c9]/50 pb-4">
                    <h3 className="text-xl font-heading font-bold text-[#152815] tracking-tight">Current Exchange Rates</h3>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#2e7d32] bg-[#f4f9f5] border border-[#c8e6c9] rounded-full px-3 py-1 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-[#2e7d32] animate-pulse"></span>
                        Live
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[
                        { grade: 'market', label: 'Market' },
                        { grade: 'retail', label: 'Retail' },
                        { grade: 'powder', label: 'Powder' },
                    ].map((p) => {
                        const priceData = data.prices[p.grade];
                        const price = priceData?.price || 0;
                        const updatedAt = new Date(priceData?.updated_at || Date.now());
                        const isRecentlyUpdated = (new Date() - updatedAt) < 3600000;
                        const timeAgo = Math.floor((new Date() - updatedAt) / 60000);

                        return (
                            <div
                                key={p.grade}
                                className={`p-6 rounded-2xl border border-[#c8e6c9] shadow-sm flex flex-col gap-2 transition-all duration-500 bg-white ${highlightedGrade === p.grade ? 'bg-[#d7ecd7]/30 ring-2 ring-[#2e7d32] -translate-y-1' : ''}`}
                            >
                                <div className="flex items-center justify-between border-b border-[#c8e6c9]/30 pb-3">
                                    <span className="text-xs font-bold uppercase tracking-widest text-[#152815]/70">{p.label} Grade</span>
                                    {isRecentlyUpdated && (
                                        <div className="flex items-center gap-1.5 bg-[#f4f9f5] text-[#2e7d32] border border-[#c8e6c9] rounded-full px-2 py-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d32] animate-ping"></span>
                                            <span className="text-[9px] font-bold uppercase">Fresh</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <p className="text-3xl font-heading font-black text-[#152815] tracking-tight">₹{price.toFixed(2)}</p>
                                    <span className="text-sm font-semibold text-[#152815]/40">/ EGG</span>
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#152815]/40 mt-1">
                                    Sync: {timeAgo < 1 ? 'Just now' : `${timeAgo} min${timeAgo === 1 ? '' : 's'} ago`}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-[#152815] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <span className="text-sm font-bold tracking-wide">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* RECENT ORDERS TABLE */}
            <div className="flex flex-col gap-5 mt-6 border-t border-[#c8e6c9]/50 pt-10">
                <div className="flex items-center justify-between border-b border-[#c8e6c9]/50 pb-4">
                    <h3 className="text-xl font-heading font-bold text-[#152815] tracking-tight">Recent Requisitions</h3>
                    <Link href="/shop/history" className="bg-white border border-[#c8e6c9] text-[#2e7d32] px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#f4f9f5] hover:shadow-sm transition-all flex items-center gap-2">
                        View Ledger <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="bg-white border border-[#c8e6c9] rounded-2xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[500px]">
                        <thead className="border-b border-[#c8e6c9] bg-[#f4f9f5] text-[#152815]/60">
                            <tr className="text-[10px] uppercase font-bold tracking-[0.1em]">
                                <th className="py-4 px-6">Ref</th>
                                <th className="py-4 px-6">Grade</th>
                                <th className="py-4 px-6">Qty (EGGS)</th>
                                <th className="py-4 px-6 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-[#152815]">
                            {data.recentOrders.length === 0 ? (
                                <tr><td colSpan="4" className="py-12 text-center uppercase font-bold tracking-widest text-[#152815]/30 text-xs">Empty Ledger</td></tr>
                            ) : (
                                data.recentOrders.map((o) => (
                                    <tr key={o.id} className="border-b border-[#c8e6c9]/30 last:border-0 hover:bg-[#f4f9f5]/50 transition-colors">
                                        <td className="py-4 px-6 font-semibold opacity-70">#{o.id.substring(0, 6).toUpperCase()}</td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${o.grade === 'market' ? 'bg-amber-50 text-amber-600 border border-amber-200' : o.grade === 'retail' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                                                {o.grade}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 font-bold">{Math.floor(o.quantity_kg).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-right">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${o.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                o.status === 'confirmed' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                    'bg-green-50 text-green-600 border-green-200'
                                                }`}>
                                                {o.status}
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
    );
}
