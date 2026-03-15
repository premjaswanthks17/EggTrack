"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getCustomers, updateCustomerStatus } from "./actions";
import {
    Users,
    UserCheck,
    UserX,
    Phone,
    MapPin,
    Truck,
    Package,
    Clock,
    Search,
    Download,
    CheckCircle2,
    XCircle,
    Info,
    ChevronDown,
    ChevronUp,
    MoreHorizontal,
    Loader2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const TYPE_COLORS = {
    market: "bg-yellow-50 text-yellow-700 border-yellow-200",
    retail: "bg-green-50 text-green-700 border-green-200",
    company: "bg-blue-50 text-blue-700 border-blue-200",
    individual: "bg-purple-50 text-purple-700 border-purple-200",
};

// Simple relative time formatter
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function CustomersPage() {
    const { toast } = useToast();
    const [pending, setPending] = useState([]);
    const [approved, setApproved] = useState([]);
    const [rejected, setRejected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPendingOpen, setIsPendingOpen] = useState(true);
    const [isActiveOpen, setIsActiveOpen] = useState(true);
    const [showRejected, setShowRejected] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const fetchData = async () => {
        const [p, a, r] = await Promise.all([
            getCustomers("pending"),
            getCustomers("approved"),
            getCustomers("rejected"),
        ]);
        setPending(p);
        setApproved(a);
        setRejected(r);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel("customer-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "customers" },
                () => {
                    fetchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleAction = async (customer, status) => {
        const { id, shop_name: shopName } = customer;
        try {
            await updateCustomerStatus(id, status, shopName, customer);
            toast({
                title: `Customer ${status}`,
                description: `${shopName} has been marked as ${status}.`,
                variant: status === "rejected" ? "destructive" : "default",
            });
            fetchData();
        } catch (error) {
            toast({
                title: "Action failed",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const exportCSV = (data, filename) => {
        const headers = ["Shop Name", "Owner", "Type", "Location", "Phone", "Frequency", "Quantity (kg)", "Status"];
        const csvContent = [
            headers.join(","),
            ...data.map(c => [
                `"${c.shop_name}"`,
                `"${c.owner_name}"`,
                `"${c.type}"`,
                `"${c.location}"`,
                `"${c.phone}"`,
                `"${c.delivery_frequency}"`,
                c.initial_quantity_kg,
                c.status
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredApproved = useMemo(() => {
        return approved.filter(c =>
            (c.shop_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.location || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [approved, searchQuery]);

    const groupedCustomers = useMemo(() => {
        return filteredApproved.reduce((acc, c) => {
            if (!acc[c.type]) acc[c.type] = [];
            acc[c.type].push(c);
            return acc;
        }, {});
    }, [filteredApproved]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <Loader2 className="w-10 h-10 text-[#2e7d32] animate-spin mb-4" />
            <span className="text-sm font-bold opacity-30 uppercase tracking-widest">Loading Customers...</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-12 pb-20">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-[#2e7d32]" />
                    <h1 className="text-4xl font-heading font-bold text-[#152815]">Customer Management</h1>
                </div>
                <p className="text-[#152815]/50 font-medium">Approve requests and manage your active retail network.</p>
            </header>

            {/* SECTION 1: PENDING */}
            <section className="flex flex-col gap-6">
                <button
                    onClick={() => setIsPendingOpen(!isPendingOpen)}
                    className="flex items-center justify-between group text-left"
                >
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-[#152815]">New Customer Requests</h2>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-black rounded-full border border-yellow-200">
                            {pending.length} PENDING
                        </span>
                    </div>
                    <div className="p-2 rounded-xl bg-[#f4f9f5] text-[#2e7d32] group-hover:bg-[#2e7d32] group-hover:text-white transition-all">
                        {isPendingOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </button>

                {isPendingOpen && (
                    <div className="animate-in slide-in-from-top-4 duration-300">
                        {pending.length === 0 ? (
                            <div className="bg-white rounded-[2rem] border border-[#d7ecd7]/50 p-12 text-center shadow-sm">
                                <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-[#152815]/40 italic tracking-tight">No pending requests 🎉</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pending.map((c) => (
                                    <div key={c.id} className="bg-white rounded-[2rem] border border-[#d7ecd7] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                        <div className="flex flex-col gap-5 h-full">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <h3 className="text-xl font-black text-[#152815] leading-tight tracking-tight">{c.shop_name}</h3>
                                                    <span className="text-xs font-bold text-[#152815]/50 flex items-center gap-1.5 mt-1">
                                                        <Clock className="w-3 h-3" /> {formatRelativeTime(c.created_at)}
                                                    </span>
                                                </div>
                                                <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", TYPE_COLORS[c.type] || "bg-gray-100 text-gray-700 border-gray-200")}>
                                                    {c.type}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-[#152815]/30 uppercase tracking-widest">Owner</span>
                                                    <span className="text-xs font-bold text-[#152815]">{c.owner_name}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 text-right">
                                                    <span className="text-[10px] font-black text-[#152815]/30 uppercase tracking-widest leading-none">Phone</span>
                                                    <span className="text-xs font-bold text-[#152815] flex items-center justify-end gap-1">
                                                        <Phone className="w-3 h-3 opacity-40 shrink-0" /> {c.phone}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 p-3 bg-[#f4f9f5] rounded-2xl border border-[#d7ecd7]/30">
                                                <MapPin className="w-3.5 h-3.5 text-[#2e7d32] shrink-0" />
                                                <span className="text-[11px] font-bold text-[#152815]/70 truncate">{c.location}</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mt-auto pt-2">
                                                <div className="flex items-center gap-2 opacity-60">
                                                    <Truck className="w-3.5 h-3.5 text-[#2e7d32]" />
                                                    <span className="text-[10px] font-black uppercase tracking-tighter">{c.delivery_frequency}</span>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-60 justify-end">
                                                    <Package className="w-3.5 h-3.5 text-[#2e7d32]" />
                                                    <span className="text-[10px] font-black uppercase tracking-tighter">{c.initial_quantity_kg}kg</span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    onClick={() => handleAction(c, "approved")}
                                                    className="flex-1 bg-[#2e7d32] text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1b5e20] transition-colors active:scale-95 shadow-sm"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(c, "rejected")}
                                                    className="p-3 border-2 border-red-50 text-red-100 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-95"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedCustomer(c)}
                                                    className="p-3 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all active:scale-95"
                                                >
                                                    <Info className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* SECTION 2: ACTIVE */}
            <section className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <button
                        onClick={() => setIsActiveOpen(!isActiveOpen)}
                        className="flex items-center gap-3 group text-left"
                    >
                        <h2 className="text-2xl font-bold text-[#152815]">Active Customers</h2>
                        <div className="p-2 rounded-xl bg-[#f4f9f5] text-[#2e7d32] group-hover:bg-[#2e7d32] group-hover:text-white transition-all">
                            {isActiveOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#152815]/30" />
                            <input
                                type="text"
                                placeholder="Search shop name or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-[#d7ecd7] rounded-2xl pl-11 pr-4 py-3 text-sm font-medium focus:ring-4 focus:ring-[#2e7d32]/10 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => exportCSV(filteredApproved, "active_customers")}
                            className="bg-white border border-[#d7ecd7] p-3 rounded-2xl hover:bg-gray-50 text-[#2e7d32] transition-all shadow-sm active:scale-95"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {isActiveOpen && (
                    <div className="flex flex-col gap-8 animate-in slide-in-from-top-4 duration-300">
                        {Object.keys(groupedCustomers).length === 0 ? (
                            <div className="bg-white rounded-[2.5rem] border border-[#d7ecd7] py-16 text-center text-[#152815]/20 font-black uppercase tracking-[0.2em] text-[10px] shadow-sm">
                                {searchQuery ? "No matches found in customer base" : "No active customers in database"}
                            </div>
                        ) : (
                            Object.entries(groupedCustomers).map(([type, customers]) => (
                                <div key={type} className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className={cn("w-2 h-2 rounded-full", type === 'market' ? 'bg-yellow-500' : type === 'retail' ? 'bg-green-500' : type === 'company' ? 'bg-blue-500' : 'bg-purple-500')}></div>
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#152815]/40">{type} Segment ({customers.length})</h3>
                                    </div>
                                    <div className="bg-white rounded-[2rem] border border-[#d7ecd7] shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="bg-[#fbfcff]">
                                                    <tr className="border-b border-[#d7ecd7]/30">
                                                        <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-[#152815]/30">Shop Name</th>
                                                        <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-[#152815]/30">Owner</th>
                                                        <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-[#152815]/30">Location</th>
                                                        <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-[#152815]/30 text-center">Initial Qty</th>
                                                        <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-[#152815]/30">Phone</th>
                                                        <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-[#152815]/30 text-right">Approved On</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[#d7ecd7]/10 italic font-body text-[13px]">
                                                    {customers.map(c => (
                                                        <tr key={c.id} className="group hover:bg-[#f4f9f5]/50 transition-colors">
                                                            <td className="py-5 px-8 font-black text-[#152815] tracking-tight">{c.shop_name}</td>
                                                            <td className="py-5 px-8 font-bold text-[#152815]/60">{c.owner_name}</td>
                                                            <td className="py-5 px-8 text-[#152815]/50 flex items-center gap-1.5 min-w-[150px]">
                                                                <MapPin className="w-3 h-3 shrink-0 opacity-40" /> {c.location}
                                                            </td>
                                                            <td className="py-5 px-8 text-center font-black text-[#2e7d32]">{c.initial_quantity_kg}kg</td>
                                                            <td className="py-5 px-8 font-medium text-[#152815]/40">{c.phone}</td>
                                                            <td className="py-5 px-8 text-right font-bold text-[#152815]/40 text-[11px]">
                                                                {c.approved_at ? new Date(c.approved_at).toLocaleDateString() : 'N/A'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </section>


            {/* SECTION 3: REJECTED */}
            <section className="flex flex-col gap-4 border-t border-[#d7ecd7]/30 pt-10">
                <button
                    onClick={() => setShowRejected(!showRejected)}
                    className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-[#d7ecd7]/40 shadow-sm hover:bg-gray-50 transition-all text-[#152815]/50"
                >
                    <div className="flex items-center gap-3">
                        <UserX className="w-6 h-6 shrink-0" />
                        <h2 className="text-xl font-bold tracking-tight">Rejected Customers Archive ({rejected.length})</h2>
                    </div>
                    {showRejected ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {showRejected && (
                    <div className="bg-white rounded-[2rem] border border-red-50/50 shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-300">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap opacity-60 hover:opacity-100 transition-opacity">
                                <thead className="bg-[#fbfcff]">
                                    <tr className="border-b border-red-50/20">
                                        <th className="py-6 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-red-900/40">Shop Name</th>
                                        <th className="py-6 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-red-900/40">Owner</th>
                                        <th className="py-6 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-red-900/40">Type</th>
                                        <th className="py-6 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-red-900/40">Reason/Log</th>
                                        <th className="py-6 px-8 text-[9px] font-black uppercase tracking-[0.2em] text-red-900/40 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-50/5 italic font-body text-[12px]">
                                    {rejected.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-12 text-center text-[#152815]/20 font-black uppercase tracking-[0.2em] text-[9px]">
                                                Archive Empty
                                            </td>
                                        </tr>
                                    ) : (
                                        rejected.map(c => (
                                            <tr key={c.id} className="group hover:bg-red-50/20">
                                                <td className="py-5 px-8 font-bold text-[#152815]">{c.shop_name}</td>
                                                <td className="py-5 px-8 text-[#152815]/60">{c.owner_name}</td>
                                                <td className="py-5 px-8 uppercase text-[9px] font-black opacity-40">{c.type}</td>
                                                <td className="py-5 px-8 text-[10px] text-red-900/40 font-bold truncate max-w-[200px]">REJECTED ON {new Date(c.created_at).toLocaleDateString()}</td>
                                                <td className="py-5 px-8 text-right">
                                                    <button
                                                        onClick={() => handleAction(c, "approved")}
                                                        className="text-[9px] font-black uppercase tracking-widest text-[#2e7d32] border border-[#2e7d32]/20 px-4 py-2 rounded-xl hover:bg-[#2e7d32] hover:text-white transition-all active:scale-95"
                                                    >
                                                        Re-approve
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            {/* CUSTOMER DETAILS MODAL */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#152815]/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl border border-[#d7ecd7]/30 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-10 flex flex-col gap-10 overflow-y-auto">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-3">
                                    <span className={cn("inline-block px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.25em] border self-start", TYPE_COLORS[selectedCustomer.type])}>
                                        {selectedCustomer.type} Application
                                    </span>
                                    <h2 className="text-5xl font-heading font-black text-[#152815] tracking-tight italic">{selectedCustomer.shop_name}</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-4 bg-gray-50 text-gray-400 hover:text-[#152815] transition-colors rounded-3xl"
                                >
                                    <XCircle className="w-8 h-8" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                <DetailField icon={<UserCheck className="w-5 h-5" />} label="Primary Owner" value={selectedCustomer.owner_name} />
                                <DetailField icon={<Phone className="w-5 h-5" />} label="Contact Payload" value={selectedCustomer.phone} />
                                <DetailField icon={<MapPin className="w-5 h-5" />} label="Drop-off Coordinates" value={selectedCustomer.location} />
                                <DetailField icon={<Truck className="w-5 h-5" />} label="Logistics Frequency" value={selectedCustomer.delivery_frequency} />
                                <DetailField icon={<Package className="w-5 h-5" />} label="Initial Mass Requirements" value={`${selectedCustomer.initial_quantity_kg} kgs`} />
                                <DetailField icon={<Clock className="w-5 h-5" />} label="Registry Timestamp" value={new Date(selectedCustomer.created_at).toLocaleString()} />
                            </div>

                            {selectedCustomer.status === 'pending' && (
                                <div className="flex gap-4 pt-10 mt-auto">
                                    <button
                                        onClick={() => {
                                            handleAction(selectedCustomer, "approved");
                                            setSelectedCustomer(null);
                                        }}
                                        className="flex-1 bg-[#2e7d32] text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-[#1b5e20] transition-all active:scale-95"
                                    >
                                        Authorize Customer
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleAction(selectedCustomer, "rejected");
                                            setSelectedCustomer(null);
                                        }}
                                        className="px-10 border-4 border-red-50 text-red-500 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-red-50 transition-all active:scale-95"
                                    >
                                        Deny Access
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailField({ icon, label, value }) {
    return (
        <div className="flex gap-5 group">
            <div className="w-14 h-14 bg-[#f4f9f5] rounded-3xl flex items-center justify-center text-[#2e7d32] group-hover:scale-110 transition-transform shadow-sm">
                {icon}
            </div>
            <div className="flex flex-col justify-center">
                <span className="text-[10px] font-black text-[#152815]/30 uppercase tracking-[0.2em]">{label}</span>
                <span className="text-lg font-bold text-[#152815] italic tracking-tight">{value}</span>
            </div>
        </div>
    );
}
