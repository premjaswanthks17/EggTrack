"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

export async function getOrders() {
    if (isPlaceholder) return [];

    // Assuming a shops table exists with id and name. If it fails, fallback to standard query.
    const { data, error } = await supabase
        .from("orders")
        .select(`
      id,
      shop_id,
      grade,
      quantity_kg,
      status,
      created_at,
      shops ( name )
    `)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error fetching orders. Retrying without join...", error);
        // Fallback if shops table doesn't exist yet
        const raw = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
        return raw.data || [];
    }

    // Flatten the shops join for easier consumption
    return data.map(order => ({
        ...order,
        shop_name: order.shops?.name || `Shop #${order.shop_id}`
    }));
}

export async function updateOrderStatus(orderId, newStatus, grade, quantityKg) {
    if (isPlaceholder) return { success: true };

    // 1. Fetch order details to get shop_id
    const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("shop_id")
        .eq("id", orderId)
        .single();

    if (fetchError) {
        console.error("Error fetching order for update:", fetchError);
        return { error: "Order not found" };
    }

    // 2. Update the order
    const { error: orderError } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

    if (orderError) {
        console.error("Error updating order status:", orderError);
        return { error: "Failed to update order" };
    }

    // 3. Insert notification for shopkeeper
    const statusLabel = newStatus === 'confirmed' ? 'approved' : newStatus === 'cancelled' ? 'not approved' : newStatus;
    const message = `Your order for ${grade} (${quantityKg} EGGS) has been ${statusLabel}.`;

    const { error: notifError } = await supabase
        .from("notifications")
        .insert({
            target: "shopkeeper",
            type: newStatus, // 'confirmed' or 'cancelled' or 'shipped'
            message,
            order_id: orderId,
            shop_id: order.shop_id, // Targeting specific shopkeeper
            is_read: false
        });

    if (notifError) {
        console.error("Error creating notification (non-fatal):", notifError);
    }

    revalidatePath("/orders");
    return { success: true };
}

export async function getAvailableStock() {
    if (isPlaceholder) {
        return { market: 0, retail: 0, powder: 0 };
    }

    // 1. Get total produced (egg_count)
    const { data: producedData, error: prodErr } = await supabase
        .from("egg_readings")
        .select("egg_count, grade");

    // 2. Get total ordered (using quantity_kg column as egg count) that are confirmed or shipped
    const { data: orderedData, error: ordErr } = await supabase
        .from("orders")
        .select("quantity_kg, grade, status")
        .in("status", ["pending", "confirmed", "shipped"]);

    const stock = { market: 0, retail: 0, powder: 0 };

    if (prodErr || ordErr) {
        console.error("Error fetching stock base data", prodErr, ordErr);
        return stock;
    }

    // Add produced counts
    producedData?.forEach(egg => {
        if (stock[egg.grade] !== undefined) {
            stock[egg.grade] += (egg.egg_count || 1);
        }
    });

    // Subtract ordered counts
    orderedData?.forEach(order => {
        if (stock[order.grade] !== undefined) {
            stock[order.grade] -= order.quantity_kg;
        }
    });

    return stock;
}

export async function getProductionNotifications() {
    if (isPlaceholder) return [];

    const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("target", "production")
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching notifications:", error);
        return [];
    }

    return data;
}

export async function markNotificationAsRead(id) {
    if (isPlaceholder) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    revalidatePath("/orders");
}
