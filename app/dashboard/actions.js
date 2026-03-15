"use server";

import { supabase } from "@/lib/supabase";

export async function getDashboardStats() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
        return { total: { count: 0, weight: 0 }, market: { count: 0, weight: 0 }, retail: { count: 0, weight: 0 }, powder: { count: 0, weight: 0 }, available: { total: 0, market: 0, retail: 0, powder: 0 } };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch today's data for specific metrics
    const { data: todayData, error: todayError } = await supabase
        .from("egg_readings")
        .select("weight_grams, grade, egg_count")
        .gte("recorded_at", today.toISOString());

    // 2. Efficiently fetch global counts using Supabase count feature
    const fetchCounts = async (grade = null) => {
        let query = supabase.from("egg_readings").select("*", { count: 'exact', head: true });
        if (grade) query = query.eq("grade", grade);
        const { count } = await query;
        return count || 0;
    };

    // 3. Fetch committed order quantities
    const { data: committedOrders } = await supabase
        .from("orders")
        .select("grade, quantity_kg")
        .in("status", ["pending", "confirmed", "shipped"]);

    if (todayError) {
        console.error("Error fetching stats:", todayError);
        return {
            total: { count: 0, weight: 0 },
            market: { count: 0, weight: 0 },
            retail: { count: 0, weight: 0 },
            powder: { count: 0, weight: 0 },
            available: { total: 0, market: 0, retail: 0, powder: 0 }
        };
    }

    const stats = {
        total: { count: 0, weight: 0 },
        market: { count: 0, weight: 0 },
        retail: { count: 0, weight: 0 },
        powder: { count: 0, weight: 0 },
        produced: { total: 0, market: 0, retail: 0, powder: 0 },
        available: { total: 0, market: 0, retail: 0, powder: 0 }
    };

    // Process today's data
    todayData?.forEach((egg) => {
        const count = egg.egg_count || 1;
        const weight = egg.weight_grams;
        stats.total.count += count;
        stats.total.weight += weight;

        if (egg.grade === "market") {
            stats.market.count += count;
            stats.market.weight += weight;
        } else if (egg.grade === "retail") {
            stats.retail.count += count;
            stats.retail.weight += weight;
        } else if (egg.grade === "powder") {
            stats.powder.count += count;
            stats.powder.weight += weight;
        }
    });

    // Calculate Available Stock (Total Production - Total Committed)
    // Using parallel fetching for efficiency
    const [totalProd, marketProd, retailProd, powderProd] = await Promise.all([
        fetchCounts(),
        fetchCounts("market"),
        fetchCounts("retail"),
        fetchCounts("powder")
    ]);

    stats.produced.total = totalProd;
    stats.produced.market = marketProd;
    stats.produced.retail = retailProd;
    stats.produced.powder = powderProd;

    // Initialize available with produced counts, then subtract committed
    stats.available = { ...stats.produced };

    committedOrders?.forEach(o => {
        const qty = o.quantity_kg;
        stats.available.total -= qty;
        if (o.grade === "market") stats.available.market -= qty;
        else if (o.grade === "retail") stats.available.retail -= qty;
        else if (o.grade === "powder") stats.available.powder -= qty;
    });

    // Clean up negative numbers
    stats.available.total = Math.max(0, stats.available.total);
    stats.available.market = Math.max(0, Math.floor(stats.available.market));
    stats.available.retail = Math.max(0, Math.floor(stats.available.retail));
    stats.available.powder = Math.max(0, Math.floor(stats.available.powder));

    return stats;
}

export async function getRecentReadings() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
        return [];
    }

    const { data, error } = await supabase
        .from("egg_readings")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching recent readings:", error);
        return [];
    }

    return data;
}

export async function getHourlyData() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
        return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from("egg_readings")
        .select("recorded_at, grade, egg_count, weight_grams")
        .gte("recorded_at", today.toISOString());

    if (error) {
        console.error("Error fetching hourly data:", error);
        return [];
    }

    // Initialize 24 hours
    const hourlyCounts = Array.from({ length: 24 }).map((_, i) => ({
        hour: i.toString().padStart(2, "0") + ":00",
        index: i,
        market: 0,
        retail: 0,
        powder: 0,
    }));

    data?.forEach((egg) => {
        const d = new Date(egg.recorded_at);
        const h = d.getHours();
        const count = egg.egg_count || 1;
        if (egg.grade === "market") hourlyCounts[h].market += count;
        else if (egg.grade === "retail") hourlyCounts[h].retail += count;
        else if (egg.grade === "powder") hourlyCounts[h].powder += count;
    });

    return hourlyCounts;
}
