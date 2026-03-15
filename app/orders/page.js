"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Package, CheckCircle2, Truck, Info, X } from "lucide-react";
import { getOrders, updateOrderStatus, getAvailableStock, getProductionNotifications, markNotificationAsRead } from "./actions";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { useToast } from "@/components/ui/use-toast";

const GRADE_COLORS = {
    market: "#eab308", // Yellow
    retail: "#2e7d32", // Green
    powder: "#3b82f6", // Blue
};

export default function OrdersPage() {
    const { toast } = useToast();

    const [orders, setOrders] = useState([]);
    const [stock, setStock] = useState({ market: 0, retail: 0, powder: 0 });
    const [notifications, setNotifications] = useState([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null); // For details modal
    const [isProcessing, setIsProcessing] = useState(false);

    // Initial Data Fetch
    const fetchData = useCallback(async () => {
        const [fetchedOrders, fetchedStock, fetchedNotifs] = await Promise.all([
            getOrders(),
            getAvailableStock(),
            getProductionNotifications()
        ]);

        setOrders(fetchedOrders || []);
        setStock(fetchedStock || { market: 0, retail: 0, powder: 0 });
        setNotifications(fetchedNotifs || []);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Realtime Callbacks
    const handleOrderChange = useCallback(() => {
        // Re-fetch data to handle any stock/order syncs safely.
        fetchData();
    }, [fetchData]);

    const handleNewNotification = useCallback((newNotif) => {
        setNotifications(prev => [newNotif, ...prev].slice(0, 10)); // Keep top 10
        toast({
            title: "New Request",
            description: newNotif.message,
            className: "bg-[#2e7d32] text-white border-0"
        });
    }, [toast]);

    useOrdersRealtime(handleOrderChange, handleNewNotification);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleAction = async (orderId, currentStatus, nextStatus, grade, qty) => {
        setIsProcessing(true);
        const res = await updateOrderStatus(orderId, nextStatus, grade, qty);
        setIsProcessing(false);

        if (res?.error) {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        } else {
            toast({
                title: "Success",
                description: `Order ${orderId.slice(0, 6)} marked as ${nextStatus}.`,
                className: "bg-[#2e7d32] text-white border-0"
            });
            fetchData(); // Refresh UI instantly
        }
    };

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.is_read);
        for (const n of unread) {
            await markNotificationAsRead(n.id);
        }
        fetchData();
    };

    const formatDate = (isoString) => {
        if (!isoString) return "";
        return new Date(isoString).toLocaleString([], { month: "short", day: "numeric", hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col gap-8 pb-10 relative">

            {/* TOP NAVBAR / HEADER */}
            <div className="flex justify-between items-end gap-4 relative">
                <div className="flex flex-col gap-1">
                    <h1 className="text-4xl text-[#152815] tracking-tight">Order Management</h1>
                    <p className="text-[#152815]/60">Review requests, confirm inventory, and dispatch pallets.</p>
                </div>

                {/* NOTIFICATION BELL */}
                <div className="relative">
                    <button
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className={`p-3 rounded-xl border transition-colors relative ${isNotifOpen ? 'bg-[#f4f9f5] border-[#c8e6c9] ring-1 ring-[#2e7d32]/20' : 'bg-white border-[#c8e6c9]/60 hover:bg-[#f4f9f5]'} shadow-sm`}
                    >
                        <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-[#152815]' : 'text-[#152815]/40'}`} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {/* NOTIFICATION DROPDOWN */}
                    {isNotifOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-[1rem] shadow-xl border border-[#c8e6c9] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 bg-[#f4f9f5] border-b border-[#c8e6c9] flex justify-between items-center">
                                <h3 className="text-sm font-bold text-[#152815] uppercase tracking-widest">Alerts</h3>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-xs text-[#2e7d32] font-semibold hover:underline">Mark all read</button>
                                )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-6 text-center text-[#152815]/40 text-sm font-medium">No recent alerts.</div>
                                ) : (
                                    notifications.map(n => {
                                        const relatedOrder = orders.find(o => o.id === n.order_id);
                                        const isPending = relatedOrder && relatedOrder.status === 'pending';

                                        return (
                                            <div key={n.id} className={`p-4 border-b border-[#f4f9f5] text-sm flex flex-col gap-2 ${n.is_read ? 'opacity-60' : 'bg-white'}`}>
                                                <p className={`text-[#152815] font-medium ${n.is_read ? '' : 'font-semibold'}`}>{n.message}</p>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-[#152815]/40 mt-1">{formatDate(n.created_at)}</p>
                                                    {isPending && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <button
                                                                disabled={isProcessing}
                                                                onClick={() => { handleAction(relatedOrder.id, 'pending', 'cancelled', relatedOrder.grade, relatedOrder.quantity_kg); markNotificationAsRead(n.id); }}
                                                                className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                                                            >
                                                                Reject
                                                            </button>
                                                            <button
                                                                disabled={isProcessing}
                                                                onClick={() => { handleAction(relatedOrder.id, 'pending', 'confirmed', relatedOrder.grade, relatedOrder.quantity_kg); markNotificationAsRead(n.id); }}
                                                                className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold bg-[#f4f9f5] border border-[#c8e6c9] text-[#2e7d32] rounded-md hover:bg-[#d7ecd7]"
                                                            >
                                                                Approve
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                {/* MAIN ORDERS TABLE (COL 1-3) */}
                <div className="lg:col-span-3 bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col">
                    <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest mb-6">Active Vendor Requests</h3>

                    <div className="overflow-x-auto border border-[#c8e6c9]/60 rounded-xl">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#f4f9f5]">
                                <tr className="text-[#152815]/70 text-xs tracking-wider uppercase">
                                    <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Order ID</th>
                                    <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Shop</th>
                                    <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Grade</th>
                                    <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Qty (EGGS)</th>
                                    <th className="py-4 px-4 font-bold border-b border-[#c8e6c9]">Status</th>
                                    <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-8 text-center text-[#152815]/40 font-medium">No active orders found.</td>
                                    </tr>
                                ) : (
                                    orders.map((o) => (
                                        <tr key={o.id} className="border-b border-[#f4f9f5] hover:bg-[#f4f9f5]/50 transition-colors group">
                                            <td className="py-3 px-4 font-heading font-semibold text-[#152815]">{o.id.split("-")[0].toUpperCase()}</td>
                                            <td className="py-3 px-4 text-[#152815]/80 font-medium">{o.shop_name}</td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase"
                                                    style={{ backgroundColor: `${GRADE_COLORS[o.grade]}20`, color: GRADE_COLORS[o.grade] }}
                                                >
                                                    {o.grade}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-heading font-medium text-[#152815]">{o.quantity_kg.toFixed(0)}</td>
                                            <td className="py-3 px-4">
                                                {o.status === "pending" && <span className="flex items-center gap-1.5 text-xs font-bold text-[#eab308] bg-[#eab308]/10 px-2.5 py-1 rounded-md w-fit"><Package className="w-3.5 h-3.5" /> Pending</span>}
                                                {o.status === "confirmed" && <span className="flex items-center gap-1.5 text-xs font-bold text-[#3b82f6] bg-[#3b82f6]/10 px-2.5 py-1 rounded-md w-fit"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>}
                                                {o.status === "shipped" && <span className="flex items-center gap-1.5 text-xs font-bold text-[#2e7d32] bg-[#2e7d32]/10 px-2.5 py-1 rounded-md w-fit"><Truck className="w-3.5 h-3.5" /> Shipped</span>}
                                                {o.status === "cancelled" && <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md w-fit"><X className="w-3.5 h-3.5" /> Rejected</span>}
                                            </td>
                                            <td className="py-3 px-4 flex items-center justify-end gap-2">
                                                {o.status === "pending" && (
                                                    <>
                                                        <button
                                                            disabled={isProcessing}
                                                            onClick={() => handleAction(o.id, o.status, "confirmed", o.grade, o.quantity_kg)}
                                                            className="px-3 py-1.5 text-xs bg-[#f4f9f5] border border-[#c8e6c9] text-[#2e7d32] font-semibold rounded-lg hover:bg-[#d7ecd7] transition-colors disabled:opacity-50"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            disabled={isProcessing}
                                                            onClick={() => handleAction(o.id, o.status, "cancelled", o.grade, o.quantity_kg)}
                                                            className="px-3 py-1.5 text-xs bg-red-50 border border-red-200 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {o.status === "confirmed" && (
                                                    <button
                                                        disabled={isProcessing}
                                                        onClick={() => handleAction(o.id, o.status, "shipped", o.grade, o.quantity_kg)}
                                                        className="px-3 py-1.5 text-xs bg-[#2e7d32] text-white font-semibold rounded-lg hover:bg-[#1b431d] transition-colors shadow-sm disabled:opacity-50"
                                                    >
                                                        Ship
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setSelectedOrder(o)}
                                                    className="p-1.5 text-[#152815]/40 hover:text-[#152815] transition-colors rounded-lg hover:bg-black/5"
                                                >
                                                    <Info className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* STOCK AVAILABILITY PANEL (COL 4) */}
                <div className="lg:col-span-1 flex flex-col gap-6 animate-in slide-in-from-right-4">
                    <div className="bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5">
                        <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest mb-6">Available Inventory</h3>

                        <div className="flex flex-col gap-4">
                            {/* Market */}
                            <div className="flex flex-col gap-2 relative">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-[#152815] uppercase tracking-wider flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GRADE_COLORS.market }}></div> Market
                                    </span>
                                    <span className="font-heading font-bold text-2xl text-[#152815]">{(stock.market || 0).toLocaleString()} <span className="text-sm text-[#152815]/40">EGGS</span></span>
                                </div>
                                <div className="w-full bg-[#f4f9f5] h-2 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: GRADE_COLORS.market }}></div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-[#c8e6c9]/40 my-1"></div>

                            {/* Retail */}
                            <div className="flex flex-col gap-2 relative">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-[#152815] uppercase tracking-wider flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GRADE_COLORS.retail }}></div> Retail
                                    </span>
                                    <span className="font-heading font-bold text-2xl text-[#152815]">{(stock.retail || 0).toLocaleString()} <span className="text-sm text-[#152815]/40">EGGS</span></span>
                                </div>
                                <div className="w-full bg-[#f4f9f5] h-2 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: GRADE_COLORS.retail }}></div>
                                </div>
                            </div>

                            <div className="w-full h-px bg-[#c8e6c9]/40 my-1"></div>

                            {/* Powder */}
                            <div className="flex flex-col gap-2 relative">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-[#152815] uppercase tracking-wider flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GRADE_COLORS.powder }}></div> Powder
                                    </span>
                                    <span className="font-heading font-bold text-2xl text-[#152815]">{(stock.powder || 0).toLocaleString()} <span className="text-sm text-[#152815]/40">EGGS</span></span>
                                </div>
                                <div className="w-full bg-[#f4f9f5] h-2 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: GRADE_COLORS.powder }}></div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-[#152815]/40 text-center font-medium mt-6">
                            Calculated dynamically from live production readings minus confirmed allocations.
                        </p>
                    </div>
                </div>

            </div>

            {/* DETAILS MODAL OVERLAY */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-[#152815]/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-[#c8e6c9] overflow-hidden">
                        <div className="p-4 bg-[#f4f9f5] border-b border-[#c8e6c9] flex justify-between items-center">
                            <h3 className="font-bold text-[#152815]">Order Details</h3>
                            <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-[#d7ecd7]/50 rounded-lg text-[#152815]/50 hover:text-[#152815]"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#152815]/50">Order ID</span>
                                    <span className="font-medium text-[#152815]">{selectedOrder.id}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#152815]/50">Status</span>
                                    <span className="uppercase text-xs font-bold mt-1" style={{ color: selectedOrder.status === 'pending' ? '#eab308' : selectedOrder.status === 'confirmed' ? '#3b82f6' : selectedOrder.status === 'cancelled' ? '#dc2626' : '#2e7d32' }}>
                                        {selectedOrder.status === 'confirmed' ? 'APPROVED' : selectedOrder.status}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-[#f4f9f5] p-4 rounded-xl border border-[#c8e6c9]/50 flex justify-between items-center my-2">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#152815]/50 mb-1">Target Grade</span>
                                    <span
                                        className="px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase w-fit"
                                        style={{ backgroundColor: `${GRADE_COLORS[selectedOrder.grade]}20`, color: GRADE_COLORS[selectedOrder.grade] }}
                                    >
                                        {selectedOrder.grade}
                                    </span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#152815]/50 mb-1">Quantity Requested</span>
                                    <span className="font-heading font-bold text-2xl text-[#152815]">{selectedOrder.quantity_kg.toFixed(0)}<span className="text-sm ml-1 text-[#152815]/50">EGGS</span></span>
                                </div>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#152815]/50">Customer</span>
                                <span className="font-medium text-[#152815]">{selectedOrder.shop_name}</span>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase tracking-wider text-[#152815]/50">Timestamp</span>
                                <span className="font-medium text-[#152815]/70">{formatDate(selectedOrder.created_at)}</span>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
