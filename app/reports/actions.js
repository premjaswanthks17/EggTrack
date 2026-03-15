"use server";

import { supabase } from "@/lib/supabase";

const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

export async function getFilteredReportData({ reportType, startDate, endDate, monthYear, gradeFilter, dataSource = "production" }) {
    if (isPlaceholder) {
        // Return empty array to gracefully handle missing DB config during dev/build
        return [];
    }

    const table = dataSource === "sales" ? "orders" : "egg_readings";
    const dateCol = dataSource === "sales" ? "created_at" : "recorded_at";

    let query = supabase.from(table).select("*");

    // Handle Grade Filter
    if (gradeFilter && gradeFilter !== "all") {
        query = query.eq("grade", gradeFilter);
    }

    // Handle Date Filters
    if (reportType === "daily" && startDate) {
        // Entire day of startDate
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(startDate);
        end.setHours(23, 59, 59, 999);

        query = query.gte(dateCol, start.toISOString()).lte(dateCol, end.toISOString());
    }
    else if (reportType === "monthly" && monthYear) {
        // Entire month
        const [year, month] = monthYear.split("-");
        const start = new Date(year, parseInt(month) - 1, 1);
        const end = new Date(year, parseInt(month), 0, 23, 59, 59, 999); // last day of month

        query = query.gte(dateCol, start.toISOString()).lte(dateCol, end.toISOString());
    }
    else if (reportType === "custom" && startDate && endDate) {
        // Custom range
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        query = query.gte(dateCol, start.toISOString()).lte(dateCol, end.toISOString());
    }

    // Order chronologically for simpler chart generation later
    query = query.order(dateCol, { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching report data:", error);
        return [];
    }

    // Map sales data to look like production data so the frontend logic doesn't have to change
    if (dataSource === "sales" && data) {
        return data.map(o => ({
            recorded_at: o.created_at,
            grade: o.grade,
            egg_count: o.quantity_kg, // We treat quantity_kg as count based on recent changes
            weight_grams: 0 // Ignore weights for sales reports
        }));
    }

    return data || [];
}
