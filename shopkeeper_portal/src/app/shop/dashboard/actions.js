"use server";

import { supabase } from "@/lib/supabase";

const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

export async function getDashboardData(shopId) {
    if (isPlaceholder) {
        return {
            availability: { market: 0, retail: 0, powder: 0 },
            todaySummary: { market: 0, retail: 0, powder: 0, total: 0 },
            recentOrders: [],
            prices: {
                market: { price: 6.5, updated_at: new Date().toISOString() },
                retail: { price: 8.0, updated_at: new Date().toISOString() },
                powder: { price: 4.5, updated_at: new Date().toISOString() }
            }
        };
    }

    // 1. Fetch aggregate counts for availability (efficient)
    const fetchCounts = async (grade = null) => {
        let query = supabase.from("egg_readings").select("*", { count: 'exact', head: true });
        if (grade) query = query.eq("grade", grade);
        const { count } = await query;
        return count || 0;
    };

    // 2. Fetch committed stock
    const { data: committedOrders, error: ordersError } = await supabase
        .from("orders")
        .select("quantity_kg, grade")
        .in("status", ["pending", "confirmed", "shipped"]);

    // 3. Fetch today's snapshot for the summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayReadings } = await supabase
        .from("egg_readings")
        .select("grade")
        .gte("recorded_at", today.toISOString());

    // 4. Fetch last 5 orders for this shop
    const { data: recentOrders } = await supabase
        .from("orders")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(5);

    // 5. Fetch current prices
    const { data: rawPrices } = await supabase.from("egg_prices").select("*");

    const [marketTotal, retailTotal, powderTotal] = await Promise.all([
        fetchCounts("market"),
        fetchCounts("retail"),
        fetchCounts("powder")
    ]);

    const stock = { 
        market: marketTotal, 
        retail: retailTotal, 
        powder: powderTotal 
    };

    committedOrders?.forEach(o => {
        if (stock[o.grade] !== undefined) {
            stock[o.grade] -= o.quantity_kg;
        }
    });

    const prices = {};
    rawPrices?.forEach(p => {
        prices[p.grade] = {
            price: p.price_per_egg,
            updated_at: p.updated_at
        };
    });

    return {
        availability: {
            market: Math.max(0, Math.floor(stock.market)),
            retail: Math.max(0, Math.floor(stock.retail)),
            powder: Math.max(0, Math.floor(stock.powder))
        },
        todaySummary: {
            market: todayReadings?.filter(r => r.grade === 'market').length || 0,
            retail: todayReadings?.filter(r => r.grade === 'retail').length || 0,
            powder: todayReadings?.filter(r => r.grade === 'powder').length || 0,
            total: todayReadings?.length || 0
        },
        recentOrders: recentOrders || [],
        prices
    };
}
