"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Egg, CheckCircle, Truck, TrendingUp, ArrowRight } from "lucide-react";

export default function LandingPage() {
    const [prices, setPrices] = useState({
        market: 0,
        retail: 0,
        powder: 0
    });

    useEffect(() => {
        const fetchPrices = async () => {
            console.log("DEBUG: Fetching prices from Supabase...");
            const { data, error } = await supabase
                .from("egg_prices")
                .select("*");

            if (error) {
                console.error("DEBUG: Price fetch error:", error);
                return;
            }

            console.log("DEBUG: Received prices:", data);
            if (data && data.length > 0) {
                const priceMap = {};
                data.forEach(p => {
                    priceMap[p.grade] = p.price_per_egg;
                });
                setPrices(prev => ({ ...prev, ...priceMap }));
            } else {
                console.warn("DEBUG: No price data found in egg_prices table.");
            }
        };

        fetchPrices();

        // Realtime subscription
        const subscription = supabase
            .channel('price-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'egg_prices' }, payload => {
                setPrices(prev => ({
                    ...prev,
                    [payload.new.grade]: payload.new.price_per_egg
                }));
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-white">
            {/* HERO SECTION */}
            <section className="relative border-b-[6px] border-secondary overflow-hidden bg-background py-24 lg:py-40">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(var(--secondary)_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

                <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center justify-center p-4 border-4 border-secondary bg-accent shadow-brutal mb-8 hover:-translate-y-1 hover:shadow-brutal-lg transition-all">
                            <Egg className="w-10 h-10 text-secondary" />
                        </div>

                        <h1 className="text-6xl lg:text-8xl font-heading font-black text-secondary mb-6 leading-[0.9] uppercase tracking-tighter">
                            Direct <br /> From <br /> <span className="text-primary">Farm.</span>
                        </h1>

                        <p className="text-lg lg:text-xl text-secondary font-bold mb-12 max-w-xl leading-relaxed bg-white border-4 border-secondary p-6 shadow-brutal-sm">
                            Quality-graded eggs delivered on your schedule. <br />
                            The brutal truth: it's the smartest way to stock your shop.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-6">
                            <Link
                                href="/login"
                                className="w-full sm:w-auto px-8 py-5 bg-secondary text-white font-bold text-center border-4 border-secondary shadow-brutal uppercase tracking-wider hover:bg-white hover:text-secondary hover:-translate-y-1 hover:shadow-brutal-lg transition-all"
                            >
                                Login
                            </Link>
                            <Link
                                href="/register"
                                className="w-full sm:w-auto px-8 py-5 bg-primary text-white font-bold text-center border-4 border-secondary shadow-brutal uppercase tracking-wider hover:bg-white hover:text-primary hover:-translate-y-1 hover:shadow-brutal-lg transition-all"
                            >
                                Register Now
                            </Link>
                        </div>
                    </div>

                    {/* Hero Graphic */}
                    <div className="hidden lg:flex justify-end perspective-1000">
                        <div className="relative w-[400px] h-[500px] bg-accent border-[6px] border-secondary shadow-brutal-lg transform rotate-3 flex flex-col items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(30,53,47,0.1)_10px,rgba(30,53,47,0.1)_20px)]" />
                            <h2 className="text-[150px] font-heading font-black text-secondary leading-none z-10 mix-blend-overlay opacity-30 absolute -rotate-90 origin-center tracking-tighter w-[800px] text-center">EGG<br />TRACK</h2>
                            <Egg className="w-64 h-64 text-white z-20 drop-shadow-[8px_8px_0px_#1e352f]" />
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES SECTION */}
            <section className="py-24 border-b-[6px] border-secondary bg-surface relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-full bg-primary border-l-[6px] border-secondary z-0 rotate-2 scale-150 origin-bottom right-[-100px]" />
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="mb-20">
                        <span className="text-sm font-bold uppercase tracking-[0.2em] bg-secondary text-white px-3 py-1 border-2 border-secondary shadow-brutal-sm inline-block mb-4">Benefits</span>
                        <h2 className="text-5xl lg:text-7xl font-heading font-black text-secondary uppercase tracking-tight">Why Choose<br /><span className="bg-primary text-white px-4 leading-[1.2] inline-block shadow-brutal border-4 border-secondary transform -rotate-2 mt-2">EggTrack?</span></h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 bg-white border-4 border-secondary shadow-brutal hover:-translate-y-2 hover:shadow-brutal-lg transition-all relative group z-10">
                            <div className="absolute -top-6 -right-6 w-16 h-16 bg-accent border-4 border-secondary flex items-center justify-center shadow-brutal-sm rotate-12 group-hover:rotate-45 transition-transform">
                                <Egg className="w-8 h-8 text-secondary" />
                            </div>
                            <h3 className="text-2xl font-heading font-black text-secondary mb-4 uppercase mt-4">Quality<br />Graded</h3>
                            <div className="h-2 w-16 bg-primary mb-6 border-b-2 border-r-2 border-secondary" />
                            <p className="text-secondary font-medium text-sm leading-relaxed">
                                Every egg classified by weight into Market, Retail and Powder grades to ensure you get exactly what you pay for. No compromises.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-8 bg-white border-4 border-secondary shadow-brutal hover:-translate-y-2 hover:shadow-brutal-lg transition-all relative group z-10 mt-0 lg:mt-12">
                            <div className="absolute -top-6 -right-6 w-16 h-16 bg-primary border-4 border-secondary flex items-center justify-center shadow-brutal-sm -rotate-6 group-hover:-rotate-12 transition-transform">
                                <Truck className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-heading font-black text-secondary mb-4 uppercase mt-4">Flexible<br />Delivery</h3>
                            <div className="h-2 w-16 bg-accent mb-6 border-b-2 border-r-2 border-secondary" />
                            <p className="text-secondary font-medium text-sm leading-relaxed">
                                Choose daily, weekly or a custom delivery schedule that suits your shop's inventory needs perfectly. We adapt to you.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-8 bg-secondary border-4 border-secondary shadow-brutal hover:-translate-y-2 hover:shadow-brutal-lg transition-all relative group z-10 mt-0 lg:mt-24">
                            <div className="absolute -top-6 -right-6 w-16 h-16 bg-white border-4 border-secondary flex items-center justify-center shadow-brutal-sm rotate-3 group-hover:rotate-12 transition-transform">
                                <TrendingUp className="w-8 h-8 text-secondary" />
                            </div>
                            <h3 className="text-2xl font-heading font-black text-white mb-4 uppercase mt-4">Live<br />Pricing</h3>
                            <div className="h-2 w-16 bg-primary mb-6 border-b-2 border-r-2 border-secondary" />
                            <p className="text-white/80 font-medium text-sm leading-relaxed">
                                Transparent prices updated in real time directly from the farm management system as market rates shift. Total control.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* LIVE PRICING SECTION */}
            <section className="py-24 bg-accent relative border-b-[6px] border-secondary overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full bg-[radial-gradient(circle_at_center,var(--secondary)_2px,transparent_2px)] [background-size:32px_32px]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-6 bg-white border-4 border-secondary px-4 py-2 w-fit shadow-brutal-sm">
                                <div className="w-3 h-3 bg-primary border-2 border-secondary animate-pulse" />
                                <span className="font-bold text-xs uppercase tracking-widest text-secondary">Farm Feed Active</span>
                            </div>
                            <h2 className="text-5xl lg:text-7xl font-heading font-black text-secondary uppercase tracking-tight">Today's<br />Rates.</h2>
                        </div>
                        <p className="text-secondary font-bold text-lg uppercase max-w-sm text-left bg-white p-6 border-4 border-secondary shadow-brutal transform rotate-1">
                            Real-time data straight from the sorting conveyor.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-8">
                        {/* Market Grade Price Card */}
                        <div className="bg-white border-[6px] border-secondary shadow-brutal hover:shadow-brutal-lg hover:-translate-y-2 transition-all p-8 relative flex flex-col justify-between h-80 group">
                            <div className="absolute top-4 right-4 text-6xl text-secondary/5 font-heading font-black pointer-events-none group-hover:text-primary/10 transition-colors">01</div>
                            <div>
                                <span className="inline-block bg-secondary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 mb-4 border-2 border-secondary shadow-brutal-sm">Market</span>
                                <h3 className="text-3xl font-heading font-black text-secondary uppercase mb-2">Premium</h3>
                                <div className="flex items-center gap-2 border-b-2 border-secondary/20 pb-4">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-secondary uppercase">Weight &lt; 50g</span>
                                </div>
                            </div>

                            <div className="flex items-end gap-2 mt-auto">
                                <span className="text-6xl lg:text-5xl xl:text-6xl font-heading font-black text-secondary leading-none">₹{prices.market?.toFixed(2)}</span>
                                <span className="text-secondary font-bold uppercase text-xs mb-2">/ egg</span>
                            </div>
                        </div>

                        {/* Retail Grade Price Card */}
                        <div className="bg-primary border-[6px] border-secondary shadow-brutal-lg scale-100 lg:scale-105 z-10 p-8 relative flex flex-col justify-between h-80 group">
                            <div className="absolute top-4 right-4 text-6xl text-white/10 font-heading font-black pointer-events-none group-hover:text-accent/20 transition-colors">02</div>

                            <div className="absolute -top-6 -right-6 bg-accent border-4 border-secondary text-secondary font-black text-[12px] uppercase px-4 py-2 shadow-brutal rotate-6 z-20 hover:scale-110 transition-transform">
                                Most Popular!
                            </div>

                            <div>
                                <span className="inline-block bg-white text-primary text-[10px] font-bold uppercase tracking-widest px-3 py-1 mb-4 border-2 border-secondary shadow-brutal-sm">Retail</span>
                                <h3 className="text-3xl font-heading font-black text-white uppercase mb-2">Standard</h3>
                                <div className="flex items-center gap-2 border-b-2 border-white/20 pb-4">
                                    <CheckCircle className="w-4 h-4 text-accent" />
                                    <span className="text-xs font-bold text-white uppercase">Weight 50g–60g</span>
                                </div>
                            </div>

                            <div className="flex items-end gap-2 mt-auto">
                                <span className="text-7xl lg:text-6xl xl:text-7xl font-heading font-black text-white leading-none tracking-tighter">₹{prices.retail?.toFixed(2)}</span>
                                <span className="text-white font-bold uppercase text-xs mb-2">/ egg</span>
                            </div>
                        </div>

                        {/* Powder Grade Price Card */}
                        <div className="bg-white border-[6px] border-secondary shadow-brutal hover:shadow-brutal-lg hover:-translate-y-2 transition-all p-8 relative flex flex-col justify-between h-80 group">
                            <div className="absolute top-4 right-4 text-6xl text-secondary/5 font-heading font-black pointer-events-none group-hover:text-primary/10 transition-colors">03</div>
                            <div>
                                <span className="inline-block bg-secondary text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 mb-4 border-2 border-secondary shadow-brutal-sm">Powder</span>
                                <h3 className="text-3xl font-heading font-black text-secondary uppercase mb-2">Industrial</h3>
                                <div className="flex items-center gap-2 border-b-2 border-secondary/20 pb-4">
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-secondary uppercase">Weight &gt; 60g</span>
                                </div>
                            </div>

                            <div className="flex items-end gap-2 mt-auto">
                                <span className="text-6xl lg:text-5xl xl:text-6xl font-heading font-black text-secondary leading-none">₹{prices.powder?.toFixed(2)}</span>
                                <span className="text-secondary font-bold uppercase text-xs mb-2">/ egg</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-secondary py-16 text-white border-t-[12px] border-primary relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary rounded-full blur-[150px] mix-blend-screen opacity-20 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="text-center md:text-left flex flex-col items-center md:items-start group">
                        <div className="flex items-center gap-4 mb-6 border-4 border-white p-4 shadow-[4px_4px_0px_#ffffff] group-hover:-translate-y-1 transition-transform">
                            <Egg className="w-8 h-8 text-accent" />
                            <span className="text-4xl font-heading font-black uppercase tracking-tighter">EggTrack</span>
                        </div>
                        <p className="text-white font-bold text-sm tracking-widest uppercase bg-primary border-4 border-primary px-3 py-1">
                            Farm to Table
                        </p>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-8">
                        <div className="flex gap-6 text-sm font-black uppercase tracking-widest">
                            <Link href="/login" className="px-6 py-3 border-4 border-transparent hover:border-white transition-all bg-white text-secondary hover:bg-secondary hover:text-white hover:shadow-[4px_4px_0px_#ffffff]">Login</Link>
                            <Link href="/register" className="px-6 py-3 border-4 border-transparent hover:border-accent transition-all bg-accent text-secondary hover:bg-secondary hover:text-accent hover:shadow-[4px_4px_0px_var(--accent)]">Register</Link>
                        </div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 border-t-2 border-white/20 pt-4 w-full text-center md:text-right mix-blend-screen">
                            &copy; {new Date().getFullYear()} EggTrack System
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
