import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    ClipboardList,
    FileText,
    ShoppingCart,
    TrendingUp,
    Egg,
    UserCheck,
    Package,
    Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarLinks = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Manual Entry", href: "/manual-entry", icon: ClipboardList },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Orders & Notifs", href: "/orders", icon: ShoppingCart },
    { name: "Live Pricing", href: "/prices", icon: TrendingUp },
    { name: "Sales Report", href: "/sales", icon: TrendingUp },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Customers", href: "/customers", icon: UserCheck },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full w-64 bg-[#f4f9f5] border-r border-[#c8e6c9] px-4 py-6">
            {/* Brand */}
            <div className="flex items-center gap-3 px-2 mb-10">
                <div className="bg-[#2e7d32] p-2 rounded-xl shadow-sm">
                    <Egg className="w-6 h-6 text-white" />
                </div>
                <h1 className="font-heading text-2xl font-bold text-[#152815] tracking-tight">
                    EggTrack
                </h1>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-2 flex-1">
                <div className="text-xs font-semibold text-[#152815]/50 uppercase tracking-wider mb-2 px-2">
                    Production
                </div>
                {sidebarLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    const Icon = link.icon;

                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-white text-[#2e7d32] shadow-sm border border-[#c8e6c9] ring-1 ring-[#2e7d32]/5"
                                    : "text-[#152815]/70 hover:bg-[#d7ecd7]/50 hover:text-[#152815]"
                            )}
                        >
                            <Icon className={cn("w-5 h-5", isActive ? "text-[#2e7d32]" : "text-[#152815]/50")} />
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User Profile Area */}
            <div className="mt-auto px-2 pt-6 border-t border-[#c8e6c9]/60">
                <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#d7ecd7]/50 cursor-pointer transition-colors">
                    <div className="w-8 h-8 rounded-full bg-[#152815] flex items-center justify-center text-white font-heading font-bold text-xs">
                        JD
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#152815]">John Doe</span>
                        <span className="text-xs text-[#152815]/60">Farm Manager</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
