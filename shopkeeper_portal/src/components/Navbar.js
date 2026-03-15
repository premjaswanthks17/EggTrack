"use client";

import { useShop } from "@/components/ShopProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Egg, Bell, LogOut, LayoutDashboard, ShoppingCart, Inbox, History, Clock } from "lucide-react";

export default function Navbar() {
    const { shop, logout } = useShop();
    const pathname = usePathname();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from("notifications")
            .select("*")
            .eq("target", "shopkeeper")
            .eq("shop_id", shop?.id)
            .order("created_at", { ascending: false })
            .limit(5);

        const { count } = await supabase
            .from("notifications")
            .select("*", { count: 'exact', head: true })
            .eq("target", "shopkeeper")
            .eq("shop_id", shop?.id)
            .eq("is_read", false);

        setNotifications(data || []);
        setUnreadCount(count || 0);
    };

    useEffect(() => {
        fetchNotifications();

        const channel = supabase
            .channel('navbar-notifications')
            .on(
                'postgres_changes',
                { event: '*', table: 'notifications', filter: `target=eq.shopkeeper&shop_id=eq.${shop?.id}` },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const navLinks = [
        { name: "Home", href: "/shop/dashboard", icon: LayoutDashboard },
        { name: "Place Order", href: "/shop/order", icon: ShoppingCart },
        { name: "Notifications", href: "/shop/notifications", icon: Inbox },
        { name: "History", href: "/shop/history", icon: History },
    ];

    const getIcon = (type) => {
        switch (type) {
            case 'confirmed': return "✅";
            case 'shipped': return "🚚";
            case 'new_order': return "🕐";
            default: return "🔔";
        }
    };

    return (
        <nav className="bg-white border-b border-[#1565C0]/10 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                {/* Left: Branding */}
                <Link href="/shop/dashboard" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
                        <Egg className="w-5 h-5 text-white fill-white/10" />
                    </div>
                    <div>
                        <h1 className="font-heading font-bold text-lg text-primary leading-tight">
                            {shop?.shop_name || "EGG TRACK"}
                        </h1>
                        <p className="text-[10px] font-bold text-[#152815]/40 uppercase tracking-widest">Shopkeeper Portal</p>
                    </div>
                </Link>

                {/* Center: Navigation Links */}
                <div className="hidden md:flex items-center gap-1 bg-[#E3F2FD]/50 p-1.5 rounded-2xl border border-primary/5">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isActive
                                    ? "bg-white text-primary shadow-sm ring-1 ring-primary/5"
                                    : "text-[#152815]/50 hover:text-primary hover:bg-white/50"
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-current opacity-60'}`} />
                                {link.name}
                            </Link>
                        );
                    })}
                </div>

                {/* Right: User & Actions */}
                <div className="flex items-center gap-4 relative">
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="relative p-2.5 bg-[#E3F2FD]/50 text-primary hover:bg-[#E3F2FD] rounded-xl border border-primary/10 transition-colors"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 border-2 border-white rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {showDropdown && (
                            <div
                                className="absolute right-0 mt-4 w-80 bg-white shadow-2xl rounded-3xl border border-primary/10 overflow-hidden animate-in fade-in slide-in-from-top-2"
                                onMouseLeave={() => setShowDropdown(false)}
                            >
                                <div className="p-4 bg-[#E3F2FD]/30 border-b border-primary/5 flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-widest text-primary/60">Notifications</span>
                                    {unreadCount > 0 && <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="py-10 text-center opacity-30 text-[10px] font-bold uppercase tracking-widest">No alerts today</div>
                                    ) : (
                                        notifications.map((n) => (
                                            <Link
                                                key={n.id}
                                                href="/shop/notifications"
                                                onClick={() => setShowDropdown(false)}
                                                className={`block p-4 border-b border-primary/5 hover:bg-[#E3F2FD]/20 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                                            >
                                                <div className="flex gap-3">
                                                    <span className="text-sm shrink-0">{getIcon(n.type)}</span>
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className={`text-xs leading-relaxed ${!n.is_read ? 'font-bold text-[#152815]' : 'text-[#152815]/60'}`}>
                                                            {n.message}
                                                        </p>
                                                        <span className="text-[9px] font-bold text-primary/40 uppercase tracking-tighter flex items-center gap-1">
                                                            <Clock className="w-2.5 h-2.5" /> Latest alert
                                                        </span>
                                                    </div>
                                                    {!n.is_read && <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0 mt-1"></div>}
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                                <Link
                                    href="/shop/notifications"
                                    onClick={() => setShowDropdown(false)}
                                    className="block py-3 bg-[#E3F2FD]/50 text-center text-[10px] font-black uppercase tracking-widest text-primary hover:bg-[#E3F2FD] transition-colors"
                                >
                                    View All Notifications
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="h-10 w-px bg-primary/10 hidden sm:block"></div>

                    <div className="hidden lg:flex flex-col items-end">
                        <span className="text-sm font-bold text-[#152815]">{shop?.owner_name || "Owner"}</span>
                        <span className="text-[10px] font-bold text-[#152815]/40 uppercase tracking-widest">Authorized Vendor</span>
                    </div>

                    <button
                        onClick={logout}
                        className="p-2.5 text-[#152815]/50 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </nav>
    );
}
