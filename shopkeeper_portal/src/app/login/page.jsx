"use client";

import { useState } from "react";
import { useShop } from "@/components/ShopProvider";
import { useRouter } from "next/navigation";
import { Egg, Lock, Mail, Loader2, Clock, XCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
    const { login } = useShop();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [approvalStatus, setApprovalStatus] = useState(null); // 'pending', 'rejected', 'no_account'
    const [customerData, setCustomerData] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const { user, shop: customer } = await login(email, password);

            if (!customer) {
                await supabase.auth.signOut();
                setApprovalStatus('no_account');
                return;
            }

            if (customer.status === 'approved') {
                router.push("/shop/dashboard");
            } else {
                // If not approved, sign out so they don't stay logged in
                await supabase.auth.signOut();
                setCustomerData(customer);
                setApprovalStatus(customer.status);
            }
        } catch (err) {
            let errorMsg = err.message || "Invalid login credentials.";
            if (errorMsg === "EMAIL_NOT_CONFIRMED") {
                errorMsg = "Your email has not been confirmed yet. Please check your inbox for a verification link from Supabase.";
            } else if (errorMsg === "Invalid login credentials") {
                errorMsg = "Invalid credentials. Please register first to access the dashboard.";
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-accent border-4 border-secondary flex items-center justify-center mb-4 shadow-brutal-sm">
                        <Egg className="w-8 h-8 text-secondary" />
                    </div>
                    <h1 className="text-4xl font-heading font-black text-secondary uppercase tracking-tighter">EggTrack</h1>
                    <p className="text-secondary font-bold uppercase tracking-widest text-xs bg-white border-2 border-secondary px-2 py-1 mt-2 shadow-brutal-sm">Portal Access</p>
                </div>

                <div className="theme-card p-8 bg-white border-[6px] border-secondary shadow-brutal-lg">
                    {approvalStatus === 'pending' ? (
                        <div className="flex flex-col items-center text-center py-4">
                            <div className="w-16 h-16 bg-accent border-4 border-secondary flex items-center justify-center mb-6 shadow-brutal-sm">
                                <Clock className="w-8 h-8 text-secondary" />
                            </div>
                            <h2 className="text-3xl font-heading font-black text-secondary mb-4 uppercase">Pending</h2>
                            <p className="text-secondary font-bold mb-2">Your application is under review.</p>
                            <p className="text-secondary/70 text-xs mb-8 uppercase tracking-widest font-bold">Your account will be opened within 10 min.</p>

                            <div className="w-full bg-surface border-4 border-secondary p-6 mb-8 text-left space-y-4 shadow-brutal-sm">
                                <div>
                                    <span className="block text-[10px] font-black uppercase tracking-widest text-secondary/50 mb-1">Shop</span>
                                    <span className="block font-black text-secondary text-lg uppercase">{customerData?.shop_name}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-black uppercase tracking-widest text-secondary/50 mb-1">Type</span>
                                    <span className="inline-block bg-primary text-white px-2 py-1 font-black text-xs uppercase tracking-widest border-2 border-secondary">{customerData?.type}</span>
                                </div>
                                <div className="pt-2 border-t-2 border-secondary/20">
                                    <span className="font-bold text-xs text-secondary">{new Date(customerData?.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <Link
                                href="/"
                                className="w-full py-4 bg-white border-4 border-secondary text-secondary font-black text-sm uppercase tracking-widest hover:bg-secondary hover:text-white transition-colors flex items-center justify-center gap-2 shadow-brutal-sm hover:shadow-none translate-y-0 hover:translate-y-1"
                            >
                                <ArrowLeft className="w-5 h-5" /> Return Home
                            </Link>
                        </div>
                    ) : approvalStatus === 'rejected' ? (
                        <div className="flex flex-col items-center text-center py-4">
                            <div className="w-16 h-16 bg-primary border-4 border-secondary flex items-center justify-center mb-6 shadow-brutal-sm">
                                <XCircle className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-heading font-black text-secondary mb-4 uppercase">Rejected</h2>
                            <p className="text-secondary font-bold mb-2">Registration denied.</p>
                            <p className="text-secondary/70 text-xs mb-8 uppercase font-bold tracking-widest">Contact support for details.</p>

                            <div className="flex flex-col gap-4 w-full">
                                <a
                                    href="mailto:support@eggtrack.com"
                                    className="w-full py-4 bg-primary border-4 border-secondary text-white font-black text-sm uppercase tracking-widest hover:bg-white hover:text-primary transition-colors shadow-brutal-sm hover:translate-y-1 hover:shadow-none text-center"
                                >
                                    Contact Support
                                </a>
                                <Link
                                    href="/"
                                    className="w-full py-4 bg-white border-4 border-secondary text-secondary font-black text-sm uppercase tracking-widest hover:bg-secondary hover:text-white transition-colors flex items-center justify-center gap-2 shadow-brutal-sm hover:translate-y-1 hover:shadow-none"
                                >
                                    <ArrowLeft className="w-5 h-5" /> Return Home
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-heading font-black mb-8 text-secondary uppercase border-b-4 border-secondary pb-4">Agent Login</h2>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit">Email Identity</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                        <input
                                            type="email"
                                            required
                                            placeholder="name@gmail.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-white border-4 border-secondary focus:ring-0 focus:outline-none focus:bg-accent/10 transition-colors text-secondary font-bold placeholder:text-secondary/30 rounded-none shadow-brutal-sm"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-secondary bg-accent border-2 border-secondary px-2 py-1 w-fit">Passcode</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                                        <input
                                            type="password"
                                            required
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-white border-4 border-secondary focus:ring-0 focus:outline-none focus:bg-accent/10 transition-colors text-secondary font-bold placeholder:text-secondary/30 rounded-none shadow-brutal-sm"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-primary text-white text-sm font-bold border-4 border-secondary shadow-brutal-sm uppercase">
                                        {error}
                                    </div>
                                )}

                                {approvalStatus === 'no_account' && (
                                    <div className="p-4 bg-accent border-4 border-secondary text-secondary text-sm font-bold shadow-brutal-sm flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <ShieldAlert className="w-6 h-6" />
                                            <span className="uppercase">Identity Not Found.</span>
                                        </div>
                                        <Link href="/register" className="bg-white border-2 border-secondary px-3 py-2 text-center text-xs uppercase tracking-widest hover:bg-secondary hover:text-white transition-colors">
                                            Initialize Registration
                                        </Link>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary mt-4 flex items-center justify-center gap-3 py-5 text-lg"
                                >
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Authenticate"}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <div className="mt-8 text-center bg-white border-4 border-secondary p-4 shadow-brutal">
                    <p className="text-xs text-secondary font-bold uppercase tracking-widest leading-relaxed">
                        Unregistered? <br />
                        <Link href="/register" className="text-primary hover:text-secondary underline decoration-2 underline-offset-4 bg-accent px-1">Establish connection here.</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
