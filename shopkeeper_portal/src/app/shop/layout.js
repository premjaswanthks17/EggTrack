"use client";

import { useShop } from "@/components/ShopProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";

export default function ShopLayout({ children }) {
    const { user, loading } = useShop();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    // Only show the full-page loader on cold starts where we haven't checked for a session yet.
    // If we have a user but are still "loading" (fetching shop data), we can let the sub-components
    // handle their own internal loading states if they depend on 'shop'.
    if (loading && !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background animate-in fade-in duration-500">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-primary animate-spin opacity-20" />
                    <Loader2 className="w-12 h-12 text-primary animate-spin absolute inset-0" style={{ animationDirection: 'reverse' }} />
                </div>
                <p className="text-[12px] font-black text-primary tracking-[0.3em] uppercase">EGG TRACK</p>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-10">
                {children}
            </main>
            <footer className="py-8 text-center border-t border-primary/5">
                <p className="text-xs text-primary/40 font-bold uppercase tracking-widest">
                    Powered by EggTrack Production Systems &copy; {new Date().getFullYear()}
                </p>
            </footer>
        </div>
    );
}
