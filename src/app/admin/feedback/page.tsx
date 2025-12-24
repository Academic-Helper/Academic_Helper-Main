
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import type { Feedback } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUpDown, HelpCircle } from "lucide-react";
import Link from "next/link";

type SortableKeys = keyof Feedback;

type SortConfig = {
    key: SortableKeys;
    direction: 'ascending' | 'descending';
} | null;

const useSortableData = (items: Feedback[], config: SortConfig = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    let sortableItems = [...items];
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key) {
                const valA = a[sortConfig.key as keyof Feedback];
                const valB = b[sortConfig.key as keyof Feedback];
                
                const aExists = valA !== null && valA !== undefined;
                const bExists = valB !== null && valB !== undefined;

                if (!aExists && !bExists) return 0;
                if (!aExists) return 1;
                if (!bExists) return -1;
                
                if (valA < valB) {
                  return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                  return sortConfig.direction === 'ascending' ? 1 : -1;
                }
            }
            return 0;
        });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

export default function FeedbackPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const { items: sortedFeedback, requestSort, sortConfig } = useSortableData(feedback, { key: 'createdAt', direction: 'descending' });

    const fetchFeedback = useCallback(async () => {
        setLoading(true);
        try {
            const feedbackSnapshot = await getDocs(query(collection(db, "feedback"), orderBy("createdAt", "desc")));
            setFeedback(feedbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));
        } catch (error) {
            console.error("Error fetching feedback:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading) {
            if (userData?.role !== 'admin') {
                router.push("/dashboard");
            } else {
                fetchFeedback();
            }
        }
    }, [userData, authLoading, router, fetchFeedback]);


    const getSortIndicator = (key: string, config: SortConfig) => {
        if (!config || config.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return config.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold flex items-center gap-4"><HelpCircle className="h-10 w-10 text-primary" /> User Feedback</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Platform Feedback</CardTitle>
                    <CardDescription>Feedback submitted by users after completing assignments.</CardDescription>
                </CardHeader>
                <CardContent>
                     {/* Desktop Table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('createdAt')}>Date{getSortIndicator('createdAt', sortConfig)}</Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('userName')}>User{getSortIndicator('userName', sortConfig)}</Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('assignmentTitle')}>Assignment{getSortIndicator('assignmentTitle', sortConfig)}</Button></TableHead>
                                    <TableHead>Feedback</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedFeedback.length > 0 ? (
                                    sortedFeedback.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {item.createdAt ? format(item.createdAt.toDate(), 'PPP') : ''}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/admin/support/${item.userId}`} className="hover:underline">{item.userName}</Link>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/assignment/${item.assignmentId}`} className="hover:underline max-w-xs truncate block">{item.assignmentTitle}</Link>
                                            </TableCell>
                                            <TableCell className="text-sm">{item.feedbackText}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No feedback has been submitted yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     {/* Mobile Cards */}
                    <div className="grid gap-4 md:hidden">
                        {sortedFeedback.length > 0 ? (
                            sortedFeedback.map((item) => (
                                <Card key={item.id}>
                                    <CardHeader>
                                        <CardTitle className="text-base">
                                            <Link href={`/assignment/${item.assignmentId}`} className="hover:underline">{item.assignmentTitle}</Link>
                                        </CardTitle>
                                        <CardDescription>
                                            By <Link href={`/admin/support/${item.userId}`} className="hover:underline">{item.userName}</Link> on {item.createdAt ? format(item.createdAt.toDate(), 'PPP') : ''}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm">{item.feedbackText}</p>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                             <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                                No feedback has been submitted yet.
                             </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
