"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

const ShopContext = createContext({});

export function ShopProvider({ children }) {
    const [shop, setShop] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                await fetchShopData(session.user.email);
            }
            setLoading(false);
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                // We always fetch on actual auth state changes to ensure data is fresh
                // but we rely on the mount-time fetch for the initial load.
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    await fetchShopData(session.user.email);
                }
            } else {
                setUser(null);
                setShop(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchShopData = async (email) => {
        try {
            // 1. Get customer approval info
            const { data: customerData, error: customerError } = await supabase
                .from("customers")
                .select("*")
                .eq("email", email)
                .single();

            if (customerError && customerError.code !== 'PGRST116') {
                console.error("Error fetching customer data:", customerError);
            }

            // 2. Get merchant shop info (this ID is used for orders)
            const { data: shopData, error: shopError } = await supabase
                .from("shops")
                .select("*")
                .eq("email", email)
                .single();

            if (shopError && shopError.code !== 'PGRST116') {
                console.error("Error fetching shop data:", shopError);
            }

            // Combine them
            if (customerData || shopData) {
                const combined = {
                    ...customerData,
                    shop_id: shopData?.id, // This is the ID used in the orders table
                    real_shop_name: shopData?.shop_name || customerData?.shop_name
                };
                setShop(combined);
                return combined;
            }
        } catch (e) {
            console.error("Error in fetchShopData:", e);
        }
        return null;
    };

    const login = async (email, password) => {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (authError) {
            if (authError.message === "Email not confirmed") {
                throw new Error("EMAIL_NOT_CONFIRMED");
            }
            throw authError;
        }

        // Parallelize or sequential fetch to ensure we have shop data before returning
        const shopData = await fetchShopData(email);
        return { user: authData.user, shop: shopData };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <ShopContext.Provider value={{ shop, user, loading, login, logout }}>
            {children}
        </ShopContext.Provider>
    );
}

export const useShop = () => useContext(ShopContext);
