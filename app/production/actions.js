"use server";

import { supabase } from "@/lib/supabase";

export async function getProductionMetrics() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co") {
        return {
            today: { count: 0, weight: 0 },
            grades: { market: 0, retail: 0, powder: 0 },
            batches: []
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayData, error } = await supabase
        .from("egg_readings")
        .select("weight_grams, grade, egg_count, batch_id, recorded_at")
        .gte("recorded_at", today.toISOString())
        .order("recorded_at", { ascending: false });

    if (error) {
        console.error("Error fetching production metrics:", error);
        return {
            today: { count: 0, weight: 0 },
            grades: { market: 0, retail: 0, powder: 0 },
            batches: []
        };
    }

    const metrics = {
        today: { count: 0, weight: 0 },
        grades: { market: 0, retail: 0, powder: 0 },
        recentReadings: todayData?.slice(0, 10) || []
    };

    const batchMap = {};

    todayData?.forEach((reading) => {
        const count = reading.egg_count || 1;
        const weight = reading.weight_grams;

        metrics.today.count += count;
        metrics.today.weight += weight;

        if (metrics.grades[reading.grade] !== undefined) {
            metrics.grades[reading.grade] += count;
        }

        if (reading.batch_id) {
            if (!batchMap[reading.batch_id]) {
                batchMap[reading.batch_id] = {
                    id: reading.batch_id,
                    count: 0,
                    weight: 0,
                    lastSeen: reading.recorded_at
                };
            }
            batchMap[reading.batch_id].count += count;
            batchMap[reading.batch_id].weight += weight;
        }
    });

    metrics.batches = Object.values(batchMap).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

    return metrics;
}
