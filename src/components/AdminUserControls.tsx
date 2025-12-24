
"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserData, Assignment, UserRole } from "@/types";
import { Loader2, User, BookOpen, Trash, ShieldAlert, Wallet, Phone, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

export default function AdminUserControls({ userId }: { userId: string }) {
    const [user, setUser] = useState<UserData | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [isAssignmentDetailOpen, setIsAssignmentDetailOpen] = useState(false);

    const cleanPhoneNumber = (num: string = '') => num.replace(/\D/g, '');

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                // Fetch user data
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = { ...userSnap.data(), uid: userSnap.id } as UserData;
                    setUser(userData);

                    let q;
                    if (userData.role === 'seeker') {
                        q = query(collection(db, "assignments"), where("seekerId", "==", userId), orderBy("createdAt", "desc"));
                    } else if (userData.role === 'writer') {
                        q = query(collection(db, "assignments"), where("writerId", "==", userId), orderBy("createdAt", "desc"));
                    }

                    if (q) {
                        const assignmentsSnapshot = await getDocs(q);
                        setAssignments(assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
                    } else {
                        setAssignments([]);
                    }
                }

            } catch (error) {
                console.error("Error fetching user control data:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not fetch user data." });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, toast]);
    
    const handleRoleChange = async (newRole: UserRole) => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        try {
            await updateDoc(userRef, { role: newRole });
            setUser(prev => prev ? { ...prev, role: newRole } : null);
            toast({ title: "Success", description: "User role updated." });
        } catch (error) {
            console.error("Failed to update role", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update user role." });
        }
    };

    const handleDeleteUser = async () => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "users", user.uid));
            toast({ title: "User Deleted", description: `${user.name} has been removed. You may want to close this panel.` });
            setUser(null); // Clear user data on successful deletion
        } catch (error) {
            console.error(`Error deleting user:`, error);
            toast({ variant: "destructive", title: "Error", description: `Could not delete the user.` });
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-muted-foreground">User not found or has been deleted.</div>;
    }

    const assignmentSectionTitle = user.role === 'seeker' ? 'Posted Assignments' : 'Claimed Assignments';
    const assignmentSectionDescription = user.role === 'seeker' 
        ? 'Assignments posted by this user.' 
        : 'Assignments claimed by this writer.';
    const noAssignmentsMessage = user.role === 'seeker'
        ? "This user has not posted any assignments."
        : "This user has not claimed any assignments."

    return (
        <div className="space-y-6 p-1">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border">
                            <AvatarImage src={user.photoURL} alt={user.name} />
                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="flex items-center gap-2"><User />{user.name}</CardTitle>
                            <CardDescription>{user.email}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Role</span>
                         <Select value={user.role} onValueChange={(value) => handleRoleChange(value as UserRole)} disabled={user.role === 'admin'}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="seeker">Seeker</SelectItem>
                                <SelectItem value="writer">Writer</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="flex items-center justify-between">
                         <span className="text-sm font-medium">User Actions</span>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="destructive" size="sm" disabled={user.role === 'admin'}>
                                    <Trash className="mr-2 h-4 w-4"/> Delete User
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This is permanent and cannot be undone. It will remove the user from Firestore but not from Firebase Authentication.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">User ID:</span> <span>{user.uid}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">AH User ID:</span> <span>{user.ahUserId || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Joined:</span> <span>{user.createdAt ? format(user.createdAt.toDate(), 'PPP') : 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Status:</span> <Badge variant={user.status === 'banned' ? 'destructive' : 'default'} className="capitalize">{user.status || 'active'}</Badge></div>
                        <div className="flex justify-between"><span className="font-medium text-muted-foreground">Wallet:</span> <span>LKR {user.walletBalance?.toFixed(2) || '0.00'}</span></div>
                        <div className="flex justify-between items-center"><span className="font-medium text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4"/>Phone:</span> <span>{user.phone || 'N/A'}</span></div>
                        <div className="flex justify-between items-center"><span className="font-medium text-muted-foreground flex items-center gap-2"><WhatsAppIcon className="mr-0"/>WhatsApp:</span> <span>{user.whatsApp || 'N/A'}</span></div>
                        {user.role === 'writer' && (
                            <>
                            <div className="flex justify-between"><span className="font-medium text-muted-foreground">Education:</span> <span>{user.educationLevel || 'N/A'}</span></div>
                            <div className="pt-2">
                                <h4 className="font-medium text-muted-foreground">Interested Areas:</h4>
                                <p>{user.interestedAreas || 'N/A'}</p>
                            </div>
                            <div className="pt-2">
                                <h4 className="font-medium text-muted-foreground">About Me:</h4>
                                <p className="whitespace-pre-wrap text-xs">{user.aboutMe || 'N/A'}</p>
                            </div>
                            </>
                        )}
                        {user.bankDetails && (
                            <div className="pt-2">
                                <h4 className="font-medium text-muted-foreground">Bank Details:</h4>
                                <div className="p-2 bg-secondary rounded-md mt-1 text-xs">
                                    <p><strong>Holder:</strong> {user.bankDetails.accountName}</p>
                                    <p><strong>Bank:</strong> {user.bankDetails.bankName}</p>
                                    <p><strong>Branch:</strong> {user.bankDetails.branchName}</p>
                                    <p><strong>Account:</strong> {user.bankDetails.accountNumber}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen/>{assignmentSectionTitle} ({assignments.length})</CardTitle>
                    <CardDescription>{assignmentSectionDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                    {assignments.length > 0 ? (
                        <div className="space-y-2">
                            {assignments.map(a => (
                                <div key={a.id} className="flex justify-between items-center p-2 border rounded-md">
                                    <div className="max-w-xs">
                                        <p className="font-semibold truncate">{a.title}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{a.status}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setSelectedAssignment(a);
                                        setIsAssignmentDetailOpen(true);
                                    }}>
                                        View
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">{noAssignmentsMessage}</p>
                    )}
                </CardContent>
            </Card>
             <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Admin Actions</AlertTitle>
                <AlertDescription>
                    Actions taken here are immediate and may be irreversible. Please proceed with caution.
                </AlertDescription>
            </Alert>

            <Dialog open={isAssignmentDetailOpen} onOpenChange={setIsAssignmentDetailOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                    {selectedAssignment && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedAssignment.title}</DialogTitle>
                                <DialogDescription>
                                    {selectedAssignment.subject} - {selectedAssignment.educationLevel}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 overflow-y-auto px-1">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedAssignment.description}</p>
                                <Separator />
                                <div className="text-sm space-y-2">
                                    <p><strong>Status:</strong> <Badge className="capitalize">{selectedAssignment.status.replace(/-/g, ' ')}</Badge></p>
                                    <p><strong>Seeker:</strong> {selectedAssignment.seekerName}</p>
                                    <p><strong>Writer:</strong> {selectedAssignment.writerName || 'Not Claimed'}</p>
                                    {selectedAssignment.feeAgreed && selectedAssignment.fee && (
                                        <p><strong>Agreed Fee:</strong> LKR {selectedAssignment.fee.toFixed(2)}</p>
                                    )}
                                    {selectedAssignment.createdAt && <p><strong>Posted:</strong> {format(selectedAssignment.createdAt.toDate(), 'PPP')}</p>}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setIsAssignmentDetailOpen(false)}>
                                    Close
                                </Button>
                                <Button asChild>
                                    <Link href={`/assignment/${selectedAssignment.id}`} target="_blank">Open Full Page</Link>
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
