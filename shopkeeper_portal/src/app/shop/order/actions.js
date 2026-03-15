"use server";

import { supabase } from "@/lib/supabase";

export async function getPrices() {
    const { data } = await supabase.from("egg_prices").select("*");
    const prices = {};
    data?.forEach(p => {
        prices[p.grade] = p.price_per_egg;
    });
    return prices;
}

export async function getGradeAvailability(grade) {
    // 1. Fetch total produced count for this grade (efficient)
    const { count: totalProduced, error: readingsError } = await supabase
        .from("egg_readings")
        .select("*", { count: 'exact', head: true })
        .eq("grade", grade);

    if (readingsError) {
        console.error("Error fetching readings:", readingsError);
        return 0;
    }

    // 2. Fetch total committed stock for this grade
    const { data: committedOrders, error: ordersError } = await supabase
        .from("orders")
        .select("quantity_kg")
        .eq("grade", grade)
        .in("status", ["pending", "confirmed", "shipped"]);

    if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        return 0;
    }

    // 3. Calculate net available
    let totalCommitted = committedOrders?.reduce((sum, o) => sum + (parseFloat(o.quantity_kg) || 0), 0) || 0;

    return Math.max(0, (totalProduced || 0) - totalCommitted);
}

export async function getOrderHistory(shopId) {
    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching history:", error);
        return [];
    }

    return data;
}

export async function placeOrder({ shopId, shopName, grade, quantityKg, deliveryDate, notes }) {
    // 1. Sync shop data to satisfy the legacy foreign key constraint
    const { data: customer } = await supabase.from('customers').select('*').eq('id', shopId).single();
    if (customer) {
        await supabase.from('shops').upsert({
            id: shopId,
            email: customer.email,
            shop_name: customer.shop_name,
            owner_name: customer.owner_name,
            location: customer.location
        }, { onConflict: 'id' });
    }

    // 2. Insert into orders table
    const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
            shop_id: shopId,
            grade: grade,
            quantity_kg: quantityKg,
            status: "pending",
            notes: notes,
            delivery_date: deliveryDate // assuming this column exists or will be ignored
        })
        .select()
        .single();

    if (orderError) throw orderError;

    // 2. Insert into notifications table
    const { error: notifError } = await supabase.from("notifications").insert({
        type: "new_order",
        target: "production",
        message: `${shopName} ordered ${quantityKg} EGGS of ${grade} grade eggs`,
        order_id: order.id,
        is_read: false
    });

    if (notifError) {
        console.error("Notification failed but order was placed:", notifError);
    }

    return order;
}
