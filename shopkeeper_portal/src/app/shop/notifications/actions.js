"use server";

import { supabase } from "@/lib/supabase";

export async function getNotifications(shopId) {
    if (!shopId) return [];

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("target", "shopkeeper")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }
    return data;
}

export async function markAsRead(id) {
    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

    if (error) throw error;
}

export async function markAllAsRead(shopId) {
    if (!shopId) return;

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("target", "shopkeeper")
        .eq("shop_id", shopId)
        .eq("is_read", false);

    if (error) throw error;
}

export async function getOrderDetails(orderId) {
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

    if (error) {
        console.error("Error fetching order details:", error);
        return null;
    }
    return data;
}
