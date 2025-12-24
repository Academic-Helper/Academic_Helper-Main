
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, MessageSquare, ArrowLeft, UserCog } from "lucide-react";
import SupportChat from "@/components/SupportChat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserData } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import AdminUserControls from "@/components/AdminUserControls";


export default function AdminIndividualSupportPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const userId = params.userId as string;
    
    const [chatUser, setChatUser] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && userData?.role !== 'admin') {
            router.push("/dashboard");
        } else if (!authLoading && userId) {
            const fetchUserData = async () => {
                setLoading(true);
                try {
                    // Fetch user data to display name/email
                    const userRef = doc(db, "users", userId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setChatUser(userSnap.data() as UserData);
                    }
                    
                    // Mark conversation as read by admin upon opening it
                    const chatRef = doc(db, "supportChats", userId);
                    await setDoc(chatRef, { isReadByAdmin: true }, { merge: true });

                } catch (error) {
                    console.error("Error fetching user data for chat:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchUserData();
        }
    }, [userData, authLoading, router, userId]);
    
    if (authLoading || loading) {
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
                    <div className="flex flex-wrap gap-4 justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-2xl">
                                <MessageSquare /> Live Support Chat
                            </CardTitle>
                            <CardDescription>
                                {chatUser ? `Conversation with ${chatUser.name} (${chatUser.email})` : 'Loading conversation...'}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline">
                                        <UserCog className="mr-2 h-4 w-4"/> Manage User
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                                    <SheetHeader>
                                        <SheetTitle>User Control Panel</SheetTitle>
                                        <SheetDescription>
                                            View details and manage this user's account and assignments directly.
                                        </SheetDescription>
                                    </SheetHeader>
                                    <AdminUserControls userId={userId} />
                                </SheetContent>
                            </Sheet>

                             <Button asChild variant="outline">
                                <Link href="/admin/support"><ArrowLeft className="mr-2 h-4 w-4"/>Back to Inbox</Link>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <SupportChat userId={userId} userRole="admin" />
                </CardContent>
            </Card>
        </div>
    );
}
