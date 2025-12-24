
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type UserData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trophy, Crown } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function LeaderboardPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const [writers, setWriters] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (userData?.role !== 'admin') {
                router.push("/dashboard");
            } else {
                const fetchWriters = async () => {
                    setLoading(true);
                    try {
                        const writersQuery = query(collection(db, "users"), where("role", "==", "writer"));
                        const querySnapshot = await getDocs(writersQuery);
                        const writersData = querySnapshot.docs.map(doc => doc.data() as UserData);
                        
                        const sortedWriters = writersData
                            .filter(writer => (writer.referralCount || 0) > 0)
                            .sort((a, b) => (b.referralCount || 0) - (a.referralCount || 0));
                        
                        setWriters(sortedWriters);
                    } catch (error) {
                        console.error("Error fetching leaderboard:", error);
                    } finally {
                        setLoading(false);
                    }
                };
                fetchWriters();
            }
        }
    }, [userData, authLoading, router]);
    
    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold flex items-center gap-4"><Trophy className="h-10 w-10 text-primary" /> Referral Leaderboard</h1>
             <Card>
                <CardHeader>
                    <CardTitle>Top Writers by Referrals</CardTitle>
                    <CardDescription>Track the progress of writers in the referral program.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Rank</TableHead>
                                    <TableHead>Writer</TableHead>
                                    <TableHead>Referrals</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {writers.length > 0 ? (
                                    writers.map((writer, index) => (
                                        <TableRow key={writer.uid}>
                                            <TableCell className="font-bold text-lg">{index + 1}</TableCell>
                                            <TableCell>
                                                <Link href={`/admin/support/${writer.uid}`} className="flex items-center gap-3 group">
                                                    <Avatar>
                                                        <AvatarImage src={writer.photoURL} alt={writer.name}/>
                                                        <AvatarFallback>{writer.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium group-hover:underline">{writer.name}</p>
                                                        <p className="text-xs text-muted-foreground">{writer.ahUserId}</p>
                                                    </div>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="font-semibold text-center">{writer.referralCount || 0}</TableCell>
                                            <TableCell>
                                                {writer.hasZeroServiceCharge ? (
                                                    <span className="flex items-center gap-1.5 text-yellow-500 font-semibold"><Crown className="h-4 w-4" /> Winner</span>
                                                ) : (
                                                    <span className="text-muted-foreground">Participant</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No writers have participated yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     {/* Mobile Cards */}
                    <div className="grid gap-4 md:hidden">
                        {writers.length > 0 ? (
                            writers.map((writer, index) => (
                                <Card key={writer.uid}>
                                    <CardHeader>
                                         <Link href={`/admin/support/${writer.uid}`} className="flex items-center gap-3 group">
                                            <Avatar>
                                                <AvatarImage src={writer.photoURL} alt={writer.name}/>
                                                <AvatarFallback>{writer.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium group-hover:underline">{writer.name}</p>
                                                <p className="text-xs text-muted-foreground">{writer.ahUserId}</p>
                                            </div>
                                        </Link>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Rank</span>
                                            <span className="font-bold text-lg">{index + 1}</span>
                                        </div>
                                         <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Referrals</span>
                                            <span className="font-semibold">{writer.referralCount || 0}</span>
                                        </div>
                                         <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">Status</span>
                                            {writer.hasZeroServiceCharge ? (
                                                <span className="flex items-center gap-1.5 text-yellow-500 font-semibold text-sm"><Crown className="h-4 w-4" /> Winner</span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Participant</span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                             <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                                No writers have participated yet.
                             </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
