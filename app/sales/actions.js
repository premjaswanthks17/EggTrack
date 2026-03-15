"use server";

import { supabase } from "@/lib/supabase";

const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

export async function getSalesData() {
    if (isPlaceholder) return [];

    // Assuming a shops table exists with id, name, and owner_name. If it fails, fallback to standard query.
    const { data, error } = await supabase
        .from("orders")
        .select(`
      id,
      shop_id,
      grade,
      quantity_kg,
      status,
      created_at,
      shops ( name, owner_name )
    `)
        .order("created_at", { ascending: false });

    let orders = [];
    if (error) {
        console.error("Error fetching sales full dataset. Retrying without join...", error);
        const raw = await supabase.from("orders").select("*").order("created_at", { ascending: false });
        orders = raw.data || [];
    } else {
        orders = data;
    }

    // Standardize the objects with fallback names
    return orders.map(order => ({
        ...order,
        shop_name: order.shops?.name || (order.shop_id ? (order.shop_name || `Shop #${order.shop_id}`) : "Unknown Shop"),
        shop_owner: order.shops?.owner_name || (order.shop_owner || "Unknown Owner"),
    }));
}
