"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
    User, Mail, Phone, Store, MapPin,
    CheckCircle, ChevronRight, Loader2, Egg,
    Building2, ShoppingCart, Users, ArrowLeft, Truck, Lock
} from "lucide-react";

const CUSTOMER_TYPES = [
    { id: "market", label: "Market", desc: "Bulk market supply", icon: <Store className="w-6 h-6" />, color: "border-secondary text-secondary shadow-brutal translate-y-[-2px] bg-accent" },
    { id: "retail", label: "Retail", desc: "Retail store or supermarket", icon: <ShoppingCart className="w-6 h-6" />, color: "border-secondary text-white shadow-brutal translate-y-[-2px] bg-primary" },
    { id: "company", label: "Company", desc: "Business or institution", icon: <Building2 className="w-6 h-6" />, color: "border-secondary text-white shadow-brutal translate-y-[-2px] bg-secondary" },
    { id: "individual", label: "Individual", desc: "Personal or household use", icon: <Users className="w-6 h-6" />, color: "border-secondary text-secondary shadow-brutal translate-y-[-2px] bg-white" },
];

const GRADES = [
    { id: "market", label: "Market", color: "border-secondary bg-accent text-secondary shadow-brutal-sm translate-y-[-2px]" },
    { id: "retail", label: "Retail", color: "border-secondary bg-primary text-white shadow-brutal-sm translate-y-[-2px]" },
    { id: "powder", label: "Powder", color: "border-secondary bg-white text-secondary shadow-brutal-sm translate-y-[-2px]" },
];

const FREQUENCIES = ["Daily", "Every 2 Days", "Every 3 Days", "Weekly", "Bi-weekly", "Monthly"];

export default function RegisterPage() {
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        owner_name: "",
        email: "",
        phone: "",
        shop_name: "",
        location: "",
        customer_type: "",
        delivery_frequency: "Weekly",
        initial_quantity_kg: 1,
        preferred_grade: "",
        password: "",
        confirm_password: ""
    });

    const [validationErrors, setValidationErrors] = useState({});

    const validate = () => {
        const errors = {};
        if (!form.owner_name) errors.owner_name = "Full name is required";
        if (!form.email) errors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) errors.email = "Invalid email format";
        if (!form.phone) errors.phone = "Phone number is required";
        else if (form.phone.length < 10) errors.phone = "Phone must be at least 10 digits";
        if (!form.shop_name) errors.shop_name = "Shop name is required";
        if (!form.location) errors.location = "Location is required";
        if (!form.customer_type) errors.customer_type = "Please select a customer type";
        if (!form.preferred_grade) errors.preferred_grade = "Please select a preferred grade";
        if (form.initial_quantity_kg <= 0) errors.initial_quantity_kg = "Quantity must be greater than 0";
        if (!form.password) errors.password = "Password is required";
        else if (form.password.length < 6) errors.password = "Password must be at least 6 characters";
        if (form.password !== form.confirm_password) errors.confirm_password = "Passwords do not match";

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (!validate()) return;

        setLoading(true);
        try {
            // Register with Supabase Auth (handles password hashing securely)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
            });

            if (authError) throw authError;

            // Create customer profile without storing the password
            const { error: insertError } = await supabase
                .from("customers")
                .insert([{
                    email: form.email, // Use email as PK to handle conflicts gracefully if auth succeeded but DB failed before
                    owner_name: form.owner_name,
                    shop_name: form.shop_name,
                    email: form.email,
                    phone: form.phone,
                    location: form.location,
                    delivery_frequency: form.delivery_frequency,
                    initial_quantity_kg: form.initial_quantity_kg,
                    preferred_grade: form.preferred_grade,
                    type: form.customer_type,
                    status: "pending"
                }]);

            if (insertError) throw insertError;

            // Ensure they are not logged in yet (pending admin approval or email confirmation)
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session) {
                await supabase.auth.signOut();
            }

            setSubmitted(true);
        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <main className="min-h-screen flex items-center justify-center p-6 bg-background">
                <div className="w-full max-w-lg bg-white border-[6px] border-secondary p-12 text-center shadow-brutal-lg">
                    <div className="w-24 h-24 bg-accent border-4 border-secondary flex items-center justify-center mx-auto mb-8 shadow-brutal-sm">
                        <CheckCircle className="w-12 h-12 text-secondary" />
                    </div>
                    <h1 className="text-4xl font-heading font-black text-secondary mb-4 uppercase">Application Submitted Successfully.</h1>
                    <div className="space-y-6 mb-10">
                        <p className="text-secondary font-bold text-lg">Under review.</p>
                        <p className="text-secondary font-bold text-sm bg-primary text-white p-4 border-4 border-secondary shadow-brutal-sm uppercase tracking-wide leading-relaxed">
                            Will be approved within 10 minutes.
                        </p>
                    </div>
                    <Link href="/" className="btn-primary w-full flex items-center justify-center gap-2 py-4">
                        <ArrowLeft className="w-5 h-5" /> Return to Base
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-background py-16 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-secondary hover:underline underline-offset-4 decoration-2 mb-12 bg-white px-3 py-2 border-2 border-secondary shadow-brutal-sm">
                    <ArrowLeft className="w-4 h-4" /> Abort & Return
                </Link>

                <div className="mb-12 border-l-[12px] border-primary pl-6 py-2">
                    <h1 className="text-5xl lg:text-6xl font-heading font-black text-secondary mb-2 uppercase tracking-tighter">New Entity</h1>
                    <p className="text-secondary font-bold uppercase tracking-widest bg-accent inline-block px-2 border-2 border-secondary">Establish Connection.</p>
                </div>

                {error && (
                    <div className="mb-8 p-4 bg-primary border-4 border-secondary text-white text-sm font-bold uppercase tracking-wider shadow-brutal-sm flex items-center gap-3 animate-shake">
                        <CheckCircle className="w-5 h-5 rotate-45" /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-12">
                    {/* PERSONAL & SHOP DETAILS */}
                    <div className="bg-white p-8 lg:p-12 border-[6px] border-secondary shadow-brutal-lg relative">
                        <div className="absolute top-0 right-0 bg-secondary text-white font-heading font-black text-4xl px-4 py-2 pointer-events-none border-b-[6px] border-l-[6px] border-secondary">01</div>

                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-accent border-4 border-secondary flex items-center justify-center shadow-brutal-sm">
                                <User className="w-6 h-6 text-secondary" />
                            </div>
                            <h2 className="text-2xl font-heading font-black text-secondary uppercase tracking-tight">Identity Details</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Owner Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={form.owner_name}
                                        onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                                        className={`w-full pl-12 pr-4 py-4 bg-white border-4 ${validationErrors.owner_name ? 'border-primary ring-4 ring-primary/20' : 'border-secondary'} rounded-none outline-none focus:bg-accent/10 transition-colors font-bold text-secondary placeholder:text-secondary/30 shadow-brutal-sm`}
                                    />
                                </div>
                                {validationErrors.owner_name && <span className="text-xs text-primary font-bold uppercase tracking-widest px-1">{validationErrors.owner_name}</span>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                    <input
                                        type="email"
                                        placeholder="name@email.com"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className={`w-full pl-12 pr-4 py-4 bg-white border-4 ${validationErrors.email ? 'border-primary ring-4 ring-primary/20' : 'border-secondary'} rounded-none outline-none focus:bg-accent/10 transition-colors font-bold text-secondary placeholder:text-secondary/30 shadow-brutal-sm`}
                                    />
                                </div>
                                {validationErrors.email && <span className="text-xs text-primary font-bold uppercase tracking-widest px-1">{validationErrors.email}</span>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Comm Channel</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                    <input
                                        type="text"
                                        placeholder="Phone Number"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className={`w-full pl-12 pr-4 py-4 bg-white border-4 ${validationErrors.phone ? 'border-primary ring-4 ring-primary/20' : 'border-secondary'} rounded-none outline-none focus:bg-accent/10 transition-colors font-bold text-secondary placeholder:text-secondary/30 shadow-brutal-sm`}
                                    />
                                </div>
                                {validationErrors.phone && <span className="text-xs text-primary font-bold uppercase tracking-widest px-1">{validationErrors.phone}</span>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Entity Name</label>
                                <div className="relative">
                                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                    <input
                                        type="text"
                                        placeholder="Shop / Company Name"
                                        value={form.shop_name}
                                        onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                                        className={`w-full pl-12 pr-4 py-4 bg-white border-4 ${validationErrors.shop_name ? 'border-primary ring-4 ring-primary/20' : 'border-secondary'} rounded-none outline-none focus:bg-accent/10 transition-colors font-bold text-secondary placeholder:text-secondary/30 shadow-brutal-sm`}
                                    />
                                </div>
                                {validationErrors.shop_name && <span className="text-xs text-primary font-bold uppercase tracking-widest px-1">{validationErrors.shop_name}</span>}
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Coordinates</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-5 w-5 h-5 text-secondary" />
                                    <textarea
                                        rows={3}
                                        placeholder="Full Physical Address"
                                        value={form.location}
                                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                                        className={`w-full pl-12 pr-4 py-4 bg-white border-4 ${validationErrors.location ? 'border-primary ring-4 ring-primary/20' : 'border-secondary'} rounded-none outline-none focus:bg-accent/10 transition-colors font-bold text-secondary placeholder:text-secondary/30 shadow-brutal-sm`}
                                    />
                                </div>
                                {validationErrors.location && <span className="text-xs text-primary font-bold uppercase tracking-widest px-1">{validationErrors.location}</span>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Passcode</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className={`w-full pl-12 pr-4 py-4 bg-white border-4 ${validationErrors.password ? 'border-primary ring-4 ring-primary/20' : 'border-secondary'} rounded-none outline-none focus:bg-accent/10 transition-colors font-bold text-secondary placeholder:text-secondary/30 shadow-brutal-sm`}
                                    />
                                </div>
                                {validationErrors.password && <span className="text-xs text-primary font-bold uppercase tracking-widest px-1">{validationErrors.password}</span>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Verify Passcode</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={form.confirm_password}
                                        onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                                        className={`w-full pl-12 pr-4 py-4 bg-white border-4 ${validationErrors.confirm_password ? 'border-primary ring-4 ring-primary/20' : 'border-secondary'} rounded-none outline-none focus:bg-accent/10 transition-colors font-bold text-secondary placeholder:text-secondary/30 shadow-brutal-sm`}
                                    />
                                </div>
                                {validationErrors.confirm_password && <span className="text-xs text-primary font-bold uppercase tracking-widest px-1">{validationErrors.confirm_password}</span>}
                            </div>
                        </div>
                    </div>

                    {/* CUSTOMER TYPE */}
                    <div className="bg-white p-8 lg:p-12 border-[6px] border-secondary shadow-brutal-lg relative">
                        <div className="absolute top-0 right-0 bg-secondary text-white font-heading font-black text-4xl px-4 py-2 pointer-events-none border-b-[6px] border-l-[6px] border-secondary">02</div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-primary border-4 border-secondary flex items-center justify-center shadow-brutal-sm">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-heading font-black text-secondary uppercase tracking-tight">Classification</h2>
                        </div>

                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary/60 mb-8 max-w-sm">Determine your operational mode.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {CUSTOMER_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setForm({ ...form, customer_type: type.id })}
                                    className={`flex flex-col items-start p-6 border-4 transition-all text-left group ${form.customer_type === type.id
                                        ? type.color
                                        : "border-secondary bg-white text-secondary opacity-60 hover:opacity-100 hover:shadow-brutal-sm hover:translate-y-[-2px]"
                                        }`}
                                >
                                    <div className={`mb-4 w-12 h-12 flex items-center justify-center border-4 border-secondary bg-white text-secondary transition-transform ${form.customer_type === type.id ? 'scale-110 shadow-brutal-sm' : 'group-hover:scale-110'}`}>
                                        {type.icon}
                                    </div>
                                    <h3 className="text-xl font-heading font-black tracking-tight uppercase mb-2">{type.label}</h3>
                                    <p className="text-xs font-bold uppercase tracking-widest leading-relaxed opacity-80">{type.desc}</p>
                                </button>
                            ))}
                        </div>
                        {validationErrors.customer_type && <span className="text-xs text-primary font-bold uppercase tracking-widest mt-4 block">{validationErrors.customer_type}</span>}
                    </div>

                    {/* DELIVERY PREFERENCES */}
                    <div className="bg-white p-8 lg:p-12 border-[6px] border-secondary shadow-brutal-lg relative">
                        <div className="absolute top-0 right-0 bg-secondary text-white font-heading font-black text-4xl px-4 py-2 pointer-events-none border-b-[6px] border-l-[6px] border-secondary">03</div>

                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-accent border-4 border-secondary flex items-center justify-center shadow-brutal-sm">
                                <Truck className="w-6 h-6 text-secondary" />
                            </div>
                            <h2 className="text-2xl font-heading font-black text-secondary uppercase tracking-tight">Logistics</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Frequency</label>
                                <select
                                    value={form.delivery_frequency}
                                    onChange={(e) => setForm({ ...form, delivery_frequency: e.target.value })}
                                    className="w-full px-4 py-5 bg-white border-4 border-secondary rounded-none outline-none focus:bg-accent/10 transition-colors font-bold text-secondary uppercase tracking-widest shadow-brutal-sm cursor-pointer appearance-none"
                                >
                                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Initial Load (KG)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.initial_quantity_kg}
                                    onChange={(e) => setForm({ ...form, initial_quantity_kg: parseInt(e.target.value) || 0 })}
                                    className={`w-full px-4 py-4 bg-white border-4 ${validationErrors.initial_quantity_kg ? 'border-primary' : 'border-secondary'} rounded-none outline-none focus:bg-accent/10 transition-colors font-heading text-4xl font-black text-secondary text-center shadow-brutal-sm`}
                                />
                                {validationErrors.initial_quantity_kg && <span className="text-xs text-primary font-bold uppercase tracking-widest">{validationErrors.initial_quantity_kg}</span>}
                            </div>

                            <div className="flex flex-col gap-4 md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit shadow-brutal-sm">Prime Grade Specification</label>
                                <div className="flex flex-col sm:flex-row gap-6">
                                    {GRADES.map((grade) => (
                                        <button
                                            key={grade.id}
                                            type="button"
                                            onClick={() => setForm({ ...form, preferred_grade: grade.id })}
                                            className={`flex-1 py-6 px-6 font-heading font-black text-2xl uppercase tracking-tighter border-4 transition-all ${form.preferred_grade === grade.id
                                                ? grade.color
                                                : "border-secondary bg-white text-secondary opacity-50 hover:opacity-100 hover:shadow-brutal-sm hover:-translate-y-1"
                                                }`}
                                        >
                                            {grade.label}
                                        </button>
                                    ))}
                                </div>
                                {validationErrors.preferred_grade && <span className="text-xs text-primary font-bold uppercase tracking-widest">{validationErrors.preferred_grade}</span>}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-8 border-[6px] border-secondary bg-primary text-white font-heading font-black text-3xl uppercase tracking-widest shadow-brutal hover:shadow-brutal-lg hover:-translate-y-2 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-brutal"
                    >
                        {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : "Initiate Protocol"}
                        {!loading && <span className="font-heading">&rarr;</span>}
                    </button>
                </form>

                <p className="mt-16 text-center text-sm font-bold uppercase tracking-widest text-secondary pb-16">
                    Existing Entity? <Link href="/login" className="bg-white border-2 border-secondary px-3 py-1 hover:bg-accent transition-colors shadow-brutal-sm ml-2 decoration-transparent">Authenticate Here</Link>
                </p>
            </div>
        </main>
    );
}
