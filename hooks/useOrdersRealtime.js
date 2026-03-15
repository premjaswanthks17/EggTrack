"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Custom hook to manage Supabase realtime subscriptions for Orders and Notifications
 * @param {function} onOrderChange - Callback triggered when the orders table changes
 * @param {function} onNotification - Callback triggered when a new production notification arrives
 */
export function useOrdersRealtime(onOrderChange, onNotification) {
    useEffect(() => {
        // 1. Subscribe to new incoming orders
        const ordersChannel = supabase
            .channel("orders-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "orders" },
                (payload) => {
                    console.log("Realtime order update:", payload);
                    if (onOrderChange) onOrderChange(payload);
                }
            )
            .subscribe();

        // 2. Subscribe to new notifications targeted at production (us)
        const notifChannel = supabase
            .channel("notifications-changes")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: "target=eq.production" // Only listen to notifications meant for us
                },
                (payload) => {
                    console.log("Realtime notification:", payload);
                    if (onNotification) onNotification(payload.new);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(notifChannel);
        };
    }, [onOrderChange, onNotification]);
}
