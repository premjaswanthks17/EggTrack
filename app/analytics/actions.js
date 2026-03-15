"use server";

import { supabase } from "@/lib/supabase";

const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

export async function getAnalyticsData(period) {
    if (isPlaceholder) {
        return {
            topBuyers: [],
            topLocations: [],
            gradePopularity: {
                company: [],
                individual: [],
                market: [],
                retail: []
            },
            deliveryFrequency: []
        };
    }

    let startDate;
    const now = new Date();
    if (period === "30_days") {
        startDate = new Date(now.setDate(now.getDate() - 30)).toISOString();
    } else if (period === "3_months") {
        startDate = new Date(now.setMonth(now.getMonth() - 3)).toISOString();
    }
    // "all_time" leaves startDate undefined

    // 1. TOP BUYERS
    let buyersQuery = supabase
        .from("orders")
        .select(`
            quantity_kg,
            created_at,
            status,
            shops (
                id,
                shop_name,
                owner_name,
                location,
                email
            )
        `)
        .in("status", ["confirmed", "shipped"]);

    if (startDate) {
        buyersQuery = buyersQuery.gte("created_at", startDate);
    }

    const { data: ordersData, error: ordersError } = await buyersQuery;

    if (ordersError) {
        console.error("Error fetching analytics orders:", ordersError);
        return null;
    }

    // Since we can't easily do the complex join+group by in one go with JS client for multiple tables 
    // unless we use a RPC, we aggregate in JS.

    // First, fetch all customers to get their types by email
    const { data: customersData } = await supabase.from("customers").select("email, type");
    const customerTypeMap = {};
    customersData?.forEach(c => {
        customerTypeMap[c.email] = c.type;
    });

    const shopStats = {};
    ordersData?.forEach(order => {
        const shop = order.shops;
        if (!shop) return;

        if (!shopStats[shop.id]) {
            shopStats[shop.id] = {
                shop_name: shop.shop_name,
                owner_name: shop.owner_name,
                location: shop.location,
                customer_type: customerTypeMap[shop.email] || 'individual',
                total_orders: 0,
                total_eggs: 0,
                last_order_date: order.created_at
            };
        }
        shopStats[shop.id].total_orders += 1;
        shopStats[shop.id].total_eggs += parseFloat(order.quantity_kg);
        if (new Date(order.created_at) > new Date(shopStats[shop.id].last_order_date)) {
            shopStats[shop.id].last_order_date = order.created_at;
        }
    });

    const topBuyers = Object.values(shopStats)
        .sort((a, b) => b.total_eggs - a.total_eggs)
        .slice(0, 10);

    // 2. TOP LOCATIONS
    const locationStats = {};
    ordersData?.forEach(order => {
        if (!order.shops) return;
        const loc = order.shops.location;
        if (!locationStats[loc]) {
            locationStats[loc] = { location: loc, total_eggs: 0, total_orders: 0 };
        }
        locationStats[loc].total_eggs += parseFloat(order.quantity_kg);
        locationStats[loc].total_orders += 1;
    });

    const topLocations = Object.values(locationStats)
        .sort((a, b) => b.total_eggs - a.total_eggs)
        .slice(0, 10);

    // 3. GRADE POPULARITY BY CUSTOMER TYPE
    const popularity = {
        company: { market: 0, retail: 0, powder: 0 },
        individual: { market: 0, retail: 0, powder: 0 },
        market: { market: 0, retail: 0, powder: 0 },
        retail: { market: 0, retail: 0, powder: 0 }
    };

    ordersData?.forEach(order => {
        const email = order.shops?.email;
        const type = customerTypeMap[email] || 'individual';
        const grade = order.grade;
        if (popularity[type] && popularity[type][grade] !== undefined) {
            popularity[type][grade] += 1;
        }
    });

    const formattedPopularity = {};
    Object.keys(popularity).forEach(type => {
        formattedPopularity[type] = [
            { name: "Market", value: popularity[type].market, color: "#F9A825" },
            { name: "Retail", value: popularity[type].retail, color: "#2E7D32" },
            { name: "Powder", value: popularity[type].powder, color: "#1565C0" }
        ];
    });

    // 4. DELIVERY FREQUENCY BREAKDOWN
    const freqQuery = supabase.from("customers").select("delivery_frequency").eq("status", "approved");
    const { data: freqData } = await freqQuery;

    const freqStats = {};
    freqData?.forEach(f => {
        const freq = f.delivery_frequency;
        freqStats[freq] = (freqStats[freq] || 0) + 1;
    });

    const deliveryFrequency = Object.entries(freqStats).map(([name, value]) => ({ name, value }));

    return {
        topBuyers,
        topLocations,
        gradePopularity: formattedPopularity,
        deliveryFrequency
    };
}
