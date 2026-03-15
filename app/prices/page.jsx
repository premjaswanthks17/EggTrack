"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getPrices, getPriceHistory, updatePrice, seedPrices } from "./actions";
import {
    TrendingUp,
    Edit2,
    Save,
    X,
    History,
    IndianRupee,
    Loader2,
    AlertCircle,
    Clock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function PricingPage() {
    const { toast } = useToast();
    const [prices, setPrices] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingGrade, setEditingGrade] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchData = async () => {
        const [p, h] = await Promise.all([getPrices(), getPriceHistory()]);
        setPrices(p);
        setHistory(h);
        setLoading(false);
        setLastUpdated(new Date());
    };

    useEffect(() => {
        fetchData();

        // Subscribe to both egg_prices for live card updates 
        // and egg_price_history for the audit log
        const channel = supabase
            .channel("pricing-updates")
            .on(
                "postgres_changes",
                { event: "UPDATE", table: "egg_prices" },
                (payload) => {
                    setPrices((current) =>
                        current.map((p) =>
                            p.grade === payload.new.grade ? { ...p, ...payload.new } : p
                        )
                    );
                    setLastUpdated(new Date());
                }
            )
            .on(
                "postgres_changes",
                { event: "INSERT", table: "egg_price_history" },
                () => {
                    getPriceHistory().then(setHistory);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleEdit = (price) => {
        setEditingGrade(price.grade);
        setEditValue(price.price_per_egg.toString());
    };

    const handleSave = async (grade) => {
        if (!editValue || isNaN(parseFloat(editValue))) return;

        try {
            await updatePrice(grade, parseFloat(editValue));
            setEditingGrade(null);
            toast({
                title: "Price updated!",
                description: `${grade.charAt(0).toUpperCase() + grade.slice(1)} price changed to ₹${editValue}`,
            });
            fetchData();
        } catch (err) {
            toast({
                title: "Update failed",
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const handleSeed = async () => {
        try {
            setLoading(true);
            await seedPrices();
            toast({
                title: "Pricing Initialized",
                description: "Default prices have been set for all grades.",
            });
            fetchData();
        } catch (err) {
            toast({
                title: "Initialization failed",
                description: err.message,
                variant: "destructive",
            });
            setLoading(false);
        }
    };

    const getCardStyle = (grade) => {
        switch (grade) {
            case "market": return { bg: "bg-[#FFFDE7]", border: "border-[#F9A825]", text: "text-[#F9A825]", accent: "#F9A825" };
            case "retail": return { bg: "bg-[#F1F8E9]", border: "border-[#2E7D32]", text: "text-[#2E7D32]", accent: "#2E7D32" };
            case "powder": return { bg: "bg-[#E3F2FD]", border: "border-[#1565C0]", text: "text-[#1565C0]", accent: "#1565C0" };
            default: return { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500", accent: "#eee" };
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <Loader2 className="w-10 h-10 text-[#2e7d32] animate-spin mb-4" />
            <span className="text-sm font-black uppercase tracking-widest opacity-30">Loading Pricing...</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-10 max-w-6xl mx-auto">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-[#2e7d32]" />
                    <h1 className="text-4xl font-heading font-bold text-[#152815]">Live Egg Pricing</h1>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#152815]/50 px-1">
                    <Clock className="w-3.5 h-3.5" />
                    Last synced: {lastUpdated.toLocaleTimeString()}
                </div>
            </header>

            {/* PRICE CARDS */}
            {prices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    {prices.map((p) => {
                        const style = getCardStyle(p.grade);
                        const isEditing = editingGrade === p.grade;

                        return (
                            <div
                                key={p.grade}
                                className={`relative overflow-hidden group p-8 rounded-[2.5rem] border-2 transition-all duration-300 ${style.bg} ${style.border} ${isEditing ? 'ring-8 ring-[#152815]/5 scale-[1.02] shadow-2xl' : 'shadow-lg hover:shadow-xl hover:-translate-y-1'}`}
                            >
                                <div className="flex flex-col gap-6">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${style.text}`}>
                                            {p.grade} Grade
                                        </span>
                                        <div className={`p-2 rounded-xl bg-white/50 backdrop-blur-sm`}>
                                            <TrendingUp className={`w-4 h-4 ${style.text}`} />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <IndianRupee className={`w-8 h-8 ${style.text}`} />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-full bg-white border-2 border-[#152815]/10 rounded-[1.25rem] px-4 py-3 text-2xl font-black text-[#152815] focus:ring-4 focus:ring-[#152815]/5 outline-none"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                                <IndianRupee className={`w-8 h-8 ${style.text} opacity-50`} />
                                                <span className="text-6xl font-heading font-black text-[#152815] tracking-tighter">
                                                    {parseFloat(p.price_per_egg).toFixed(2)}
                                                </span>
                                                <span className="text-xs font-bold text-[#152815]/40 mt-auto mb-2 uppercase tracking-widest ml-1">/ EGG</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 mt-4">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={() => handleSave(p.grade)}
                                                    className="flex-1 bg-[#152815] text-white py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-lg active:scale-95"
                                                >
                                                    <Save className="w-4 h-4" /> Save
                                                </button>
                                                <button
                                                    onClick={() => setEditingGrade(null)}
                                                    className="p-4 border border-[#152815]/10 rounded-[1.25rem] hover:bg-white transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-[#152815]/50" />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => handleEdit(p)}
                                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest border-2 border-current transition-all hover:bg-white hover:scale-105 active:scale-95 ${style.text}`}
                                            >
                                                <Edit2 className="w-4 h-4" /> Update Price
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-[#152815]/10 gap-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-[#152815]/5 p-6 rounded-3xl">
                        <AlertCircle className="w-12 h-12 text-[#152815]/40" />
                    </div>
                    <div className="flex flex-col gap-2 max-w-sm">
                        <h3 className="text-2xl font-heading font-bold text-[#152815]">No Pricing Data Found</h3>
                        <p className="text-sm text-[#152815]/50 leading-relaxed font-medium">
                            It looks like your price catalogue is empty. Initialize the default prices for all egg grades to get started.
                        </p>
                    </div>
                    <button
                        onClick={handleSeed}
                        className="bg-[#2e7d32] text-white px-8 py-4 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-[#1b5e20] transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                    >
                        <Save className="w-4 h-4" /> Initialize Price Database
                    </button>
                </div>
            )}

            {/* AUDIT LOG */}
            <div className="flex flex-col gap-6 mt-6">
                <div className="flex items-center gap-3 px-2">
                    <div className="bg-[#152815]/5 p-2 rounded-xl">
                        <History className="w-6 h-6 text-[#152815]/60" />
                    </div>
                    <h2 className="text-3xl font-heading font-bold text-[#152815]">Audit Trail</h2>
                    <span className="text-[10px] bg-[#152815]/5 text-[#152815]/40 font-bold px-3 py-1 rounded-full uppercase tracking-widest ml-auto">Last 20 Changes</span>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-[#152815]/5 shadow-2xl overflow-hidden mb-20">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#fbfcff]">
                                <tr className="border-b border-gray-100">
                                    <th className="py-8 px-10 text-[10px] font-black uppercase tracking-[0.25em] text-[#152815]/40">Inventory Grade</th>
                                    <th className="py-8 px-10 text-[10px] font-black uppercase tracking-[0.25em] text-[#152815]/40">Previous Point</th>
                                    <th className="py-8 px-10 text-[10px] font-black uppercase tracking-[0.25em] text-[#152815]/40">New Value</th>
                                    <th className="py-8 px-10 text-[10px] font-black uppercase tracking-[0.25em] text-[#152815]/40">Adjustment Logged At</th>
                                    <th className="py-8 px-10 text-[10px] font-black uppercase tracking-[0.25em] text-[#152815]/40 text-right">Market Delta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 italic font-body">
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-20 text-center text-[#152815]/30 font-black uppercase tracking-[0.2em] text-[10px]">
                                            No pricing adjustments detected in ledger
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((h) => {
                                        const priceDiff = h.new_price - h.old_price;
                                        const isUp = priceDiff > 0;
                                        const isNeutral = priceDiff === 0;
                                        const style = getCardStyle(h.grade);

                                        return (
                                            <tr key={h.id} className="group hover:bg-[#E3F2FD]/20 transition-colors duration-200">
                                                <td className="py-7 px-10">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${style.bg} ${style.text} border ${style.border}/10`}>
                                                        {h.grade}
                                                    </span>
                                                </td>
                                                <td className="py-7 px-10 text-[#152815]/50 font-bold tracking-tight">₹{parseFloat(h.old_price).toFixed(2)}</td>
                                                <td className="py-7 px-10 font-heading font-black text-[#152815] text-xl tracking-tighter">₹{parseFloat(h.new_price).toFixed(2)}</td>
                                                <td className="py-7 px-10 text-[#152815]/40 text-[11px] font-bold">
                                                    {new Date(h.changed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-7 px-10 text-right">
                                                    <span className={`inline-flex items-center gap-1.5 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-2xl ${isNeutral ? 'bg-gray-100 text-gray-500' : isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                        {isNeutral ? 'NO CHANGE' : `${isUp ? '+' : ''}${priceDiff.toFixed(2)}`}
                                                        {!isNeutral && (isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5 rotate-180" />)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
