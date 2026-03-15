"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

const isPlaceholder = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

// Utility to calculate grade consistently (internal use only)
function calculateGrade(weight) {
    if (!weight || isNaN(weight)) return null;
    const w = parseFloat(weight);
    if (w < 50) return "market";
    if (w <= 60) return "retail";
    return "powder";
}

export async function addSingleReading(formData) {
    if (isPlaceholder) return { success: true };

    const weight = parseFloat(formData.get("weight"));
    const eggCount = parseInt(formData.get("eggCount")) || 1;
    const recordedAt = formData.get("recordedAt") || new Date().toISOString();
    const batchId = formData.get("batchId") || null;
    const notes = formData.get("notes") || null;

    if (!weight || weight < 1 || weight > 500) {
        return { error: "Invalid weight. Must be between 1g and 500g." };
    }

    const grade = calculateGrade(weight);

    const { error } = await supabase.from("egg_readings").insert({
        weight_grams: weight,
        egg_count: eggCount,
        grade,
        source: "manual",
        recorded_at: new Date(recordedAt).toISOString(),
        batch_id: batchId,
        notes,
    });

    if (error) {
        console.error("Error inserting single reading:", error);
        return { error: "Failed to save reading." };
    }

    revalidatePath("/manual-entry");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function addBulkReadings(readings) {
    if (isPlaceholder) return { success: true };

    // Filter out completely empty rows
    const validReadings = readings.filter(r => r.weight);

    if (validReadings.length === 0) {
        return { error: "No valid readings to submit." };
    }

    const rowsToInsert = validReadings.map((r) => {
        const w = parseFloat(r.weight);
        return {
            weight_grams: w,
            egg_count: parseInt(r.eggCount) || 1,
            grade: calculateGrade(w),
            source: "manual",
            recorded_at: new Date().toISOString(),
            batch_id: r.batchId || null,
            notes: null,
        };
    });

    const { error } = await supabase.from("egg_readings").insert(rowsToInsert);

    if (error) {
        console.error("Error inserting bulk readings:", error);
        return { error: "Failed to save bulk readings." };
    }

    revalidatePath("/manual-entry");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function getRecentManualReadings() {
    if (isPlaceholder) return [];

    const { data, error } = await supabase
        .from("egg_readings")
        .select("*")
        .eq("source", "manual")
        .order("recorded_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching recent manual readings:", error);
        return [];
    }

    return data;
}
