
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { doc, onSnapshot, collection, query, orderBy, runTransaction, addDoc, serverTimestamp, increment, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { FinanceSummary, FinanceTransaction } from "@/types";
import { Loader2, DollarSign, ArrowUpCircle, ArrowDownCircle, Banknote, Trash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function AdminFinancesPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjustmentType, setAdjustmentType] = useState<'credit' | 'debit'>('credit');
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<FinanceTransaction | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!authLoading) {
            if (userData?.role !== 'admin') {
                router.push("/dashboard");
            } else {
                const summaryRef = doc(db, "finances", "summary");
                const unsubscribeSummary = onSnapshot(summaryRef, (doc) => {
                    if (doc.exists()) {
                        setSummary(doc.data() as FinanceSummary);
                    } else {
                        setSummary({ totalProfit: 0 });
                    }
                    setLoading(false);
                });

                const transactionsQuery = query(collection(db, "finances", "summary", "transactions"), orderBy("timestamp", "desc"));
                const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
                    setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceTransaction)));
                });

                return () => {
                    unsubscribeSummary();
                    unsubscribeTransactions();
                };
            }
        }
    }, [userData, authLoading, router]);

    const handleManualAdjustment = async () => {
        const amount = parseFloat(adjustmentAmount);
        if (isNaN(amount) || amount <= 0 || !adjustmentReason.trim()) {
            toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid amount and reason." });
            return;
        }

        setIsAdjusting(true);
        try {
            const adjustmentAmountValue = adjustmentType === 'credit' ? amount : -amount;
            
            await runTransaction(db, async (transaction) => {
                const summaryRef = doc(db, "finances", "summary");
                
                transaction.set(summaryRef, { totalProfit: increment(adjustmentAmountValue) }, { merge: true });

                const transactionRef = collection(db, "finances", "summary", "transactions");
                transaction.set(doc(transactionRef), {
                    amount: adjustmentAmountValue,
                    type: 'manual',
                    description: adjustmentReason,
                    timestamp: serverTimestamp()
                });
            });
            
            toast({ title: "Success", description: "Profit manually adjusted." });
            setIsAdjustmentModalOpen(false);
            setAdjustmentAmount('');
            setAdjustmentReason('');

        } catch (error) {
            console.error("Error adjusting profit:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not adjust profit." });
        } finally {
            setIsAdjusting(false);
        }
    };

    const handleDeleteRequest = (transaction: FinanceTransaction) => {
        setTransactionToDelete(transaction);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!transactionToDelete) return;

        setIsDeleting(true);
        try {
            await runTransaction(db, async (transaction) => {
                const summaryRef = doc(db, "finances", "summary");
                const transactionRef = doc(db, "finances", "summary", "transactions", transactionToDelete.id);

                // Revert the profit change
                transaction.update(summaryRef, { totalProfit: increment(-transactionToDelete.amount) });
                // Delete the transaction log
                transaction.delete(transactionRef);
            });

            toast({ title: "Transaction Deleted", description: "The transaction has been removed and profit has been updated." });
        } catch (error) {
            console.error("Error deleting transaction:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete the transaction." });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
            setTransactionToDelete(null);
        }
    };


    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold flex items-center gap-4"><Banknote className="h-10 w-10 text-primary" /> Finances</h1>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Platform Profit</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">LKR {summary?.totalProfit?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground">This is the net profit from all service charges and manual adjustments.</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Manual Adjustment</CardTitle>
                        <CardDescription>Manually credit or debit the total profit for external costs or revenue.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                         <Button onClick={() => { setAdjustmentType('credit'); setIsAdjustmentModalOpen(true); }}>
                            <ArrowUpCircle className="mr-2 h-4 w-4" /> Credit
                        </Button>
                         <Button variant="destructive" onClick={() => { setAdjustmentType('debit'); setIsAdjustmentModalOpen(true); }}>
                            <ArrowDownCircle className="mr-2 h-4 w-4" /> Debit
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>A log of all profit-related transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount (LKR)</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length > 0 ? (
                                transactions.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell className="text-xs text-muted-foreground">{t.timestamp ? format(t.timestamp.toDate(), 'PPp') : ''}</TableCell>
                                        <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                                        <TableCell className="capitalize">{t.type}</TableCell>
                                        <TableCell className={`text-right font-medium ${t.amount > 0 ? 'text-green-600' : 'text-destructive'}`}>{t.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(t)}>
                                                <Trash className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">No transactions yet.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manual Profit Adjustment</DialogTitle>
                        <DialogDescription>
                           {adjustmentType === 'credit' ? 'Add funds to the total profit.' : 'Subtract funds from the total profit.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="adjustment-amount">Amount (LKR)</Label>
                            <Input id="adjustment-amount" type="number" value={adjustmentAmount} onChange={e => setAdjustmentAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adjustment-reason">Reason</Label>
                            <Textarea id="adjustment-reason" value={adjustmentReason} onChange={e => setAdjustmentReason(e.target.value)} placeholder="e.g., Marketing expenses, server costs, etc."/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAdjustmentModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleManualAdjustment} disabled={isAdjusting}>
                            {isAdjusting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Confirm {adjustmentType === 'credit' ? 'Credit' : 'Debit'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This will permanently delete the transaction: &quot;{transactionToDelete?.description}&quot; and adjust the total profit by LKR {-transactionToDelete?.amount.toFixed(2) || 0}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    