"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import SupportChat from "@/components/SupportChat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SupportPage() {
    const { user, userData, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
        if (!loading && userData?.role === 'admin') {
            router.push('/admin/support');
        }
    }, [user, userData, loading, router]);

    if (loading || !userData) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="flex justify-center items-start py-8">
            <Card className="w-full max-w-4xl">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <MessageSquare /> Live Support
                    </CardTitle>
                    <CardDescription>
                        Chat directly with an admin. We're here to help you with any questions or issues.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SupportChat userId={userData.uid} userRole="user" />
                </CardContent>
            </Card>
        </div>
    );
}
