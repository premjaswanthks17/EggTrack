"use client";

import { useState, useEffect } from "react";
import { useShop } from "@/components/ShopProvider";
import { supabase } from "@/lib/supabase";
import { getNotifications, markAsRead, markAllAsRead, getOrderDetails } from "./actions";
import { Bell, Clock, Inbox, CheckCircle, Truck, Package, X, Loader2, Filter } from "lucide-react";

export default function NotificationsPage() {
    const { shop } = useShop();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loadingOrder, setLoadingOrder] = useState(false);

    const fetchAndSetNotifications = async () => {
        if (!shop?.id) return;
        const data = await getNotifications(shop.id);
        setNotifications(data);
        setLoading(false);
    };

    useEffect(() => {
        if (!shop?.id) return;
        fetchAndSetNotifications();

        const channel = supabase
            .channel(`notifications-${shop.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    table: 'notifications',
                },
                (payload) => {
                    // Filter payload in the client if the server-side filter is too broad
                    // though the server-side filter SHOULD work, we double check here.
                    const newNotif = payload.new;
                    if (newNotif && newNotif.target === 'shopkeeper' && newNotif.shop_id === shop.id) {
                        fetchAndSetNotifications();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [shop?.id]);

    const handleNotificationClick = async (n) => {
        if (!n.is_read) {
            await markAsRead(n.id);
            fetchAndSetNotifications();
        }

        if (n.order_id) {
            setLoadingOrder(true);
            const order = await getOrderDetails(n.order_id);
            setSelectedOrder(order);
            setLoadingOrder(false);
        }
    };

    const handleMarkAllRead = async () => {
        if (!shop?.id) return;
        await markAllAsRead(shop.id);
        fetchAndSetNotifications();
    };

    const filteredNotifications = notifications.filter((n) => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.is_read;
        if (filter === "confirmed") return n.type === "confirmed";
        if (filter === "shipped") return n.type === "shipped";
        return true;
    });

    const getRelativeTime = (dateString) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return "Yesterday";
        return past.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getIcon = (type) => {
        switch (type) {
            case 'confirmed': return <CheckCircle className="w-5 h-5 text-blue-600" />;
            case 'shipped': return <Truck className="w-5 h-5 text-green-600" />;
            case 'new_order': return <Clock className="w-5 h-5 text-orange-600" />;
            default: return <Bell className="w-5 h-5 text-primary" />;
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-primary/40 font-bold uppercase tracking-widest text-xs">Loading alerts...</div>;

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-3xl font-heading font-bold text-[#152815]">Notifications</h2>
                    <p className="text-[#152815]/60 font-medium italic">Track your order updates and system alerts in real-time.</p>
                </div>
                <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-4 py-2.5 rounded-xl border border-primary/10 transition-all flex items-center gap-2"
                >
                    Mark All as Read
                </button>
            </div>

            {/* FILTER TABS */}
            <div className="flex items-center gap-2 bg-[#f4f9f5] p-1.5 rounded-2xl border border-[#c8e6c9] shadow-sm self-start">
                {["all", "unread", "confirmed", "shipped"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${filter === tab
                            ? "bg-white text-[#2e7d32] shadow-sm ring-1 ring-[#c8e6c9]"
                            : "text-[#152815]/50 hover:text-[#2e7d32] hover:bg-white/50"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* NOTIFICATIONS LIST */}
            <div className="flex flex-col gap-4">
                {filteredNotifications.length === 0 ? (
                    <div className="bg-white border border-[#c8e6c9] rounded-2xl py-20 flex flex-col items-center justify-center text-center opacity-50 gap-4 shadow-sm">
                        <Inbox className="w-12 h-12 text-[#2e7d32]" />
                        <p className="font-semibold uppercase tracking-wider text-sm">No {filter} notifications found</p>
                    </div>
                ) : (
                    filteredNotifications.map((n) => (
                        <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-6 rounded-2xl border transition-all text-left flex items-start gap-5 group hover:shadow-md ${!n.is_read ? 'bg-white border-[#2e7d32]/30 shadow-sm ring-1 ring-[#2e7d32]/10' : 'bg-gray-50/50 border-[#c8e6c9] shadow-none'
                                }`}
                        >
                            <div className="relative shrink-0">
                                <div className={`p-3 rounded-2xl ${!n.is_read ? 'bg-[#f4f9f5] border border-[#c8e6c9]' : 'bg-white border border-gray-200'
                                    }`}>
                                    {getIcon(n.type)}
                                </div>
                                {!n.is_read && (
                                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-[#2e7d32] border-2 border-white rounded-full"></div>
                                )}
                            </div>

                            <div className="flex-1 flex flex-col gap-1.5">
                                <p className={`text-sm leading-relaxed ${!n.is_read ? 'font-semibold text-[#152815]' : 'text-[#152815]/70 font-medium'}`}>
                                    {n.message}
                                </p>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-medium text-[#152815]/40 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" /> {getRelativeTime(n.created_at)}
                                    </span>
                                    {n.order_id && (
                                        <span className="text-[11px] font-bold text-[#2e7d32] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                            Click to view details &rarr;
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* ORDER DETAILS MODAL */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#152815]/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white border border-[#c8e6c9] rounded-3xl w-full max-w-md p-0 overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 bg-[#f4f9f5] border-b border-[#c8e6c9] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white border border-[#c8e6c9] rounded-xl"><Package className="w-5 h-5 text-[#2e7d32]" /></div>
                                <h3 className="font-heading font-bold text-xl text-[#152815]">Order Snapshot</h3>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-2 hover:bg-[#c8e6c9]/50 rounded-lg transition-colors text-[#152815]/60"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 flex flex-col gap-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-[#152815]/50">Order Ref</label>
                                <p className="text-3xl font-heading font-black text-[#152815]">#{selectedOrder.id.substring(0, 8).toUpperCase()}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#152815]/50">Grade</label>
                                    <p className="font-bold text-[#152815] uppercase tracking-wider">{selectedOrder.grade}</p>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#152815]/50">Quantity</label>
                                    <p className="font-bold text-[#152815] text-lg">{Math.floor(selectedOrder.quantity_kg).toLocaleString()} EGGS</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-[#152815]/50">Current Status</label>
                                <div className="flex">
                                    <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${selectedOrder.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                        selectedOrder.status === 'confirmed' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                            'bg-green-50 text-green-600 border-green-200'
                                        }`}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 pt-4 border-t border-[#c8e6c9]/50">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-[#152815]/50">Ordered at</label>
                                <p className="text-sm font-medium text-[#152815]/70">
                                    {new Date(selectedOrder.created_at).toLocaleString([], { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="w-full py-3.5 mt-4 bg-[#f4f9f5] border border-[#c8e6c9] text-[#2e7d32] font-semibold rounded-xl hover:bg-[#2e7d32] hover:text-white transition-all shadow-sm"
                            >
                                Close Snapshot
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loadingOrder && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-white/50 backdrop-blur-[2px]">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            )}
        </div>
    );
}
