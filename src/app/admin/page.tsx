
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query, doc, updateDoc, setDoc, getDoc, deleteDoc, runTransaction, increment, where, serverTimestamp, writeBatch, type QuerySnapshot, type DocumentData, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, UserData, AssignmentStatus, BankDetails, UserRole, ContactSettings, TutorialSettings, Feedback, DepositRequest, WithdrawalRequest, PromotionSettings } from "@/types";
import { Loader2, ArrowUpDown, ShieldCheck, Banknote, Trash, LifeBuoy, Wallet, Landmark, CreditCard, MinusCircle, Video, Search, UserX, Gift, CalendarIcon as CalendarIconLucide, Wrench, Users, Clock, ExternalLink, Ban } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label";
import { createNotification } from "@/lib/notifications";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AdminUserControls from "@/components/AdminUserControls";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { bankDetailsSchema, contactSettingsSchema, tutorialSettingsSchema } from "@/types";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";


type SortableKeys = keyof UserData | keyof Assignment | keyof DepositRequest | keyof WithdrawalRequest;

type SortConfig = {
    key: SortableKeys;
    direction: 'ascending' | 'descending';
} | null;

const useSortableData = <T extends UserData | Assignment | DepositRequest | WithdrawalRequest>(items: T[], config: SortConfig = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    let sortableItems = [...items];
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key) {
                const valA = a[sortConfig.key as keyof T];
                const valB = b[sortConfig.key as keyof T];
                
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

const UserTable = ({ users, user, onSort, sortConfig, onRoleChange, onCredit, onDebit, onBan, onDelete, onView }: {
    users: UserData[],
    user: UserData | null,
    onSort: (key: SortableKeys) => void,
    sortConfig: SortConfig,
    onRoleChange: (uid: string, role: UserRole) => void,
    onCredit: (user: UserData) => void,
    onDebit: (user: UserData) => void,
    onBan: (uid: string, status?: 'active' | 'banned') => void,
    onDelete: (id: string, type: 'user', name: string) => void,
    onView: (user: UserData) => void
}) => {
    const getSortIndicator = (key: string, config: SortConfig) => {
        if (!config || config.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return config.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    return (
        <>
            {/* Desktop Table */}
            <div className="rounded-md border hidden md:block w-full">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Button variant="ghost" onClick={() => onSort('name')}>Name{getSortIndicator('name', sortConfig)}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => onSort('ahUserId')}>AH User ID{getSortIndicator('ahUserId', sortConfig)}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => onSort('createdAt')}>Created At{getSortIndicator('createdAt', sortConfig)}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => onSort('role')}>Role{getSortIndicator('role', sortConfig)}</Button></TableHead>
                            <TableHead><Button variant="ghost" onClick={() => onSort('walletBalance')}>Wallet Balance{getSortIndicator('walletBalance', sortConfig)}</Button></TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length > 0 ? users.map((u) => (
                            <TableRow key={u.uid} className={u.status === 'banned' ? 'bg-destructive/10' : ''}>
                                <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => onView(u)}>
                                    {u.name}<br /><span className="text-xs text-muted-foreground">{u.email}</span>
                                </TableCell>
                                <TableCell>{u.ahUserId || 'N/A'}</TableCell>
                                <TableCell>{u.createdAt ? format(u.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                <TableCell>
                                    <Select value={u.role} onValueChange={(value) => onRoleChange(u.uid, value as UserRole)} disabled={u.uid === user?.uid || u.role === 'admin'}>
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="seeker">Seeker</SelectItem>
                                            <SelectItem value="writer">Writer</SelectItem>
                                            <SelectItem value="teacher">Teacher</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>LKR {u.walletBalance?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell className="flex items-center gap-1">
                                    <Button variant="outline" size="sm" onClick={() => onCredit(u)}>
                                        <Wallet className="mr-2 h-4 w-4" /> Credit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => onDebit(u)}>
                                        <MinusCircle className="mr-2 h-4 w-4" /> Debit
                                    </Button>
                                    {u.role !== 'admin' && (
                                        <>
                                            <Button variant="outline" size="icon" onClick={() => onBan(u.uid, u.status)} title={u.status === 'banned' ? 'Unban User' : 'Ban User'}>
                                                <UserX className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onDelete(u.uid, 'user', u.name)}>
                                                <Trash className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No users found.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
             {/* Mobile Cards */}
            <div className="grid gap-4 md:hidden">
                {users.map(u => (
                    <Card key={u.uid} className={cn(u.status === 'banned' ? 'bg-destructive/10' : '')}>
                        <CardHeader className="cursor-pointer hover:bg-secondary/50 rounded-t-lg" onClick={() => onView(u)}>
                            <CardTitle>{u.name}</CardTitle>
                            <CardDescription>{u.email}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">AH User ID</span>
                                <span>{u.ahUserId || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Role</span>
                                <Select value={u.role} onValueChange={(value) => onRoleChange(u.uid, value as UserRole)} disabled={u.uid === user?.uid || u.role === 'admin'}>
                                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="seeker">Seeker</SelectItem>
                                        <SelectItem value="writer">Writer</SelectItem>
                                        <SelectItem value="teacher">Teacher</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Wallet</span>
                                <span>LKR {u.walletBalance?.toFixed(2) || '0.00'}</span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex-wrap justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => onCredit(u)}><Wallet className="mr-2 h-4 w-4" /> Credit</Button>
                            <Button variant="destructive" size="sm" onClick={() => onDebit(u)}><MinusCircle className="mr-2 h-4 w-4" /> Debit</Button>
                            {u.role !== 'admin' && (
                                <Button variant="outline" size="icon" onClick={() => onBan(u.uid, u.status)} title={u.status === 'banned' ? 'Unban User' : 'Ban User'}>
                                    <UserX className="h-4 w-4" />
                                </Button>
                            )}
                            {u.role !== 'admin' && (
                                <Button variant="ghost" size="icon" onClick={() => onDelete(u.uid, 'user', u.name)}>
                                    <Trash className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </>
    )
}

export default function AdminPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSavingBankDetails, setIsSavingBankDetails] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSavingTutorials, setIsSavingTutorials] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'user' | 'assignment', name: string } | null>(null);

  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [selectedUserForDeposit, setSelectedUserForDeposit] = useState<UserData | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  
  const [isDebitDialogOpen, setIsDebitDialogOpen] = useState(false);
  const [selectedUserForDebit, setSelectedUserForDebit] = useState<UserData | null>(null);
  const [debitAmount, setDebitAmount] = useState('');
  const [isDebiting, setIsDebiting] = useState(false);

  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewedUser, setViewedUser] = useState<UserData | null>(null);

  const bankDetailsForm = useForm<z.infer<typeof bankDetailsSchema>>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: { accountName: "", accountNumber: "", bankName: "", branchName: "" },
  });
  
  const contactForm = useForm<z.infer<typeof contactSettingsSchema>>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: { whatsAppNumber: "" },
  });
  
  const tutorialForm = useForm<z.infer<typeof tutorialSettingsSchema>>({
    resolver: zodResolver(tutorialSettingsSchema),
    defaultValues: { seekerVideoUrl: "", writerVideoUrl: "" },
  });

  const { items: sortedUsers, requestSort: requestUserSort, sortConfig: userSortConfig } = useSortableData(users, { key: 'createdAt', direction: 'descending' });
  const { items: sortedDepositRequests, requestSort: requestDepositSort, sortConfig: depositSortConfig } = useSortableData(depositRequests, { key: 'createdAt', direction: 'descending' });
  const { items: sortedWithdrawalRequests, requestSort: requestWithdrawalSort, sortConfig: withdrawalSortConfig } = useSortableData(withdrawalRequests, { key: 'requestedAt', direction: 'descending' });

  const filteredUsers = useMemo(() =>
    sortedUsers.filter(user => {
      const query = searchQuery.toLowerCase();
      return (
        user.ahUserId?.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }),
    [sortedUsers, searchQuery]
  );
  
  const seekers = useMemo(() => filteredUsers.filter(u => u.role === 'seeker'), [filteredUsers]);
  const writers = useMemo(() => filteredUsers.filter(u => u.role === 'writer'), [filteredUsers]);
  const teachers = useMemo(() => filteredUsers.filter(u => u.role === 'teacher'), [filteredUsers]);


  const fetchData = useCallback(async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      setUsers(usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserData)));

      const assignmentsSnapshot = await getDocs(query(collection(db, "assignments"), orderBy("createdAt", "desc")));
      const allAssignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
      setAssignments(allAssignments);
      
      const allDepositsSnapshot = await getDocs(collection(db, "depositRequests"));
      const pendingDeposits = allDepositsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest))
          .filter(req => req.status === 'pending');
      setDepositRequests(pendingDeposits);
      
      const allWithdrawalsSnapshot = await getDocs(collection(db, "withdrawalRequests"));
      const pendingWithdrawals = allWithdrawalsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest))
          .filter(req => req.status === 'pending');
      setWithdrawalRequests(pendingWithdrawals);

      // Fetch public settings
      const settingsRef = doc(db, "public_settings", "bankInfo");
      const bankDetailsSnap = await getDoc(settingsRef);
      if (bankDetailsSnap.exists()) {
          bankDetailsForm.reset(bankDetailsSnap.data() as BankDetails);
      }
      
      const contactInfoRef = doc(db, "public_settings", "contactInfo");
      const contactInfoSnap = await getDoc(contactInfoRef);
      if (contactInfoSnap.exists()) {
          contactForm.reset(contactInfoSnap.data() as ContactSettings);
      }

      const tutorialRef = doc(db, "public_settings", "tutorialVideos");
      const tutorialSnap = await getDoc(tutorialRef);
      if (tutorialSnap.exists()) {
          tutorialForm.reset(tutorialSnap.data() as TutorialSettings);
      }

      const maintenanceRef = doc(db, "public_settings", "maintenance");
      const maintenanceSnap = await getDoc(maintenanceRef);
      if (maintenanceSnap.exists()) {
          setIsMaintenanceMode(maintenanceSnap.data().isActive);
      }
      
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch admin data."});
    } finally {
      setLoading(false);
    }
  }, [toast, bankDetailsForm, contactForm, tutorialForm]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (userData?.role === 'admin') {
        fetchData();
        const updateAdminList = async () => {
          try {
            const adminQuery = query(collection(db, "users"), where("role", "==", "admin"));
            const adminSnapshot = await getDocs(adminQuery);
            const adminUids = adminSnapshot.docs.map(doc => doc.id);
            await setDoc(doc(db, "public_settings", "admin_users"), { uids: adminUids });
          } catch (error) {
            console.error("Failed to update admin list:", error);
          }
        };
        updateAdminList();
      } else {
        router.push("/dashboard");
      }
    }
  }, [user?.uid, authLoading, router, fetchData]);

  const handleToggleMaintenanceMode = async (checked: boolean) => {
    setIsTogglingMaintenance(true);
    try {
        const maintenanceRef = doc(db, "public_settings", "maintenance");
        await setDoc(maintenanceRef, { isActive: checked });
        setIsMaintenanceMode(checked);
        toast({
            title: "Success",
            description: `Maintenance mode has been ${checked ? 'activated' : 'deactivated'}.`,
        });
    } catch (error) {
        console.error("Error toggling maintenance mode:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not update maintenance status." });
    } finally {
        setIsTogglingMaintenance(false);
    }
  };
  
  const handleRoleChange = async (uid: string, role: UserRole) => {
    if (uid === user?.uid) {
      toast({ variant: "destructive", title: "Action Forbidden", description: "You cannot change your own role." });
      return;
    }
    const userRef = doc(db, "users", uid);
    try {
        await updateDoc(userRef, { role });
        setUsers(prev => prev.map(u => u.uid === uid ? {...u, role} : u));
        toast({ title: "Success", description: "User role updated." });
    } catch (error) {
        console.error("Failed to update role", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update user role." });
    }
  }

  const handleToggleBanStatus = async (uid: string, currentStatus?: 'active' | 'banned') => {
    if (uid === user?.uid) {
        toast({ variant: "destructive", title: "Action Forbidden", description: "You cannot ban yourself." });
        return;
    }
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    const userRef = doc(db, "users", uid);
    try {
        const dataToUpdate: { status: 'active' | 'banned'; contactWarningCount?: number } = { status: newStatus };
        if (newStatus === 'active') {
            dataToUpdate.contactWarningCount = 0;
        }
        await updateDoc(userRef, dataToUpdate);
        
        setUsers(prev => prev.map(u => u.uid === uid ? { ...u, status: newStatus, contactWarningCount: newStatus === 'active' ? 0 : u.contactWarningCount } : u));
        toast({ title: "Success", description: `User has been ${newStatus}.` });
    } catch (error) {
        console.error(`Failed to ${newStatus} user:`, error);
        toast({ variant: "destructive", title: "Error", description: `Failed to ${newStatus} user.` });
    }
  };
  
  const handleCreditWalletRequest = (user: UserData) => {
    setSelectedUserForDeposit(user);
    setDepositAmount('');
    setIsDepositDialogOpen(true);
  }

  const handleDebitWalletRequest = (user: UserData) => {
    setSelectedUserForDebit(user);
    setDebitAmount('');
    setIsDebitDialogOpen(true);
  }

  const handleConfirmCredit = async () => {
    if (!selectedUserForDeposit || !depositAmount) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a positive number." });
      return;
    }
    setIsDepositing(true);
    try {
      const userRef = doc(db, "users", selectedUserForDeposit.uid);
      await updateDoc(userRef, {
        walletBalance: increment(amount)
      });
      await createNotification(selectedUserForDeposit.uid, `LKR ${amount.toFixed(2)} has been credited to your wallet by an admin.`, '/dashboard');
      
      // Correctly update local state
      setUsers(prevUsers => prevUsers.map(u => 
        u.uid === selectedUserForDeposit.uid 
          ? { ...u, walletBalance: (u.walletBalance || 0) + amount }
          : u
      ));
      
      toast({ title: "Success", description: `Credited LKR ${amount.toFixed(2)} to ${selectedUserForDeposit.name}'s wallet.` });
      
      setIsDepositDialogOpen(false);
      setSelectedUserForDeposit(null);

    } catch(e) {
        console.error("Failed to credit wallet:", e);
        toast({ variant: "destructive", title: "Error", description: "Could not credit wallet." });
    } finally {
        setIsDepositing(false);
    }
  };

  const handleConfirmDebit = async () => {
    if (!selectedUserForDebit || !debitAmount) return;
    const amount = parseFloat(debitAmount);
    if (isNaN(amount) || amount <= 0) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a positive number." });
        return;
    }

    if ((selectedUserForDebit.walletBalance || 0) < amount) {
        toast({ variant: "destructive", title: "Insufficient Funds", description: "Cannot debit more than the user's current balance." });
        return;
    }

    setIsDebiting(true);
    try {
        const userRef = doc(db, "users", selectedUserForDebit.uid);
        await updateDoc(userRef, {
            walletBalance: increment(-amount)
        });
        await createNotification(selectedUserForDebit.uid, `LKR ${amount.toFixed(2)} has been debited from your wallet by an admin.`, '/dashboard');
        
        // Correctly update local state
        setUsers(prevUsers => prevUsers.map(u => 
          u.uid === selectedUserForDebit.uid 
            ? { ...u, walletBalance: (u.walletBalance || 0) - amount }
            : u
        ));
        
        toast({ title: "Success", description: `Debited LKR ${amount.toFixed(2)} from ${selectedUserForDebit.name}'s wallet.` });
        
        setIsDebitDialogOpen(false);
        setSelectedUserForDebit(null);
    } catch (e) {
        console.error("Failed to debit wallet:", e);
        toast({ variant: "destructive", title: "Error", description: "Could not debit wallet." });
    } finally {
        setIsDebiting(false);
    }
};

  const handleConfirmDepositRequest = async (request: DepositRequest) => {
    setIsDepositing(true);
    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", request.userId);
            const depositRef = doc(db, "depositRequests", request.id);

            transaction.update(userRef, { walletBalance: increment(request.amount) });
            transaction.update(depositRef, { status: 'confirmed', confirmedAt: serverTimestamp() });
        });

        await createNotification(request.userId, `Your deposit of LKR ${request.amount.toFixed(2)} has been confirmed and added to your wallet.`, '/dashboard');
        toast({ title: "Deposit Confirmed", description: `Credited LKR ${request.amount.toFixed(2)} to ${request.userName}'s wallet.` });
        
        setDepositRequests(prev => prev.filter(r => r.id !== request.id));
        setUsers(prevUsers => prevUsers.map(u => 
          u.uid === request.userId
            ? { ...u, walletBalance: (u.walletBalance || 0) + request.amount }
            : u
        ));

    } catch(e) {
        console.error("Failed to confirm deposit:", e);
        toast({ variant: "destructive", title: "Error", description: "Failed to confirm deposit." });
    } finally {
        setIsDepositing(false);
    }
  };

  const handleRejectDepositRequest = async (request: DepositRequest) => {
    setIsDepositing(true);
    try {
        const depositRef = doc(db, "depositRequests", request.id);
        await updateDoc(depositRef, { status: 'rejected' });
        await createNotification(request.userId, `Your deposit request of LKR ${request.amount.toFixed(2)} has been rejected. Please contact support if you have questions.`, '/dashboard');
        toast({ title: "Deposit Rejected", description: "The user has been notified." });
        setDepositRequests(prev => prev.filter(r => r.id !== request.id));
    } catch(e) {
        console.error("Failed to reject deposit:", e);
        toast({ variant: "destructive", title: "Error", description: "Failed to reject deposit request." });
    } finally {
        setIsDepositing(false);
    }
  };


  const handleConfirmWithdrawal = async (request: WithdrawalRequest) => {
    setIsSubmittingWithdrawal(true);
    try {
        const serviceCharge = request.amount * 0.05; // 5% service charge
        const payoutAmount = request.amount - serviceCharge;
        
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, "users", request.userId);
            const withdrawalRef = doc(db, "withdrawalRequests", request.id);
            
            const userSnap = await transaction.get(userRef);
            if (!userSnap.exists() || (userSnap.data().walletBalance || 0) < request.amount) {
                throw new Error("User has insufficient funds for this withdrawal.");
            }
            
            // Deduct the full amount from user's wallet
            transaction.update(userRef, { walletBalance: increment(-request.amount) });
            transaction.update(withdrawalRef, { 
                status: 'completed', 
                completedAt: serverTimestamp(),
                serviceCharge,
                payoutAmount
            });
        });

        await createNotification(request.userId, `Your withdrawal request of LKR ${request.amount.toFixed(2)} has been processed. The payout amount is LKR ${payoutAmount.toFixed(2)}.`, '/profile');
        toast({ title: "Withdrawal Confirmed", description: `LKR ${request.amount.toFixed(2)} processed for ${request.userName}.` });
        setWithdrawalRequests(prev => prev.filter(r => r.id !== request.id));
         setUsers(prevUsers => prevUsers.map(u => 
          u.uid === request.userId 
            ? { ...u, walletBalance: (u.walletBalance || 0) - request.amount }
            : u
      ));

    } catch (e: any) {
        console.error("Failed to confirm withdrawal:", e);
        toast({ variant: "destructive", title: "Error", description: e.message || "Failed to confirm withdrawal." });
    } finally {
        setIsSubmittingWithdrawal(false);
    }
  };

  const handleRejectWithdrawalRequest = async (request: WithdrawalRequest) => {
    setIsSubmittingWithdrawal(true);
    try {
        const withdrawalRef = doc(db, "withdrawalRequests", request.id);
        await updateDoc(withdrawalRef, { status: 'rejected' });
        
        await createNotification(request.userId, `Your withdrawal request of LKR ${request.amount.toFixed(2)} has been rejected. Please contact support if you have questions.`, '/profile');
        toast({ title: "Withdrawal Rejected", description: "The request has been marked as rejected." });
        
        setWithdrawalRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (e: any) {
        console.error("Failed to reject withdrawal:", e);
        toast({ variant: "destructive", title: "Error", description: e.message || "Failed to reject withdrawal." });
    } finally {
        setIsSubmittingWithdrawal(false);
    }
  };

  async function onSaveBankDetails(values: z.infer<typeof bankDetailsSchema>) {
    setIsSavingBankDetails(true);
    try {
        const bankDetailsRef = doc(db, "public_settings", "bankInfo");
        await setDoc(bankDetailsRef, values);
        toast({ title: "Success", description: "Bank details updated." });
    } catch (error) {
        console.error("Error saving bank details:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save bank details." });
    } finally {
        setIsSavingBankDetails(false);
    }
  }

  async function onSaveContactSettings(values: z.infer<typeof contactSettingsSchema>) {
    setIsSavingContact(true);
    try {
        const contactInfoRef = doc(db, "public_settings", "contactInfo");
        await setDoc(contactInfoRef, values);
        toast({ title: "Success", description: "Contact info updated." });
    } catch (error) {
        console.error("Error saving contact info:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save contact info." });
    } finally {
        setIsSavingContact(false);
    }
  }

  async function onSaveTutorials(values: z.infer<typeof tutorialSettingsSchema>) {
    setIsSavingTutorials(true);
    try {
        const tutorialRef = doc(db, "public_settings", "tutorialVideos");
        await setDoc(tutorialRef, values);
        toast({ title: "Success", description: "Tutorial video links updated." });
    } catch (error) {
        console.error("Error saving tutorial links:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save tutorial links." });
    } finally {
        setIsSavingTutorials(false);
    }
  }
  
  const handleDeleteRequest = (id: string, type: 'user' | 'assignment', name: string) => {
    setDeleteTarget({ id, type, name });
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    const { id, type, name } = deleteTarget;
    setIsDeleteDialogOpen(false);

    if (type === 'assignment') {
        toast({ title: "Deletion in Progress", description: `Removing assignment "${name}"...` });
        try {
            const messagesRef = collection(db, "assignments", id, "messages");
            const messagesSnap = await getDocs(messagesRef);
            const batch = writeBatch(db);
            messagesSnap.forEach(doc => batch.delete(doc.ref));
            batch.delete(doc(db, "assignments", id));
            await batch.commit();
            
            setAssignments(prev => prev.filter(a => a.id !== id));
            toast({ title: "Success", description: "Assignment and its chat history deleted." });
        } catch (error) {
             console.error(`Error deleting assignment:`, error);
             toast({ variant: "destructive", title: "Error", description: `Could not delete the assignment.` });
        }
    } else if (type === 'user') {
        toast({ title: "Deleting User...", description: `Deleting ${name} and all their data. This may take a moment...` });
        try {
            const batch = writeBatch(db);

            // 1. Find and delete user's assignments and their subcollections
            const seekerAssignmentsQuery = query(collection(db, "assignments"), where("seekerId", "==", id));
            const writerAssignmentsQuery = query(collection(db, "assignments"), where("writerId", "==", id));
            
            const [seekerAssignmentsSnap, writerAssignmentsSnap]: [QuerySnapshot<DocumentData>, QuerySnapshot<DocumentData>] = await Promise.all([
                getDocs(seekerAssignmentsQuery),
                getDocs(writerAssignmentsQuery)
            ]);

            const assignmentIds = [...new Set([...seekerAssignmentsSnap.docs, ...writerAssignmentsSnap.docs].map(d => d.id))];

            for (const assignmentId of assignmentIds) {
                const messagesRef = collection(db, "assignments", assignmentId, "messages");
                const messagesSnap = await getDocs(messagesRef);
                messagesSnap.forEach(doc => batch.delete(doc.ref));
                batch.delete(doc(db, "assignments", assignmentId));
            }
            
            // 2. Delete support chat and its messages
            const supportChatMessagesRef = collection(db, "supportChats", id, "messages");
            const supportMessagesSnap = await getDocs(supportChatMessagesRef);
            supportMessagesSnap.forEach(doc => batch.delete(doc.ref));
            batch.delete(doc(db, "supportChats", id));

            // 3. Delete notifications
            const notificationsQuery = query(collection(db, "notifications"), where("userId", "==", id));
            const notificationsSnap = await getDocs(notificationsQuery);
            notificationsSnap.forEach(doc => batch.delete(doc.ref));
            
            // 4. Delete deposit requests
            const depositsQuery = query(collection(db, "depositRequests"), where("userId", "==", id));
            const depositsSnap = await getDocs(depositsQuery);
            depositsSnap.forEach(doc => batch.delete(doc.ref));

            // 5. Delete withdrawal requests
            const withdrawalsQuery = query(collection(db, "withdrawalRequests"), where("userId", "==", id));
            const withdrawalsSnap = await getDocs(withdrawalsQuery);
            withdrawalsSnap.forEach(doc => batch.delete(doc.ref));

            // 6. Delete the user document
            batch.delete(doc(db, "users", id));

            // Commit all operations
            await batch.commit();
            
            // Update local state
            setUsers(prev => prev.filter(u => u.uid !== id));
            setAssignments(prev => prev.filter(a => a.seekerId !== id && a.writerId !== id));
            setDepositRequests(prev => prev.filter(r => r.userId !== id));
            setWithdrawalRequests(prev => prev.filter(r => r.userId !== id));

            toast({
                title: "User Data Deleted",
                description: `All data for '${name}' has been removed. Please delete them from Firebase Authentication manually.`,
            });

        } catch (error: any) {
            console.error(`Error deleting user and their data:`, error);
            toast({ variant: "destructive", title: "Deletion Error", description: `An error occurred: ${error.message}` });
        }
    }
    setDeleteTarget(null);
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (userData?.role !== 'admin') {
    return <div className="text-center py-20 text-xl text-destructive">Access Denied</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ShieldCheck className="h-10 w-10 text-primary"/>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Landmark /> Deposit Requests ({depositRequests.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedDepositRequests.length > 0 ? sortedDepositRequests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.userName}</TableCell>
                                    <TableCell>{req.amount.toFixed(2)}</TableCell>
                                    <TableCell className="flex gap-1">
                                         <Button size="sm" onClick={() => handleConfirmDepositRequest(req)} disabled={isDepositing} className="px-1.5 h-7 text-xs">Confirm</Button>
                                         <Button size="sm" variant="destructive" onClick={() => handleRejectDepositRequest(req)} disabled={isDepositing} className="px-1.5 h-7 text-xs">Reject</Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No pending requests.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CreditCard /> Withdrawal Requests ({withdrawalRequests.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {sortedWithdrawalRequests.length > 0 ? sortedWithdrawalRequests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.userName}</TableCell>
                                    <TableCell>{req.amount.toFixed(2)}</TableCell>
                                    <TableCell className="flex gap-1">
                                         <Button size="sm" onClick={() => handleConfirmWithdrawal(req)} disabled={isSubmittingWithdrawal} className="px-1.5 h-7 text-xs">Confirm</Button>
                                         <Button size="sm" variant="destructive" onClick={() => handleRejectWithdrawalRequest(req)} disabled={isSubmittingWithdrawal} className="px-1.5 h-7 text-xs">Reject</Button>
                                    </TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No pending requests.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Banknote/>Bank Account Details</CardTitle>
            <CardDescription>This information will be shown to students for payment.</CardDescription>
          </CardHeader>
          <CardContent>
             <Form {...bankDetailsForm}>
              <form onSubmit={bankDetailsForm.handleSubmit(onSaveBankDetails)} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={bankDetailsForm.control} name="accountName" render={({ field }) => (
                      <FormItem><FormLabel>Account Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={bankDetailsForm.control} name="accountNumber" render={({ field }) => (
                      <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={bankDetailsForm.control} name="bankName" render={({ field }) => (
                      <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={bankDetailsForm.control} name="branchName" render={({ field }) => (
                      <FormItem><FormLabel>Branch Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                </div>
                <Button type="submit" disabled={isSavingBankDetails}>
                  {isSavingBankDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Save Bank Details
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><LifeBuoy/>Support Contact</CardTitle>
            <CardDescription>Provide a WhatsApp number for users to contact support.</CardDescription>
          </CardHeader>
          <CardContent>
             <Form {...contactForm}>
              <form onSubmit={contactForm.handleSubmit(onSaveContactSettings)} className="space-y-4">
                  <FormField control={contactForm.control} name="whatsAppNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Number</FormLabel>
                        <FormControl><Input {...field} placeholder="+94 12 345 6789"/></FormControl>
                        <FormMessage />
                      </FormItem>
                  )}/>
                <Button type="submit" disabled={isSavingContact}>
                  {isSavingContact && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  Save Contact Info
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wrench/>Maintenance Mode</CardTitle>
                <CardDescription>Temporarily make the site unavailable to non-admin users.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert variant={isMaintenanceMode ? "destructive" : "default"}>
                    <AlertTitle>{isMaintenanceMode ? "Maintenance Mode is ON" : "Maintenance Mode is OFF"}</AlertTitle>
                    <AlertDescription>
                        {isMaintenanceMode 
                            ? "While active, only logged-in admins can access the site." 
                            : "The site is currently live and accessible to all users."
                        }
                    </AlertDescription>
                </Alert>
                 <div className="flex items-center space-x-2 mt-4">
                    <Switch 
                        id="maintenance-mode" 
                        checked={isMaintenanceMode} 
                        onCheckedChange={handleToggleMaintenanceMode}
                        disabled={isTogglingMaintenance}
                    />
                    <Label htmlFor="maintenance-mode">{isTogglingMaintenance ? "Updating..." : "Activate Maintenance Mode"}</Label>
                </div>
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Video /> Tutorial Videos</CardTitle>
          <CardDescription>Set the YouTube video links for user tutorials.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...tutorialForm}>
            <form onSubmit={tutorialForm.handleSubmit(onSaveTutorials)} className="space-y-4">
                <FormField control={tutorialForm.control} name="seekerVideoUrl" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Seeker Tutorial Video URL</FormLabel>
                    <FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={tutorialForm.control} name="writerVideoUrl" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Writer Tutorial Video URL</FormLabel>
                    <FormControl><Input placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}/>
                <Button type="submit" disabled={isSavingTutorials}>
                {isSavingTutorials && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Save Tutorial Links
                </Button>
            </form>
            </Form>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Users/> User Management</h2>
          <div className="relative">
             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input
                type="search"
                placeholder="Search by ID, name, or email..."
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                }}
                className="pl-8 sm:w-[300px]"
            />
          </div>
        </div>
        
        <Tabs defaultValue="seekers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="seekers">Seekers ({seekers.length})</TabsTrigger>
                <TabsTrigger value="writers">Writers ({writers.length})</TabsTrigger>
                <TabsTrigger value="teachers">Teachers ({teachers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="seekers" className="mt-6">
                <UserTable
                    users={seekers}
                    user={userData}
                    onSort={requestUserSort}
                    sortConfig={userSortConfig}
                    onRoleChange={handleRoleChange}
                    onCredit={handleCreditWalletRequest}
                    onDebit={handleDebitWalletRequest}
                    onBan={handleToggleBanStatus}
                    onDelete={handleDeleteRequest}
                    onView={setViewedUser}
                />
            </TabsContent>
            <TabsContent value="writers" className="mt-6">
                <UserTable
                    users={writers}
                    user={userData}
                    onSort={requestUserSort}
                    sortConfig={userSortConfig}
                    onRoleChange={handleRoleChange}
                    onCredit={handleCreditWalletRequest}
                    onDebit={handleDebitWalletRequest}
                    onBan={handleToggleBanStatus}
                    onDelete={handleDeleteRequest}
                    onView={setViewedUser}
                />
            </TabsContent>
            <TabsContent value="teachers" className="mt-6">
                 <UserTable
                    users={teachers}
                    user={userData}
                    onSort={requestUserSort}
                    sortConfig={userSortConfig}
                    onRoleChange={handleRoleChange}
                    onCredit={handleCreditWalletRequest}
                    onDebit={handleDebitWalletRequest}
                    onBan={handleToggleBanStatus}
                    onDelete={handleDeleteRequest}
                    onView={setViewedUser}
                />
            </TabsContent>
        </Tabs>
      </div>

      <Sheet open={!!viewedUser} onOpenChange={(open) => !open && setViewedUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
                <SheetTitle>User Details</SheetTitle>
                <SheetDescription>
                    Viewing full details and controls for {viewedUser?.name}.
                </SheetDescription>
            </SheetHeader>
            {viewedUser && <AdminUserControls userId={viewedUser.uid} />}
        </SheetContent>
      </Sheet>

      <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credit Wallet for {selectedUserForDeposit?.name}</DialogTitle>
            <DialogDescription>
              Confirm a bank deposit by crediting the user's wallet. This action will increase their balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deposit-amount" className="text-right">Amount (LKR)</Label>
              <Input
                id="deposit-amount"
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="col-span-3"
                placeholder="e.g., 500.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepositDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmCredit} disabled={isDepositing}>
              {isDepositing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Credit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDebitDialogOpen} onOpenChange={setIsDebitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Debit Wallet for {selectedUserForDebit?.name}</DialogTitle>
            <DialogDescription>
               Enter the amount to deduct from the user's wallet. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="debit-amount" className="text-right">Amount (LKR)</Label>
              <Input
                id="debit-amount"
                type="number"
                value={debitAmount}
                onChange={(e) => setDebitAmount(e.target.value)}
                className="col-span-3"
                placeholder={`Max: ${(selectedUserForDebit?.walletBalance || 0).toFixed(2)}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDebitDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDebit} disabled={isDebiting}>
              {isDebiting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Debit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the {deleteTarget?.type} "{deleteTarget?.name}" and all associated data. You will need to manually remove the user from Firebase Authentication.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
