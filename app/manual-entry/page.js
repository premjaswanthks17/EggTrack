"use client";

import { useState, useEffect } from "react";
import { addSingleReading, addBulkReadings, getRecentManualReadings } from "./actions";
import { useToast } from "@/components/ui/use-toast";

// Utility grade calculator matching server logic
function calculateGrade(weight) {
    if (!weight || isNaN(weight)) return null;
    const w = parseFloat(weight);
    if (w < 50) return { grade: "market", color: "#eab308", label: "Market (< 50g)" };
    if (w <= 60) return { grade: "retail", color: "#2e7d32", label: "Retail (50–60g)" };
    return { grade: "powder", color: "#3b82f6", label: "Powder (> 60g)" };
}

export default function ManualEntryPage() {
    const { toast } = useToast();

    // Single Entry State
    const [currentWeight, setCurrentWeight] = useState("");
    const preview = calculateGrade(currentWeight);

    // Bulk Entry State (10 empty rows default)
    const [bulkRows, setBulkRows] = useState(Array.from({ length: 10 }).map(() => ({ weight: "", eggCount: "1", batchId: "" })));

    // Recent Entries
    const [recentEntries, setRecentEntries] = useState([]);

    useEffect(() => {
        // Initial fetch of recent entries
        getRecentManualReadings().then((data) => setRecentEntries(data));
    }, []);

    // Format timestamp
    const formatTime = (isoString) => {
        if (!isoString) return "";
        return new Date(isoString).toLocaleString([], { month: "short", day: "numeric", hour: '2-digit', minute: '2-digit' });
    };

    const handleSingleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const res = await addSingleReading(formData);

        if (res?.error) {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        } else {
            toast({ title: "Reading saved!", description: "The single entry was successfully added.", className: "bg-[#2e7d32] text-white border-0" });
            e.target.reset(); // Clear form
            setCurrentWeight(""); // Clear live preview
            getRecentManualReadings().then((data) => setRecentEntries(data)); // Refresh table
        }
    };

    const handleBulkSubmit = async () => {
        const res = await addBulkReadings(bulkRows);
        if (res?.error) {
            toast({ title: "Error", description: res.error, variant: "destructive" });
        } else {
            toast({ title: "Readings saved!", description: "All valid rows submitted.", className: "bg-[#2e7d32] text-white border-0" });
            setBulkRows(Array.from({ length: 10 }).map(() => ({ weight: "", eggCount: "1", batchId: "" }))); // Reset bulk form
            getRecentManualReadings().then((data) => setRecentEntries(data)); // Refresh table
        }
    };

    const updateBulkRow = (index, field, value) => {
        const newRows = [...bulkRows];
        newRows[index][field] = value;
        setBulkRows(newRows);
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col gap-1">
                <h1 className="text-4xl text-[#152815] tracking-tight">Manual Entry</h1>
                <p className="text-[#152815]/60">Record individual egg collections, samples, or bulk batches.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SINGLE ENTRY FORM */}
                <div className="bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col h-full">
                    <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest mb-6">Single Reading</h3>

                    <form className="flex flex-col gap-5 flex-1" onSubmit={handleSingleSubmit}>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Weight (grams) *</label>
                            <input
                                name="weight"
                                type="number"
                                step="0.01"
                                min="1"
                                max="500"
                                required
                                value={currentWeight}
                                onChange={(e) => setCurrentWeight(e.target.value)}
                                placeholder="e.g. 52.4"
                                className="p-3.5 rounded-xl border border-[#c8e6c9] focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-xl font-heading font-medium bg-[#f4f9f5] transition-shadow"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Egg Count *</label>
                            <input
                                name="eggCount"
                                type="number"
                                min="1"
                                required
                                defaultValue="1"
                                className="p-3.5 rounded-xl border border-[#c8e6c9] focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-lg font-heading font-medium bg-[#f4f9f5] transition-shadow"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Date & Time</label>
                                <input
                                    name="recordedAt"
                                    type="datetime-local"
                                    defaultValue={new Date().toISOString().slice(0, 16)}
                                    className="p-3 rounded-xl border border-[#c8e6c9] focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 bg-[#f4f9f5] text-sm text-[#152815]"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Batch ID (Optional)</label>
                                <input
                                    name="batchId"
                                    type="text"
                                    placeholder="e.g. BATCH-A2"
                                    className="p-3 rounded-xl border border-[#c8e6c9] focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 bg-[#f4f9f5] text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Notes (Optional)</label>
                            <textarea
                                name="notes"
                                placeholder="Any aberrations or observations..."
                                className="p-3 rounded-xl border border-[#c8e6c9] focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 bg-[#f4f9f5] text-sm resize-none flex-1 min-h-[80px]"
                            />
                        </div>

                        <button type="submit" className="w-full mt-2 bg-[#2e7d32] text-white font-medium p-4 rounded-xl hover:bg-[#1b431d] transition-colors shadow-sm">
                            Add Reading
                        </button>
                    </form>
                </div>

                {/* LIVE GRADE PREVIEW */}
                <div className="bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9]/50 flex flex-col justify-center items-center overflow-hidden relative">
                    {/* Background decorative blob based on current color */}
                    <div
                        className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full opacity-10 blur-3xl transition-colors duration-500"
                        style={{ backgroundColor: preview ? preview.color : '#c8e6c9' }}
                    ></div>

                    <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest w-full text-center mb-auto absolute top-8">Live Classification Preview</h3>

                    <div className="flex flex-col items-center justify-center my-12 z-10 w-full max-w-sm">
                        {currentWeight ? (
                            <div
                                key={preview.grade} // force re-animation on grade change
                                className="w-full bg-[#f4f9f5] border p-10 rounded-3xl flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 duration-300 shadow-sm"
                                style={{ borderColor: preview.color }}
                            >
                                <div
                                    className="px-6 py-2 rounded-full text-sm font-bold tracking-wider uppercase text-white shadow-sm"
                                    style={{ backgroundColor: preview.color }}
                                >
                                    {preview.label.split(' ')[0]}
                                </div>
                                <div className="text-6xl font-heading font-bold text-[#152815]">
                                    {parseFloat(currentWeight).toFixed(1)}<span className="text-2xl text-[#152815]/40">g</span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full border border-dashed border-[#c8e6c9] bg-[#f4f9f5]/50 p-10 rounded-3xl flex flex-col items-center justify-center gap-4 text-[#152815]/40 font-medium">
                                Enter a weight to preview
                            </div>
                        )}
                    </div>

                    <div className="mt-auto z-10 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-[#c8e6c9] text-xs font-medium text-[#152815]/60 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#eab308]"></div><span>&lt; 50g = Market</span></div>
                        <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#2e7d32]"></div><span>50–60g = Retail</span></div>
                        <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div><span>&gt; 60g = Powder</span></div>
                    </div>
                </div>
            </div>

            {/* BULK ENTRY SECTION */}
            <div className="bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest">Rapid Bulk Entry</h3>
                        <p className="text-xs text-[#152815]/50 font-medium">Auto-grades on input. Blank rows are ignored.</p>
                    </div>
                    <button
                        onClick={handleBulkSubmit}
                        type="button"
                        className="px-6 py-2.5 bg-[#f4f9f5] border border-[#c8e6c9] text-[#2e7d32] hover:bg-[#d7ecd7] font-medium rounded-xl transition-colors shadow-sm"
                    >
                        Submit All
                    </button>
                </div>

                <div className="border border-[#c8e6c9]/60 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#f4f9f5]">
                            <tr className="text-[#152815]/50">
                                <th className="py-3 px-4 font-semibold w-12 text-center border-b border-[#c8e6c9]">#</th>
                                <th className="py-3 px-4 font-semibold border-b border-[#c8e6c9]">Weight (g)</th>
                                <th className="py-3 px-4 font-semibold border-b border-[#c8e6c9]">Egg Count</th>
                                <th className="py-3 px-4 font-semibold border-b border-[#c8e6c9]">Batch ID</th>
                                <th className="py-3 px-4 font-semibold border-b border-[#c8e6c9]">Grade Result</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bulkRows.map((row, index) => {
                                const gradeInfo = calculateGrade(row.weight);
                                return (
                                    <tr key={index} className="border-b border-[#f4f9f5] hover:bg-[#f4f9f5]/30">
                                        <td className="py-2 px-4 text-center text-[#152815]/30 font-medium">{index + 1}</td>
                                        <td className="py-2 px-4">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="1"
                                                placeholder="0.0"
                                                value={row.weight}
                                                onChange={(e) => updateBulkRow(index, 'weight', e.target.value)}
                                                className="w-full p-2 rounded-lg border border-[#c8e6c9]/50 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]/30 bg-white shadow-sm font-heading font-medium"
                                            />
                                        </td>
                                        <td className="py-2 px-4">
                                            <input
                                                type="number"
                                                min="1"
                                                value={row.eggCount}
                                                onChange={(e) => updateBulkRow(index, 'eggCount', e.target.value)}
                                                className="w-full p-2 rounded-lg border border-[#c8e6c9]/50 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]/30 bg-white shadow-sm font-heading font-medium"
                                            />
                                        </td>
                                        <td className="py-2 px-4">
                                            <input
                                                type="text"
                                                placeholder="Optional"
                                                value={row.batchId}
                                                onChange={(e) => updateBulkRow(index, 'batchId', e.target.value)}
                                                className="w-full p-2 rounded-lg border border-[#c8e6c9]/50 focus:outline-none focus:ring-1 focus:ring-[#2e7d32]/30 bg-white shadow-sm text-sm"
                                            />
                                        </td>
                                        <td className="py-2 px-4">
                                            {gradeInfo ? (
                                                <span
                                                    className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-2"
                                                    style={{ backgroundColor: `${gradeInfo.color}20`, color: gradeInfo.color }}
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: gradeInfo.color }}></div>
                                                    {gradeInfo.grade}
                                                </span>
                                            ) : (
                                                <span className="text-[#152815]/20">-</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RECENT READINGS TABLE */}
            <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest mt-4">Last 10 Manual Entries</h3>
            <div className="bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-[#c8e6c9]/60 text-[#152815]/40">
                                <th className="pb-3 font-semibold">Time</th>
                                <th className="pb-3 font-semibold text-center">Eggs</th>
                                <th className="pb-3 font-semibold">Weight (g)</th>
                                <th className="pb-3 font-semibold">Grade</th>
                                <th className="pb-3 font-semibold">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentEntries.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-[#152815]/40 bg-[#f4f9f5]/30 rounded-lg">No manual readings found.</td>
                                </tr>
                            ) : (
                                recentEntries.map((reading) => {
                                    const gradeColor = calculateGrade(reading.weight_grams)?.color || "#000";
                                    return (
                                        <tr key={reading.id} className="border-b border-[#f4f9f5] hover:bg-[#f4f9f5]/50 transition-colors">
                                            <td className="py-3 font-medium text-[#152815]">{formatTime(reading.recorded_at)}</td>
                                            <td className="py-3 font-black text-[#2e7d32] text-center">{reading.egg_count || 1}</td>
                                            <td className="py-3 font-heading font-medium text-[#152815]">{parseFloat(reading.weight_grams).toFixed(2)}</td>
                                            <td className="py-3">
                                                <span
                                                    className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
                                                    style={{ backgroundColor: `${gradeColor}20`, color: gradeColor }}
                                                >
                                                    {reading.grade}
                                                </span>
                                            </td>
                                            <td className="py-3 text-[#152815]/60 max-w-xs truncate" title={reading.notes}>
                                                {reading.batch_id && <span className="bg-[#f4f9f5] border border-[#c8e6c9] text-xs px-1.5 py-0.5 rounded mr-2 text-[#152815]/60">{reading.batch_id}</span>}
                                                {reading.notes || "-"}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
