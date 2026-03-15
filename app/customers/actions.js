"use server";

import { supabase } from "@/lib/supabase";

export async function getCustomers(status) {
    const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(`Error fetching ${status} customers:`, error);
        return [];
    }
    return data;
}

export async function updateCustomerStatus(id, status, shopName, customerData = null) {
    const isApproval = status === 'approved';
    const updateData = { status };
    if (isApproval) {
        updateData.approved_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", id);

    if (updateError) throw updateError;

    if (isApproval) {
        if (customerData) {
            // Also sync to shops table so the portal can use it immediately for orders/dashboards
            const { error: shopSyncError } = await supabase
                .from("shops")
                .upsert({
                    id: id,
                    email: customerData.email,
                    shop_name: customerData.shop_name,
                    owner_name: customerData.owner_name,
                    location: customerData.location
                }, { onConflict: 'id' });

            if (shopSyncError) console.error("Error syncing shop data:", shopSyncError);
        }

        // Insert notification for the shopkeeper
        const { error: notifError } = await supabase
            .from("notifications")
            .insert({
                type: 'approved',
                target: 'shopkeeper',
                shop_id: id, // The customer ID is the shop ID here
                message: `Your EggTrack account (${shopName}) has been approved! You can now log in.`,
                is_read: false,
                created_at: new Date().toISOString()
            });

        if (notifError) console.error("Error creating approval notification:", notifError);
    }

    return { success: true };
}
