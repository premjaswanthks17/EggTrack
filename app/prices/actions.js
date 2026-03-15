"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getPrices() {
    const { data, error } = await supabase
        .from("egg_prices")
        .select("*")
        .order("grade", { ascending: true });

    if (error) {
        console.error("Error fetching prices:", error);
        return [];
    }
    return data;
}

export async function getPriceHistory() {
    const { data, error } = await supabase
        .from("egg_price_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching price history:", error);
        return [];
    }
    return data;
}

export async function updatePrice(grade, newPrice) {
    // 1. Fetch current price
    const { data: current, error: fetchError } = await supabase
        .from("egg_prices")
        .select("price_per_egg")
        .eq("grade", grade)
        .single();

    if (fetchError) throw fetchError;

    const oldPrice = current.price_per_egg;

    // 2. Insert into history
    const { error: historyError } = await supabase
        .from("egg_price_history")
        .insert({
            grade,
            old_price: oldPrice,
            new_price: newPrice,
            changed_at: new Date().toISOString()
        });

    if (historyError) throw historyError;

    // 3. Update current price
    const { error: updateError } = await supabase
        .from("egg_prices")
        .update({
            price_per_egg: newPrice,
            updated_at: new Date().toISOString()
        })
        .eq("grade", grade);

    if (updateError) throw updateError;

    return { success: true };
}

export async function seedPrices() {
    const initialPrices = [
        { grade: 'market', price_per_egg: 6.50 },
        { grade: 'retail', price_per_egg: 8.00 },
        { grade: 'powder', price_per_egg: 4.50 }
    ];

    const { error } = await supabase
        .from('egg_prices')
        .upsert(initialPrices, { onConflict: 'grade' });

    if (error) throw error;
    return { success: true };
}
