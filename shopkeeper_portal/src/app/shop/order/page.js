"use client";

import { useState, useEffect } from "react";
import { useShop } from "@/components/ShopProvider";
import { getGradeAvailability, getOrderHistory, placeOrder, getPrices } from "./actions";
import { ShoppingBag, Loader2, CheckCircle, AlertCircle, Calendar, MessageSquare, History, Package, TrendingUp, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OrderPage() {
    const { shop } = useShop();
    const searchParams = useSearchParams();

    // Form State
    const [grade, setGrade] = useState("retail");
    const [quantity, setQuantity] = useState("");
    const [deliveryDate, setDeliveryDate] = useState("");
    const [notes, setNotes] = useState("");

    // UI State
    const [availableKg, setAvailableKg] = useState(0);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [prices, setPrices] = useState({ market: 0, retail: 0, powder: 0 });
    const [priceWarning, setPriceWarning] = useState(null);

    // 1. Minimum Delivery Date (Tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDateStr = tomorrow.toISOString().split("T")[0];

    // 2. Initial Setup
    useEffect(() => {
        const preSelected = searchParams.get("grade");
        if (preSelected && ["market", "retail", "powder"].includes(preSelected)) {
            setGrade(preSelected);
        }

        if (shop?.shop_id) {
            loadHistory();
            loadPrices();
        }

        const priceChannel = supabase
            .channel('order-price-updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', table: 'egg_prices' },
                (payload) => {
                    const updated = payload.new;
                    setPrices(prev => ({ ...prev, [updated.grade]: updated.price_per_egg }));

                    if (grade === updated.grade) {
                        setPriceWarning(`⚠️ Price just updated for ${updated.grade.toUpperCase()}. Your estimated total has been recalculated.`);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(priceChannel);
        };
    }, [searchParams, shop?.id, grade]);

    async function loadPrices() {
        const p = await getPrices();
        if (p) {
            setPrices(p);
        }
    }

    // 3. Fetch Availability on Grade Change
    useEffect(() => {
        async function fetchStock() {
            setLoadingAvailability(true);
            const stock = await getGradeAvailability(grade);
            setAvailableKg(stock);
            setLoadingAvailability(false);
        }
        fetchStock();
    }, [grade]);

    async function loadHistory() {
        if (!shop?.shop_id) return;
        setLoadingHistory(true);
        const data = await getOrderHistory(shop.shop_id);
        setHistory(data || []);
        setLoadingHistory(false);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!quantity || parseFloat(quantity) <= 0) return;

        setSubmitting(true);
        setError("");

        try {
            await placeOrder({
                shopId: shop.shop_id,
                shopName: shop.real_shop_name || shop.shop_name,
                grade,
                quantityKg: parseFloat(quantity),
                deliveryDate,
                notes
            });

            setSuccess(true);
            setQuantity("");
            setDeliveryDate("");
            setNotes("");
            loadHistory();

            setTimeout(() => setSuccess(false), 5000);
        } catch (err) {
            setError(err.message || "Failed to place order. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const isInvalid = !quantity || parseFloat(quantity) <= 0 || !deliveryDate;

    return (
        <div className="flex flex-col gap-10 max-w-6xl mx-auto pb-10">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between border-b border-[#c8e6c9]/50 pb-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-3xl font-heading font-bold text-[#152815] tracking-tight">New Requisition</h2>
                    <p className="text-sm text-[#152815]/60 font-medium">Select inventory and schedule delivery.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

                {/* ORDER FORM (Left Column) */}
                <div className="lg:col-span-3">
                    {priceWarning && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl shadow-sm flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-3 text-sm font-semibold leading-relaxed whitespace-pre-wrap">
                                {priceWarning}
                            </div>
                            <button onClick={() => setPriceWarning(null)} className="p-2 rounded-lg hover:bg-amber-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                    <div className="bg-white border border-[#c8e6c9] rounded-2xl shadow-sm p-8 lg:p-10">
                        {success ? (
                            <div className="py-12 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-[#d7ecd7] text-[#2e7d32] rounded-full flex items-center justify-center mb-6 shadow-sm">
                                    <CheckCircle className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-bold text-[#152815] mb-2">Requisition Logged</h3>
                                <p className="text-[#152815]/60 mb-8">System has received your order and it is pending approval.</p>
                                <button
                                    onClick={() => setSuccess(false)}
                                    className="px-8 py-3 bg-[#f4f9f5] border border-[#c8e6c9] text-[#2e7d32] font-semibold rounded-xl hover:bg-[#2e7d32] hover:text-white hover:shadow-md transition-all"
                                >
                                    Initiate New Requisition
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="flex flex-col gap-8">

                                {/* Grade Selection */}
                                <div className="flex flex-col gap-4">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">01 / Subject Grade</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {[
                                            { id: 'market', name: 'Market', weight: '< 50g' },
                                            { id: 'retail', name: 'Retail', weight: '50-60g' },
                                            { id: 'powder', name: 'Powder', weight: '> 60g' },
                                        ].map((g) => (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => setGrade(g.id)}
                                                className={`flex flex-col items-center p-4 border rounded-2xl transition-all relative ${grade === g.id
                                                    ? `bg-[#f4f9f5] border-[#2e7d32] text-[#2e7d32] shadow-sm ring-1 ring-[#2e7d32]`
                                                    : 'bg-white border-[#c8e6c9] text-[#152815]/60 hover:border-[#2e7d32]/50 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span className="text-base font-bold tracking-wide">{g.name}</span>
                                                <span className="text-[11px] font-medium opacity-70 mt-1">{g.weight}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 text-[#2e7d32] bg-[#f4f9f5] border border-[#c8e6c9] px-3 py-1.5 rounded-lg w-fit text-xs font-semibold shadow-sm">
                                        <TrendingUp className="w-4 h-4" />
                                        Index Rate: <span className="underline underline-offset-2">₹{prices[grade]?.toFixed(2) || "0.00"} / EGG</span>
                                    </div>
                                </div>

                                {/* Quantity Block */}
                                <div className="flex flex-col gap-3 mt-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">02 / Volume (EGGS)</label>
                                        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#152815]/70 bg-[#f4f9f5] px-2 py-1 rounded-md">
                                            {loadingAvailability ? <Loader2 className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
                                            Available Cap: <span className="text-[#2e7d32] font-bold">{Math.floor(availableKg).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="1"
                                            min="1"
                                            required
                                            placeholder="150"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            className={`w-full text-2xl font-bold py-4 pl-5 pr-20 bg-white border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 shadow-sm ${parseFloat(quantity) > availableKg
                                                ? 'border-amber-400 bg-amber-50/30'
                                                : ''
                                                }`}
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold opacity-40 pointer-events-none">EGGS</span>
                                    </div>
                                    {parseFloat(quantity) > availableKg && (
                                        <div className="flex items-start gap-2 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium px-4 py-3 rounded-lg mt-1 animate-in slide-in-from-top-1">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <span><strong>Backorder Notice:</strong> Requested volume ({quantity}) exceeds current available stock ({Math.floor(availableKg).toLocaleString()}). Fulfillment will be delayed.</span>
                                        </div>
                                    )}

                                    {/* ORDER TOTAL SECTION */}
                                    {parseFloat(quantity) > 0 && (
                                        <div className="mt-4 p-5 bg-[#f4f9f5] border border-[#c8e6c9] rounded-xl shadow-sm space-y-3">
                                            <div className="flex items-center justify-between border-b border-[#c8e6c9]/50 pb-2">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Projection</span>
                                                <span className="flex items-center gap-1 text-xs font-semibold text-[#152815]/70"><TrendingUp className="w-3 h-3" /> Computation</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-[#152815] text-lg">
                                                    {quantity} <span className="opacity-40 mx-1">×</span> ₹{prices[grade]?.toFixed(2)}
                                                </span>
                                                <span className="text-[#2e7d32] font-black text-3xl tracking-tight">
                                                    ₹{(parseFloat(quantity) * (prices[grade] || 0)).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                                    {/* Delivery Date */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">03 / Date Target</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#152815]/40 pointer-events-none" />
                                            <input
                                                type="date"
                                                min={minDateStr}
                                                required
                                                value={deliveryDate}
                                                onChange={(e) => setDeliveryDate(e.target.value)}
                                                className="w-full pl-12 py-3.5 bg-white border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-sm font-medium shadow-sm text-[#152815]"
                                            />
                                        </div>
                                    </div>

                                    {/* Special Notes */}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">04 / Notes</label>
                                        <div className="relative">
                                            <MessageSquare className="absolute left-4 top-[1.15rem] w-4 h-4 text-[#152815]/40 pointer-events-none" />
                                            <textarea
                                                rows="1"
                                                placeholder="Optional delivery details..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="w-full pl-11 py-[13px] bg-white border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 resize-none text-sm shadow-sm text-[#152815]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold rounded-lg shadow-sm mt-2">
                                        Error: {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting || isInvalid}
                                    className="bg-[#2e7d32] hover:bg-[#1b5e20] text-white py-4 mt-6 rounded-xl font-bold tracking-wide transition-colors flex items-center justify-center gap-3 text-lg shadow-sm disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                        <>
                                            <ShoppingBag className="w-5 h-5" />
                                            Submit Requisition
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* GUIDELINES & CONTEXT (Right Column) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-[#152815] text-white p-8 rounded-2xl shadow-sm flex flex-col gap-6">
                        <h3 className="font-heading font-bold text-2xl tracking-tight">Receipt Draft</h3>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Grade</span>
                                <span className="font-bold uppercase tracking-widest">{grade}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Volume</span>
                                <span className="font-bold uppercase tracking-wider">{quantity || "0"} EGGS</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Target Date</span>
                                <span className="font-bold tracking-wide">{deliveryDate || "Not Set"}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 mt-2 bg-[#1b3d1b] border border-[#2e7d32]/30 rounded-xl shadow-sm">
                            <div className="p-1.5 bg-[#2e7d32]/20 text-[#c8e6c9] rounded-lg shrink-0"><AlertCircle className="w-5 h-5" /></div>
                            <p className="text-[11px] font-medium leading-relaxed text-[#c8e6c9] mt-0.5">
                                Prices are subject to final sync on delivery. Validations pass to pending fulfillment queue for admin review.
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* ORDER HISTORY LEDGER */}
            <div className="flex flex-col gap-5 mt-8 border-t border-[#c8e6c9]/50 pt-10">
                <div className="flex items-center gap-3 pb-2">
                    <div className="p-2 bg-[#f4f9f5] text-[#2e7d32] border border-[#c8e6c9] rounded-xl"><History className="w-6 h-6" /></div>
                    <h3 className="font-heading font-bold text-2xl text-[#152815] tracking-tight">Recent Orders</h3>
                    <span className="text-[10px] bg-white text-[#152815]/60 font-black px-2 py-1 uppercase tracking-widest rounded-full ml-auto border border-[#c8e6c9]">Recent 20</span>
                </div>

                <div className="bg-white border border-[#c8e6c9] rounded-2xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
                        <thead className="bg-[#f4f9f5] text-[#152815]/60 border-b border-[#c8e6c9]">
                            <tr className="text-[10px] font-bold uppercase tracking-wider">
                                <th className="py-4 px-6">Log Date</th>
                                <th className="py-4 px-6">Class</th>
                                <th className="py-4 px-6 text-center">Count (EGGS)</th>
                                <th className="py-4 px-6">Params</th>
                                <th className="py-4 px-6 text-right">State</th>
                            </tr>
                        </thead>
                        <tbody className="text-[#152815]">
                            {loadingHistory ? (
                                <tr><td colSpan="5" className="py-12 p-10 text-center animate-pulse text-[#152815]/50 text-sm font-semibold uppercase tracking-widest">Loading history...</td></tr>
                            ) : history.length === 0 ? (
                                <tr><td colSpan="5" className="py-16 text-center opacity-50 font-semibold text-lg uppercase tracking-wide">No Records Found</td></tr>
                            ) : (
                                history.map((o) => (
                                    <tr key={o.id} className="hover:bg-[#f4f9f5]/50 transition-colors border-b border-[#c8e6c9]/30 last:border-b-0">
                                        <td className="py-4 px-6 font-medium text-sm text-[#152815]/70">
                                            {new Date(o.created_at).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${o.grade === 'market' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                o.grade === 'retail' ? 'bg-green-50 text-green-600 border-green-200' :
                                                    'bg-blue-50 text-blue-600 border-blue-200'
                                                }`}>
                                                {o.grade}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center font-bold text-lg">
                                            {Math.floor(o.quantity_kg).toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 max-w-[200px] truncate text-[#152815]/50 text-xs italic">
                                            {o.notes || "No notes"}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${o.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-200' :
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
