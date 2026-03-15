"use client";

import { Sidebar } from "@/components/sidebar";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }) {
    const pathname = usePathname();

    // Root path redirect happens in page.js, so if it's strictly "/" we can just 
    // render children (which will redirect) or render the layout. Layout won't hurt.

    return (
        <div className="flex h-screen w-full bg-[#f4f9f5] overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col p-8 overflow-y-auto">
                <div className="max-w-6xl w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </main>
        </div>
    );
}
