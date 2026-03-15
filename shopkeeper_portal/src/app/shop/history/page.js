"use client";

import { useState, useEffect } from "react";
import { useShop } from "@/components/ShopProvider";
import { supabase } from "@/lib/supabase";
import { History, Search, Download, Package } from "lucide-react";

export default function HistoryPage() {
    const { shop } = useShop();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from("orders")
                .select("*")
                .eq("shop_id", shop.id)
                .order("created_at", { ascending: false });

            setOrders(data || []);
            setLoading(false);
        }
        if (shop) load();
    }, [shop]);

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusColor = (status) => {
        if (status === 'pending') return 'bg-orange-50 text-orange-600 border-orange-200';
        if (status === 'confirmed') return 'bg-blue-50 text-blue-600 border-blue-200';
        if (status === 'shipped') return 'bg-green-50 text-green-600 border-green-200';
        return 'bg-gray-50 text-gray-500 border-gray-200';
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-primary/40 font-bold uppercase tracking-widest text-xs">Loading ledger...</div>;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-heading font-bold text-[#152815]">Order History</h2>
                <p className="text-[#152815]/60 font-medium">Examine your past requests and delivery tracking.</p>
            </div>

            <div className="bg-white border border-[#c8e6c9] rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-[#f4f9f5] p-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#c8e6c9]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white border border-[#c8e6c9] rounded-xl"><History className="w-5 h-5 text-[#2e7d32]" /></div>
                        <h3 className="font-heading font-bold text-[#152815] text-lg">Historical Log</h3>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#c8e6c9] rounded-xl text-[#2e7d32] font-semibold text-xs hover:bg-[#f4f9f5] transition-colors shadow-sm">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="text-[#152815]/60 text-[10px] font-bold uppercase tracking-wider bg-[#f4f9f5]/50">
                                <th className="py-5 px-6 border-b border-[#c8e6c9]">Ref ID</th>
                                <th className="py-5 px-6 border-b border-[#c8e6c9]">Grade</th>
                                <th className="py-5 px-6 border-b border-[#c8e6c9]">Quantity (EGGS)</th>
                                <th className="py-5 px-6 border-b border-[#c8e6c9]">Date Ordered</th>
                                <th className="py-5 px-6 border-b border-[#c8e6c9] text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-16 text-center opacity-50 font-medium text-sm">No orders found in history</td>
                                </tr>
                            ) : (
                                orders.map((o) => (
                                    <tr key={o.id} className="group hover:bg-[#f4f9f5]/50 transition-colors border-b border-[#c8e6c9]/50 last:border-0">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-[#f4f9f5] border border-[#c8e6c9]/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Package className="w-4 h-4 text-[#2e7d32]" /></div>
                                                <span className="font-semibold text-[#152815]/70">#{o.id.substring(0, 6).toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${o.grade === 'market' ? 'bg-amber-50 text-amber-600 border-amber-200' : o.grade === 'retail' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                                {o.grade}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 font-bold text-[#152815] text-lg">
                                            {Math.floor(o.quantity_kg).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-[#152815]/60 font-medium text-sm">
                                            {formatDate(o.created_at)}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColor(o.status)}`}>
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
