
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc, serverTimestamp, addDoc, getDoc, runTransaction, increment, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, BankDetails, DepositRequest, WithdrawalRequest, UserData, UserRole, EducationLevel, TutorialSettings } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Loader2, BookCopy, Pencil, Trash, Wallet, Info, Search, Video, PlayCircle, AlertTriangle, GraduationCap, Eye, Gavel, FolderKanban, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
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
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createAdminNotification, createNotification } from "@/lib/notifications";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function DashboardPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);
  const [tutorialSettings, setTutorialSettings] = useState<TutorialSettings | null>(null);


  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (user && !user.emailVerified && userData?.role !== 'admin') {
      router.push('/check-email');
      return;
    }

    if (userData) {
      if (userData.status === 'banned') {
        toast({
          variant: "destructive",
          title: "Account Banned",
          description: "Your account has been banned. Please contact support to get unbanned.",
        });
        return;
      }
      if (userData.role === 'admin') {
        router.push('/admin');
        return;
      }
      
      const fetchPublicData = async () => {
        setLoading(true);
        try {
          if (userData.role === 'seeker') {
            const bankDetailsRef = doc(db, "public_settings", "bankInfo");
            const bankDetailsSnap = await getDoc(bankDetailsRef);
            if (bankDetailsSnap.exists()) {
                setBankDetails(bankDetailsSnap.data() as BankDetails);
            }
          }
          if (userData.role === 'writer') {
            const levels: EducationLevel[] = ["O/L", "A/L", "University"];
            const userLvlIdx = userData.educationLevel ? levels.indexOf(userData.educationLevel) : -1;
            const accessibleLvls = userLvlIdx !== -1 ? levels.slice(0, userLvlIdx + 1) : [];

            if (accessibleLvls.length > 0) {
              const availableQuery = query(
                collection(db, "assignments"),
                where("educationLevel", "in", accessibleLvls),
                where("status", "in", ["open", "bidding"]),
                orderBy("createdAt", "desc"),
                limit(5)
              );
              const availableSnapshot = await getDocs(availableQuery);
              const available = availableSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
              const now = new Date();
              const filteredAvailable = available.filter(a => {
                  if (a.givenUpBy?.includes(userData.uid)) return false;
                  // If it's a bidding assignment that has ended, don't show it
                  if (a.isBidding && a.biddingDeadline && a.biddingDeadline.toDate() < now) return false;
                  return true;
              });
              setAvailableAssignments(filteredAvailable);
            }
          }
          const tutorialRef = doc(db, "public_settings", "tutorialVideos");
          const tutorialSnap = await getDoc(tutorialRef);
          if (tutorialSnap.exists()) {
              setTutorialSettings(tutorialSnap.data() as TutorialSettings);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not fetch required data." });
        } finally {
          setLoading(false);
        }
      };
      fetchPublicData();
    }
  }, [user?.uid, authLoading, router, toast]);

  const handleDepositRequest = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid positive number." });
      return;
    }
    if (!user || !userData) return;

    setIsSubmittingDeposit(true);
    try {
      await addDoc(collection(db, "depositRequests"), {
        userId: user.uid,
        userName: userData.name,
        userEmail: userData.email,
        ahUserId: userData.ahUserId || '',
        amount: amount,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await createAdminNotification(`New deposit request from ${userData.name} for LKR ${amount.toFixed(2)}`, '/admin');
      toast({ title: "Request Submitted", description: "Your deposit request has been sent to the admin for confirmation." });
      setIsDepositModalOpen(false);
      setDepositAmount('');
    } catch (error) {
      console.error("Error submitting deposit request:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not submit your request." });
    } finally {
      setIsSubmittingDeposit(false);
    }
  };
  
  const handleWithdrawRequest = async () => {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid positive number." });
        return;
      }
      if (!user || !userData) return;
      
      if (!userData.bankDetails) {
          toast({ variant: "destructive", title: "Bank Details Missing", description: "Please add your bank details in your profile before requesting a withdrawal." });
          setIsWithdrawModalOpen(false);
          router.push('/profile');
          return;
      }

      if (amount > (userData.walletBalance || 0)) {
         toast({ variant: "destructive", title: "Insufficient Funds", description: "You cannot withdraw more than your wallet balance." });
         return;
      }

      setIsSubmittingWithdrawal(true);
      try {
          await addDoc(collection(db, "withdrawalRequests"), {
              userId: user.uid,
              userName: userData.name,
              userEmail: userData.email,
              ahUserId: userData.ahUserId || '',
              amount: amount,
              status: "pending",
              bankDetails: userData.bankDetails,
              requestedAt: serverTimestamp(),
              currentWalletBalance: userData.walletBalance || 0,
          });
          await createAdminNotification(`${userData.name} requested a withdrawal of LKR ${amount.toFixed(2)}`, '/admin');
          toast({ title: "Withdrawal Request Submitted", description: "Your request has been sent to the admin for processing." });
          setIsWithdrawModalOpen(false);
          setWithdrawAmount('');
      } catch (error) {
          console.error("Error submitting withdrawal request:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not submit your withdrawal request." });
      } finally {
          setIsSubmittingWithdrawal(false);
      }
  };


  if (authLoading || loading || !userData || (userData && userData.role === 'admin')) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isSeeker = userData.role === 'seeker';
  const isWriter = userData.role === 'writer';
  const isTeacher = userData.role === 'teacher';
  const videoUrl = isSeeker ? tutorialSettings?.seekerVideoUrl : tutorialSettings?.writerVideoUrl;
  const contactWarningCount = userData.contactWarningCount || 0;
  const cancellationWarningCount = userData.cancellationWarningCount || 0;
  
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
       
       {contactWarningCount > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Contact Sharing Warning</AlertTitle>
          <AlertDescription>
            You have {contactWarningCount} out of 5 warnings for sharing contact information. Reaching 5 warnings will result in an account ban.
          </AlertDescription>
        </Alert>
      )}

      {cancellationWarningCount > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Assignment Cancellation Warning</AlertTitle>
          <AlertDescription>
            You have {cancellationWarningCount} out of 3 warnings for cancelling assignments after payment. Reaching 3 warnings will result in an account ban.
          </AlertDescription>
        </Alert>
      )}

      {isWriter && (
          <Card className="mb-8">
              <CardHeader>
                  <CardTitle>Welcome back, {userData.name}!</CardTitle>
                  <CardDescription>Manage your projects and earnings from one place.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Button asChild size="lg">
                      <Link href="/projects"><FolderKanban className="mr-2 h-5 w-5" /> Go to Projects</Link>
                  </Button>
              </CardContent>
          </Card>
      )}

      {isSeeker && (
          <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Welcome back, {userData.name}!</CardTitle>
                    <CardDescription>Manage your assignments and find academic help.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <Button asChild size="lg" className="w-full sm:w-auto">
                            <Link href="/projects"><FolderKanban className="mr-2 h-5 w-5" /> Go to Projects</Link>
                        </Button>
                    </div>
                     <Separator className="my-4"/>
                     <div className="space-y-2">
                        <h3 className="text-md font-semibold">Need Help?</h3>
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                           <Button asChild variant="outline" className="w-full sm:w-auto">
                              <Link href="/find-teacher"><GraduationCap className="mr-2 h-4 w-4" /> Find a Teacher</Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full sm:w-auto">
                              <Link href="/find-helper"><Search className="mr-2 h-4 w-4" /> Find an assignment writer</Link>
                            </Button>
                             <Button asChild variant="outline" className="w-full sm:w-auto">
                              <Link href="/post-assignment"><PlusCircle className="mr-2 h-4 w-4" /> Quick post an assignment</Link>
                            </Button>
                        </div>
                     </div>
                </CardContent>
            </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {userData?.walletBalance?.toFixed(2) || '0.00'}</div>
             <p className="text-xs text-muted-foreground">
              {isSeeker ? 'Funds for assignments and payouts.' : isWriter ? 'Funds available for withdrawal.' : 'Your current account balance.'}
            </p>
            {isWriter && (
              <Alert className="mt-4 text-xs p-3">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Service Fee</AlertTitle>
                  <AlertDescription>
                      A 10% service charge is deducted from your earnings upon assignment completion.
                  </AlertDescription>
              </Alert>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
                {(isSeeker || isTeacher) && (
                    <Button variant="outline" className="w-full" onClick={() => setIsDepositModalOpen(true)}>
                        Deposit
                    </Button>
                )}
                <Button 
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="w-full"
                    variant={isWriter || isTeacher ? 'outline' : 'default'}
                >
                    Withdraw
                </Button>
            </div>
          </CardContent>
        </Card>
         {videoUrl && !isTeacher && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" />Get Started</CardTitle>
                    <CardDescription>
                        Watch a quick tutorial to understand how the platform works.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href={videoUrl} target="_blank" rel="noopener noreferrer">
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Watch Tutorial
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )}
      </div>
      
       <div className="space-y-12">
        {(isSeeker || isWriter) && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><HelpCircle /> Help &amp; Guides</CardTitle>
                    <CardDescription>Understand the different types of assignments and payments.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Assignment Types: Direct vs. Bidding</AccordionTrigger>
                            <AccordionContent className="space-y-2 text-muted-foreground">
                                {isSeeker ? (
                                    <>
                                        <p><strong>Direct Assignment:</strong> Browse and select a specific writer. Send them a request directly. This is ideal when you know who you want to work with.</p>
                                        <p><strong>Bidding Assignment:</strong> Post your assignment to the public board. Writers will place bids (proposals), and you can choose the one that best fits your needs. This is great for getting competitive offers.</p>
                                    </>
                                ) : (
                                     <>
                                        <p><strong>Direct Assignment:</strong> A seeker sends a request specifically to you. You can choose to accept or decline. If you accept, you can start discussing the fee.</p>
                                        <p><strong>Bidding Assignment:</strong> These are public assignments. You can submit a proposal and your fee (a bid). The seeker will review all bids and select a writer to work with.</p>
                                    </>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Payment Methods: Full vs. Staged</AccordionTrigger>
                             <AccordionContent className="space-y-2 text-muted-foreground">
                                {isSeeker ? (
                                    <>
                                        <p><strong>Full Payment (Unstaged):</strong> You pay the total agreed fee upfront. The funds are held securely by the platform and are only released to the writer after you mark the assignment as complete.</p>
                                        <p><strong>Staged Payment:</strong> For larger projects, the payment can be split into up to three stages. You pay for each stage as it begins, and release funds upon its completion, giving you more control over the project flow.</p>
                                    </>
                                ) : (
                                    <>
                                        <p><strong>Full Payment (Unstaged):</strong> The seeker pays the full amount before you start. The payment is secured and transferred to your wallet once the assignment is marked as complete.</p>
                                        <p><strong>Staged Payment:</strong> You can propose breaking the project into up to three payment stages. You receive payment for each stage as it's completed and approved by the seeker, ensuring consistent cash flow for long-term projects.</p>
                                    </>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        )}

        {isTeacher && (
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16 border">
                        <AvatarImage src={userData.photoURL} alt={userData.name} />
                        <AvatarFallback>{userData.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle>Welcome, {userData.name}!</CardTitle>
                        <CardDescription>Manage your profile, view your banners, and see how your profile looks to students.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                      {userData.aboutMe && (
                        <div>
                          <h4 className="font-semibold text-sm mb-1">About Me</h4>
                          <p className="text-sm text-muted-foreground line-clamp-3">{userData.aboutMe}</p>
                        </div>
                      )}

                      {userData.banners && userData.banners.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Your Banners</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {userData.banners.map((banner, index) => (
                              <div key={index} className="relative aspect-video rounded-md overflow-hidden border">
                                <Image src={banner} alt={`Banner ${index + 1}`} layout="fill" objectFit="cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                </CardContent>
                <CardFooter className="flex-wrap gap-2">
                     <Button asChild>
                        <Link href="/profile"><Pencil className="mr-2 h-4 w-4"/>Edit Your Profile</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={`/teacher/${userData.uid}`}><Eye className="mr-2 h-4 w-4"/>View Public Profile</Link>
                    </Button>
                </CardFooter>
            </Card>
        )}
      </div>

      {isWriter && (
        <Card>
            <CardHeader>
                <CardTitle>Recent Opportunities</CardTitle>
                <CardDescription>Here are the latest assignments available for you.</CardDescription>
            </CardHeader>
            <CardContent>
                {availableAssignments.length > 0 ? (
                    <div className="space-y-4">
                        {availableAssignments.map(assignment => (
                            <div key={assignment.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="font-semibold">{assignment.title}</h3>
                                    <p className="text-sm text-muted-foreground">{assignment.subject} - {assignment.educationLevel}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Posted {assignment.createdAt?.toDate ? formatDistanceToNow(assignment.createdAt.toDate(), { addSuffix: true }) : '...'}
                                    </p>
                                </div>
                                <Button asChild size="sm" className="w-full sm:w-auto">
                                    <Link href={`/assignment/${assignment.id}`}>
                                        View Details
                                    </Link>
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-8">No new assignments available right now. Check back later!</p>
                )}
            </CardContent>
            <CardFooter>
                <Button asChild variant="outline" className="w-full">
                    <Link href="/projects">View All Projects</Link>
                </Button>
            </CardFooter>
        </Card>
      )}

      <Dialog open={isDepositModalOpen} onOpenChange={setIsDepositModalOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Deposit Funds</DialogTitle>
            <DialogDescription>To add funds, deposit to the account below and submit a request for confirmation.</DialogDescription>
             <Alert variant="default" className="mt-4 text-left">
                <Info className="h-4 w-4" />
                <AlertTitle>Important Instructions</AlertTitle>
                <AlertDescription className="space-y-1">
                    <p>Please use your AH User ID <strong className="text-primary">{userData.ahUserId}</strong> as the payment reference.</p>
                    <p>After payment, send the receipt to WhatsApp: <strong>+94756549095</strong>.</p>
                </AlertDescription>
            </Alert>
            </DialogHeader>
            {bankDetails ? (
            <div className="p-3 bg-secondary rounded-md text-sm space-y-1">
                <p><strong>Account Name:</strong> {bankDetails.accountName}</p>
                <p><strong>Account Number:</strong> {bankDetails.accountNumber}</p>
                <p><strong>Bank:</strong> {bankDetails.bankName}</p>
                <p><strong>Branch:</strong> {bankDetails.branchName}</p>
            </div>
            ) : <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div> }
            <div className="space-y-2">
            <Label htmlFor="deposit-amount">Deposited Amount (LKR)</Label>
            <Input id="deposit-amount" type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="e.g., 1000.00" />
            </div>
            <DialogFooter>
            <Button variant="outline" onClick={() => setIsDepositModalOpen(false)}>Cancel</Button>
            <Button onClick={handleDepositRequest} disabled={isSubmittingDeposit || !depositAmount}>
                {isSubmittingDeposit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Request Deposit
            </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
                {userData.bankDetails ? "Enter the amount to withdraw. Funds will be transferred to your saved bank account after admin approval." : "Please add your bank details in your profile before requesting a withdrawal."}
            </DialogDescription>
            </DialogHeader>
            {userData.bankDetails ? (
                <>
                <div className="p-3 bg-secondary rounded-md text-sm space-y-1">
                    <p><strong>Account Holder Name:</strong> {userData.bankDetails.accountName}</p>
                    <p><strong>Account Number:</strong> {userData.bankDetails.accountNumber}</p>
                    <p><strong>Bank:</strong> {userData.bankDetails.bankName}</p>
                    <p><strong>Branch:</strong> {userData.bankDetails.branchName}</p>
                    <p className="text-xs text-muted-foreground pt-2">Ensure these details are correct before proceeding.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Amount to Withdraw (LKR)</Label>
                    <Input id="withdraw-amount" type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder={`Available: ${userData.walletBalance?.toFixed(2) || '0.00'}`}/>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsWithdrawModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleWithdrawRequest} disabled={isSubmittingWithdrawal || !withdrawAmount}>
                    {isSubmittingWithdrawal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Request Withdrawal
                    </Button>
                </DialogFooter>
                </>
            ) : (
                <DialogFooter>
                <Button onClick={() => { setIsWithdrawModalOpen(false); router.push('/profile'); }}>Go to Profile</Button>
                </DialogFooter>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
