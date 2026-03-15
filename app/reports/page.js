"use client";

import { useState } from "react";
import { getFilteredReportData } from "./actions";
import { useToast } from "@/components/ui/use-toast";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Organic color mapping
const COLORS = {
    market: "#eab308", // Yellow
    retail: "#2e7d32", // Green
    powder: "#3b82f6", // Blue
};

export default function ReportsPage() {
    const { toast } = useToast();

    // Filter States
    const [reportType, setReportType] = useState("daily"); // daily, monthly, custom
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState("");
    const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [gradeFilter, setGradeFilter] = useState("all");
    const [dataSource, setDataSource] = useState("production"); // production, sales

    // Data States
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState([]);
    const [hasGenerated, setHasGenerated] = useState(false);

    // Derived Summary States
    const [summary, setSummary] = useState({ total: 0, weightKg: 0, avgWeight: 0, marketPct: 0, retailPct: 0, powderPct: 0 });
    const [pieData, setPieData] = useState([]);
    const [lineData, setLineData] = useState([]);
    const [tableData, setTableData] = useState([]);

    const handleGenerate = async () => {
        setIsLoading(true);

        try {
            // Mock validation
            if (reportType === "custom" && (!startDate || !endDate)) {
                toast({ title: "Validation Error", description: "Please select both start and end dates.", variant: "destructive" });
                setIsLoading(false);
                return;
            }

            const rawData = await getFilteredReportData({ reportType, startDate, endDate, monthYear, gradeFilter, dataSource });

            // Process Data immediately for UI consumption
            processReportData(rawData);
            setReportData(rawData);
            setHasGenerated(true);

            toast({ title: "Report Generated", description: `Fetched ${rawData.length} records matching criteria.`, className: "bg-[#2e7d32] text-white border-0" });
        } catch (e) {
            toast({ title: "Error", description: "Failed to generate report.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const processReportData = (data) => {
        if (!data || data.length === 0) {
            setSummary({ total: 0, weightKg: 0, avgWeight: 0, marketPct: 0, retailPct: 0, powderPct: 0 });
            setPieData([]);
            setLineData([]);
            setTableData([]);
            return;
        }

        // A. SUMMARY CARDS
        let total = 0, totalWeightGrams = 0;
        let marketCount = 0, retailCount = 0, powderCount = 0;

        data.forEach(d => {
            const count = d.egg_count || 1;
            total += count;
            totalWeightGrams += d.weight_grams;
            if (d.grade === "market") marketCount += count;
            if (d.grade === "retail") retailCount += count;
            if (d.grade === "powder") powderCount += count;
        });

        setSummary({
            total,
            weightKg: (totalWeightGrams / 1000).toFixed(2),
            avgWeight: (totalWeightGrams / total).toFixed(1),
            marketPct: ((marketCount / total) * 100).toFixed(1),
            retailPct: ((retailCount / total) * 100).toFixed(1),
            powderPct: ((powderCount / total) * 100).toFixed(1)
        });

        // B. PIE CHART
        setPieData([
            { name: "Market", value: marketCount, fill: COLORS.market },
            { name: "Retail", value: retailCount, fill: COLORS.retail },
            { name: "Powder", value: powderCount, fill: COLORS.powder }
        ].filter(d => d.value > 0));

        // C & D. LINE CHART AND TABLE (Grouping)
        // Group by hour if daily, else by date
        const grouped = {};

        data.forEach(d => {
            const dateObj = new Date(d.recorded_at);
            let key;
            if (reportType === "daily") {
                key = dateObj.getHours().toString().padStart(2, '0') + ":00";
            } else {
                key = dateObj.toISOString().split("T")[0]; // YYYY-MM-DD
            }

            const count = d.egg_count || 1;
            const weight = d.weight_grams || 0; // handle missing weights if any

            if (!grouped[key]) {
                grouped[key] = {
                    total: 0, totalKg: 0,
                    market: 0, marketKg: 0,
                    retail: 0, retailKg: 0,
                    powder: 0, powderKg: 0
                };
            }

            grouped[key].total += count;
            grouped[key].totalKg += weight;
            if (d.grade === "market") { grouped[key].market += count; grouped[key].marketKg += weight; }
            if (d.grade === "retail") { grouped[key].retail += count; grouped[key].retailKg += weight; }
            if (d.grade === "powder") { grouped[key].powder += count; grouped[key].powderKg += weight; }
        });

        // Sort grouped keys chronologically
        const sortedKeys = Object.keys(grouped).sort();

        const finalTable = sortedKeys.map(k => ({
            label: k,
            ...grouped[k],
            marketKg: (grouped[k].marketKg / 1000),
            retailKg: (grouped[k].retailKg / 1000),
            powderKg: (grouped[k].powderKg / 1000),
            totalKg: (grouped[k].totalKg / 1000)
        }));

        setTableData(finalTable);
        setLineData(finalTable);
    };

    const handleExportCSV = () => {
        if (tableData.length === 0) return;

        const headers = dataSource === "sales"
            ? ["Date/Time", "Market Eggs", "Retail Eggs", "Powder Eggs", "Total Eggs"]
            : ["Date/Time", "Market Eggs", "Market (kg)", "Retail Eggs", "Retail (kg)", "Powder Eggs", "Powder (kg)", "Total Eggs", "Total (kg)"];

        const rows = tableData.map(r => dataSource === "sales" ? [
            r.label,
            r.market,
            r.retail,
            r.powder,
            r.total
        ] : [
            r.label,
            r.market,
            r.marketKg.toFixed(2),
            r.retail,
            r.retailKg.toFixed(2),
            r.powder,
            r.powderKg.toFixed(2),
            r.total,
            r.totalKg.toFixed(2)
        ]);

        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `eggtrack_report_${reportType}_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderTooltipContent = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-[#c8e6c9] shadow-md rounded-xl text-sm">
                    <p className="font-bold text-[#152815] mb-2">{payload[0].payload.name}</p>
                    <p className="text-[#152815]/70">Count: {payload[0].value}</p>
                    {/* Need to recalculate total dynamically for pct in tooltip */}
                    <p className="text-[#152815]/70">Share: {((payload[0].value / summary.total) * 100).toFixed(1)}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col gap-1">
                <h1 className="text-4xl text-[#152815] tracking-tight">Generate Reports</h1>
                <p className="text-[#152815]/60">Filter, visualize, and export production data.</p>
            </div>

            {/* FILTER BAR */}
            <div className="bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-wrap items-end gap-6">

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Data Source</label>
                    <select
                        value={dataSource}
                        onChange={(e) => {
                            setDataSource(e.target.value);
                            setHasGenerated(false); // Reset when source changes to prevent mismatched data display
                        }}
                        className="p-3 bg-[#f4f9f5] border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-sm font-medium pr-8"
                    >
                        <option value="production">Production</option>
                        <option value="sales">Sales (Orders)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Report Type</label>
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="p-3 bg-[#f4f9f5] border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-sm font-medium pr-8"
                    >
                        <option value="daily">Daily View</option>
                        <option value="monthly">Monthly View</option>
                        <option value="custom">Custom Range</option>
                    </select>
                </div>

                {/* Dynamic Date Inputs based on Type */}
                {reportType === "daily" && (
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="p-3 bg-[#f4f9f5] border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-sm"
                        />
                    </div>
                )}

                {reportType === "monthly" && (
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Month</label>
                        <input
                            type="month"
                            value={monthYear}
                            onChange={(e) => setMonthYear(e.target.value)}
                            className="p-3 bg-[#f4f9f5] border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-sm"
                        />
                    </div>
                )}

                {reportType === "custom" && (
                    <>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="p-3 bg-[#f4f9f5] border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="p-3 bg-[#f4f9f5] border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-sm"
                            />
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#152815]/70">Filter By Grade</label>
                    <select
                        value={gradeFilter}
                        onChange={(e) => setGradeFilter(e.target.value)}
                        className="p-3 bg-[#f4f9f5] border border-[#c8e6c9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2e7d32]/20 text-sm font-medium pr-8"
                    >
                        <option value="all">All Grades</option>
                        <option value="market">Market Only</option>
                        <option value="retail">Retail Only</option>
                        <option value="powder">Powder Only</option>
                    </select>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="ml-auto p-3 px-8 bg-[#2e7d32] text-white rounded-xl font-medium hover:bg-[#1b431d] transition-colors shadow-sm disabled:opacity-50"
                >
                    {isLoading ? "Generating..." : "Generate Report"}
                </button>
            </div>

            {/* RESULTS SECTIONS */}
            {hasGenerated && (
                <>
                    {/* SECTION A — Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5">
                            <h3 className="text-xs font-bold text-[#152815]/50 uppercase tracking-widest mb-2">Total Yield</h3>
                            <p className="text-4xl font-heading text-[#152815]">{summary.total.toLocaleString()}<span className="text-lg text-[#152815]/50 ml-1">eggs</span></p>
                            <p className="text-sm font-bold text-[#2e7d32]">{summary.weightKg} kg</p>
                        </div>
                        <div className="bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5">
                            <h3 className="text-xs font-bold text-[#152815]/50 uppercase tracking-widest mb-2">Averge Weight</h3>
                            <p className="text-4xl font-heading text-[#152815]">{summary.avgWeight}<span className="text-lg text-[#152815]/50 ml-1">g</span></p>
                        </div>
                        <div className="bg-white rounded-[1rem] p-6 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col gap-2 justify-center">
                            <h3 className="text-xs font-bold text-[#152815]/50 uppercase tracking-widest mb-1">Grade Splits</h3>
                            <div className="flex items-center justify-between text-sm font-medium"><span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.market }}></div> Market</span> <span>{summary.marketPct}%</span></div>
                            <div className="flex items-center justify-between text-sm font-medium"><span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.retail }}></div> Retail</span> <span>{summary.retailPct}%</span></div>
                            <div className="flex items-center justify-between text-sm font-medium"><span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.powder }}></div> Powder</span> <span>{summary.powderPct}%</span></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        {/* SECTION B — Pie Chart */}
                        <div className="lg:col-span-1 bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col items-center">
                            <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest w-full text-left mb-6">Grade Distribution</h3>
                            <div className="w-full h-[300px]">
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={renderTooltipContent} />
                                            <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#152815]/30 text-sm font-medium">No Grade Data</div>
                                )}
                            </div>
                        </div>

                        {/* SECTION C — Line Chart */}
                        <div className="lg:col-span-2 bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 flex flex-col">
                            <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest w-full text-left mb-6">Volume Production Over Time</h3>
                            <div className="flex-1 w-full min-h-[300px]">
                                {lineData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#152815', opacity: 0.5 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#152815', opacity: 0.5 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #c8e6c9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                                                cursor={{ stroke: '#c8e6c9', strokeWidth: 1, strokeDasharray: "5 5" }}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />

                                            {(gradeFilter === "all" || gradeFilter === "market") && (
                                                <Line type="monotone" dataKey="market" name="Market Counts" stroke={COLORS.market} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                            )}
                                            {(gradeFilter === "all" || gradeFilter === "retail") && (
                                                <Line type="monotone" dataKey="retail" name="Retail Counts" stroke={COLORS.retail} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                            )}
                                            {(gradeFilter === "all" || gradeFilter === "powder") && (
                                                <Line type="monotone" dataKey="powder" name="Powder Counts" stroke={COLORS.powder} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                            )}
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#152815]/30 text-sm font-medium border border-[#c8e6c9] border-dashed rounded-xl">No Timeline Data</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SECTION D — Data Table & Export */}
                    <div className="bg-white rounded-[1rem] p-8 shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <div className="flex items-end justify-between mb-6">
                            <h3 className="text-sm font-bold text-[#152815]/50 uppercase tracking-widest text-left">Aggregated Data Record</h3>
                            <button
                                onClick={handleExportCSV}
                                className="px-5 py-2 text-sm bg-white border border-[#c8e6c9] text-[#2e7d32] font-semibold tracking-wide rounded-xl hover:bg-[#f4f9f5] transition-colors shadow-sm"
                            >
                                Download CSV
                            </button>
                        </div>

                        <div className="border border-[#c8e6c9]/60 rounded-xl overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[#f4f9f5]">
                                    <tr className="text-[#152815]/70 text-xs tracking-wider uppercase">
                                        <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] min-w-[120px]">Time / Date</th>
                                        <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] text-center" style={{ color: COLORS.market }}>Market Eggs</th>
                                        {dataSource !== "sales" && <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] text-right" style={{ color: COLORS.market }}>Market kg</th>}
                                        <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] text-center" style={{ color: COLORS.retail }}>Retail Eggs</th>
                                        {dataSource !== "sales" && <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] text-right" style={{ color: COLORS.retail }}>Retail kg</th>}
                                        <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] text-center" style={{ color: COLORS.powder }}>Powder Eggs</th>
                                        {dataSource !== "sales" && <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] text-right" style={{ color: COLORS.powder }}>Powder kg</th>}
                                        <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] bg-[#d7ecd7]/30 text-center text-[#152815]">Total Eggs</th>
                                        {dataSource !== "sales" && <th className="py-4 px-4 font-bold border-b border-[#c8e6c9] bg-[#d7ecd7]/30 text-right text-[#152815]">Total kg</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="py-8 text-center text-[#152815]/40 font-medium">No results matched the filters.</td>
                                        </tr>
                                    ) : (
                                        tableData.map((row, idx) => (
                                            <tr key={idx} className="border-b border-[#f4f9f5] hover:bg-[#f4f9f5]/50 transition-colors">
                                                <td className="py-3 px-4 font-semibold text-[#152815]">{row.label}</td>
                                                <td className="py-3 px-4 text-center text-[#152815]/80">{row.market.toLocaleString()}</td>
                                                {dataSource !== "sales" && <td className="py-3 px-4 text-right text-[#152815]/80 font-heading">{row.marketKg.toFixed(2)}</td>}
                                                <td className="py-3 px-4 text-center text-[#152815]/80">{row.retail.toLocaleString()}</td>
                                                {dataSource !== "sales" && <td className="py-3 px-4 text-right text-[#152815]/80 font-heading">{row.retailKg.toFixed(2)}</td>}
                                                <td className="py-3 px-4 text-center text-[#152815]/80">{row.powder.toLocaleString()}</td>
                                                {dataSource !== "sales" && <td className="py-3 px-4 text-right text-[#152815]/80 font-heading">{row.powderKg.toFixed(2)}</td>}
                                                <td className="py-3 px-4 text-center font-bold bg-[#d7ecd7]/10 text-[#152815]">{row.total.toLocaleString()}</td>
                                                {dataSource !== "sales" && <td className="py-3 px-4 text-right font-bold bg-[#d7ecd7]/10 text-[#2e7d32]">{row.totalKg.toFixed(2)}</td>}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}
