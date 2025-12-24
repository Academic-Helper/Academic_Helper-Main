
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, updateDoc, runTransaction, onSnapshot, increment, serverTimestamp, writeBatch, collection, query, where, getDocs, addDoc, setDoc, arrayUnion, arrayRemove, Timestamp, deleteDoc, deleteField } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Assignment, UserData, Bid } from "@/types";
import { Loader2, User, Info, MessageSquare, Phone, Mail, FileText, Upload, BookOpen, GraduationCap, Star, CircleCheck, Search, Users, UserCheck, UserX, AlertCircle, AlertTriangle, Percent, Gavel, Timer, Tag, Crown, Wallet, Edit, Video, Download, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNowStrict, isPast, isFuture, formatDistanceToNow } from 'date-fns';
import Chat from "@/components/Chat";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DisplayRating } from "@/components/DisplayRating";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createAdminNotification, createNotification } from "@/lib/notifications";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Stepper } from "@/components/ui/stepper";
import { RatingInput } from "@/components/RatingInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AssignmentReceipt } from "@/components/AssignmentReceipt";
import { ScrollArea } from "@/components/ui/scroll-area";


const CountdownTimer = ({ deadline }: { deadline: Timestamp }) => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const endDate = deadline.toDate();
            const distance = endDate.getTime() - now.getTime();

            if (distance < 0) {
                setTimeLeft("Bidding has ended");
                clearInterval(interval);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [deadline]);

    return <span className="font-semibold">{timeLeft}</span>;
};


export default function AssignmentDetailsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [stageSubmissionFile, setStageSubmissionFile] = useState<File | null>(null);
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);
  
  const [feeInput, setFeeInput] = useState('');
  const [isSubmittingFee, setIsSubmittingFee] = useState(false);
  const [isAcceptingFee, setIsAcceptingFee] = useState(false);
  const [isRespondingToRequest, setIsRespondingToRequest] = useState(false);
  const [isStagedPayment, setIsStagedPayment] = useState(false);
  const [stagePercentage, setStagePercentage] = useState(10);

  const [adminFeedback, setAdminFeedback] = useState("");
  
  const [isRequestingMeeting, setIsRequestingMeeting] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [requesterMessage, setRequesterMessage] = useState("");
  const [isMeetingJoinable, setIsMeetingJoinable] = useState(false);

  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [isCompletingAssignment, setIsCompletingAssignment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  
  const bidsArray = useMemo(() => assignment?.bids ? Object.values(assignment.bids).sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0)) : [], [assignment?.bids]);
  const biddingRange = useMemo(() => {
    if (bidsArray.length === 0) return "No bids yet";
    const fees = bidsArray.map(b => b.fee).filter(fee => fee !== undefined) as number[];
    if (fees.length === 0) return "No fees set";
    const min = Math.min(...fees);
    const max = Math.max(...fees);
    if (min === max) return `LKR ${min.toFixed(2)}`;
    return `LKR ${min.toFixed(2)} - LKR ${max.toFixed(2)}`;
  }, [bidsArray]);
  
  useEffect(() => {
    if (assignment?.zoomMeeting?.scheduledAt) {
      const scheduledTime = assignment.zoomMeeting.scheduledAt.toDate();
      
      const checkTime = () => {
        if (isPast(scheduledTime)) {
          setIsMeetingJoinable(true);
        } else {
          setIsMeetingJoinable(false);
        }
      };

      checkTime(); // Initial check
      const interval = setInterval(checkTime, 1000); // Check every second

      return () => clearInterval(interval);
    }
  }, [assignment?.zoomMeeting?.scheduledAt]);

  useEffect(() => {
    if (!id || !user) return;

    setLoading(true);
    const assignmentRef = doc(db, "assignments", id);
    const unsubscribeAssignment = onSnapshot(assignmentRef, async (docSnap) => {
      if (docSnap.exists()) {
        const fetchedAssignment = { id: docSnap.id, ...docSnap.data() } as Assignment;
        
        if (fetchedAssignment.status === 'bidding' && fetchedAssignment.biddingDeadline && fetchedAssignment.biddingDeadline.toDate() < new Date()) {
            fetchedAssignment.status = 'open'; 
            await updateDoc(assignmentRef, { status: 'open' }); 
        }
        
        setAssignment(fetchedAssignment);
        setIsStagedPayment(fetchedAssignment.isStagedPayment || false);

      } else {
        toast({ variant: "destructive", title: "Not Found", description: "This assignment does not exist." });
        router.push("/dashboard");
      }
       setLoading(false);
    });

    return () => {
        unsubscribeAssignment();
    };
  }, [id, user, toast, router]);


  useEffect(() => {
    if (!authLoading && !user) {
        router.push("/login");
    }
  }, [user, authLoading, router]);
  
  const handleCatchAssignment = async () => {
    if (!assignment || !userData || userData.role !== 'writer') return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, "assignments", assignment.id), {
        status: "claimed", writerId: userData.uid, writerName: userData.name,
      });
      await createNotification(assignment.seekerId, `${userData.name} has claimed your assignment: "${assignment.title.substring(0,20)}..."`, `/assignment/${assignment.id}`);
      toast({ title: "Success!", description: "You have claimed the assignment." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not claim the assignment." });
    } finally {
      setActionLoading(false);
    }
  };

    const handleAcceptRequest = async () => {
        if (!assignment || !userData || !isTheWriter) return;
        setIsRespondingToRequest(true);
        try {
            await updateDoc(doc(db, "assignments", id), {
                status: "claimed",
            });
            await createNotification(assignment.seekerId, `${userData.name} has accepted your direct assignment request for "${assignment.title.substring(0, 20)}..."`, `/assignment/${id}`);
            toast({ title: "Request Accepted!", description: "You can now propose a fee." });
        } catch (error) {
            console.error("Error accepting request:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not accept the request." });
        } finally {
            setIsRespondingToRequest(false);
        }
    };
    
    const handleDeclineRequest = async () => {
        if (!assignment || !userData || !isTheWriter || !assignment.writerId) return;
        setIsRespondingToRequest(true);
        try {
            await updateDoc(doc(db, "assignments", id), {
                status: 'rejected',
                writerId: null,
                writerName: null,
                givenUpBy: arrayUnion(assignment.writerId)
            });
            await createNotification(assignment.seekerId, `${userData.name} has declined your assignment request for "${assignment.title.substring(0, 20)}..." You can now offer it to another writer or make it public.`, `/assignment/${id}`);
            toast({ title: "Request Declined", description: "The seeker has been notified." });
            router.push('/dashboard');
        } catch (error) {
            console.error("Error declining request:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not decline the request." });
        } finally {
            setIsRespondingToRequest(false);
        }
    };

    const deleteChatHistory = async (assignmentId: string) => {
        try {
            const messagesRef = collection(db, "assignments", assignmentId, "messages");
            const messagesSnap = await getDocs(messagesRef);
            if (messagesSnap.empty) return;

            const batch = writeBatch(db);
            messagesSnap.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting chat history:", error);
            toast({ variant: "destructive", title: "Chat Deletion Failed", description: "Could not clear the previous chat history." });
        }
    };

    const handleGiveUpAssignment = async () => {
        if (!assignment || !userData || !isTheWriter || !assignment.writerId) return;
        if (assignment.paymentConfirmed) {
            toast({ variant: "destructive", title: "Action Not Allowed", description: "Cannot give up a paid assignment. Please contact support." });
            return;
        }

        setActionLoading(true);
        try {
            await deleteChatHistory(assignment.id);

            const assignmentRef = doc(db, 'assignments', assignment.id);
            await updateDoc(assignmentRef, {
                status: 'open',
                writerId: null,
                writerName: null,
                givenUpBy: arrayUnion(assignment.writerId),
                proposedFee: null,
                fee: null,
                feeAgreed: false,
            });
            
            await createNotification(assignment.seekerId, `${userData.name} has given up your assignment: "${assignment.title.substring(0, 20)}...". It is now open for other writers.`, `/assignment/${assignment.id}`);
            toast({ title: "Assignment Given Up", description: "The assignment is now available for other writers." });
            router.push('/dashboard');
        } catch (error) {
            console.error("Error giving up assignment:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not give up the assignment.' });
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleSeekerCancel = async () => {
        if (!assignment || !userData || !isSeeker) return;
        if (assignment.paymentConfirmed) {
            toast({ variant: "destructive", title: "Action Not Allowed", description: "Cannot cancel a paid assignment. Please contact support." });
            return;
        }

        if(assignment.isBidding && !assignment.writerId) {
            setIsReopenDialogOpen(true);
            return;
        }

        setActionLoading(true);
        try {
            if (assignment.writerId) {
                await deleteChatHistory(assignment.id);
            }

            const updates: any = {
                status: 'open',
                writerId: null,
                writerName: null,
                proposedFee: null,
                fee: null,
                feeAgreed: false,
            };
            if (assignment.writerId) {
                updates.givenUpBy = arrayUnion(assignment.writerId);
            }
            await updateDoc(doc(db, 'assignments', assignment.id), updates);

            if (assignment.writerId) {
                await createNotification(assignment.writerId, `The seeker has cancelled the assignment: "${assignment.title.substring(0, 20)}...". It is now open again.`, `/dashboard`);
            }
            toast({ title: "Assignment Cancelled", description: "Your assignment is now open for writers again." });
        } catch (error) {
            console.error("Error cancelling assignment:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the assignment.' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleReopenAssignment = async () => {
        if (!assignment) return;
        setActionLoading(true);
        try {
            await updateDoc(doc(db, "assignments", id), {
                status: 'open',
                isBidding: false,
                biddingDeadline: null,
                budget: null,
                bids: {},
            });
            toast({ title: "Assignment Reopened", description: "The assignment is now available on a first-come, first-serve basis." });
        } catch (error) {
            console.error("Error reopening assignment:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not reopen the assignment." });
        } finally {
            setActionLoading(false);
            setIsReopenDialogOpen(false);
        }
    };

    const handleDeleteAssignment = async () => {
        if (!assignment) return;
        setActionLoading(true);
        try {
            await deleteDoc(doc(db, "assignments", id));
            toast({ title: "Assignment Deleted", description: "The assignment has been permanently removed." });
            router.push('/dashboard');
        } catch (error) {
            console.error("Error deleting assignment:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete the assignment." });
        } finally {
            setActionLoading(false);
            setIsReopenDialogOpen(false);
        }
    };
  
    const handleProposeFee = async (stageToPropose: number) => {
        const fee = parseFloat(feeInput);
        if (isNaN(fee) || fee <= 0 || !assignment) {
            toast({ variant: 'destructive', title: 'Invalid Fee', description: 'Please enter a valid positive number for the fee.' });
            return;
        }
        setIsSubmittingFee(true);
        try {
            const assignmentRef = doc(db, 'assignments', assignment.id);
            let updates: any = {};
            
            if (isStagedPayment) {
                 if (stageToPropose === 1) {
                    updates = {
                        isStagedPayment: true,
                        currentStage: 1,
                        stages: {
                            1: { percentage: stagePercentage, amount: fee * (stagePercentage / 100), paid: false, submitted: false, completed: false },
                            2: { percentage: 0, amount: 0, paid: false, submitted: false, completed: false },
                            3: { percentage: 0, amount: 0, paid: false, submitted: false, completed: false },
                        },
                        proposedFee: null,
                        feeAgreed: false,
                        fee: null,
                    };
                } else {
                    const stageAmount = fee * (stagePercentage / 100);
                    updates = {
                        ...updates,
                        [`stages.${stageToPropose}.percentage`]: stagePercentage,
                        [`stages.${stageToPropose}.amount`]: stageAmount,
                    };
                }
            } else {
                updates = {
                    proposedFee: fee,
                    feeAgreed: false,
                    fee: null,
                    isStagedPayment: false, 
                };
            }
    
            await updateDoc(assignmentRef, updates);
            await createNotification(assignment.seekerId, `A fee has been proposed for "${assignment.title.substring(0, 20)}..."`, `/assignment/${assignment.id}`);
            toast({ title: 'Success', description: 'Fee proposal sent.' });
            setFeeInput('');
    
        } catch (error) {
            console.error("Error proposing fee:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not propose the fee.' });
        } finally {
            setIsSubmittingFee(false);
        }
    };

    const handleAcceptAndPayFee = async (stageToPay: number, amountToPay: number) => {
      if (!assignment || !user || !userData) return;
  
      if ((userData.walletBalance || 0) < amountToPay) {
        toast({
          variant: "destructive",
          title: "Insufficient Funds",
          description: "Your wallet balance is too low. Please deposit funds from your dashboard."
        });
        return;
      }
  
      setIsAcceptingFee(true);
      try {
        await runTransaction(db, async (transaction) => {
          const assignmentRef = doc(db, "assignments", id);
          const userRef = doc(db, "users", user.uid);
          
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists() || (userDoc.data().walletBalance || 0) < amountToPay) {
            throw new Error("Insufficient funds.");
          }
  
          transaction.update(userRef, {
            walletBalance: increment(-amountToPay)
          });
          
          let totalFee = 0;
          const updates: any = {
            status: 'in-progress',
            paymentConfirmed: true, 
          };

          if (isStagedPayment) {
             updates[`stages.${stageToPay}.paid`] = true;
             Object.values(assignment.stages || {}).forEach((stage, index) => {
                if (stage.paid || (index + 1) === stageToPay) {
                    totalFee += stage.amount;
                }
             });
          } else {
            totalFee = assignment.proposedFee || 0;
            updates.feeAgreed = true;
            updates.proposedFee = null;
          }
          updates.fee = totalFee;
  
          transaction.update(assignmentRef, updates);
        });
        
        await createNotification(assignment.writerId!, `Payment for "${assignment.title.substring(0, 20)}..." has been secured. You can begin working.`, `/assignment/${id}`);
        toast({ title: 'Payment Secured!', description: `LKR ${amountToPay.toFixed(2)} has been deducted from your wallet.` });
  
      } catch (error: any) {
        console.error("Error accepting fee and paying:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "Could not process payment." });
      } finally {
        setIsAcceptingFee(false);
      }
    };

    const handleCompletionAndFeedback = async () => {
        if (!assignment || !assignment.writerId || !assignment.fee || !user || !userData) return;
    
        if (rating === 0) {
            toast({ variant: 'destructive', title: 'Rating Required', description: 'Please provide a star rating for the writer.' });
            return;
        }
    
        setIsCompletingAssignment(true);
        try {
            await runTransaction(db, async (transaction) => {
                const assignmentRef = doc(db, "assignments", id);
                const writerRef = doc(db, 'users', assignment.writerId!);
                const financeSummaryRef = doc(db, "finances", "summary");
                
                const writerSnap = await transaction.get(writerRef);
                if (!writerSnap.exists()) throw new Error("Writer data not found.");
                
                const writerData = writerSnap.data() as UserData;
                const serviceCharge = writerData.hasZeroServiceCharge ? 0 : (assignment.fee || 0) * 0.10;
                const payoutAmount = (assignment.fee || 0) - serviceCharge;
    
                const assignmentUpdates: any = { status: 'completed', paidOut: true };
                if (assignment.isStagedPayment) {
                    assignmentUpdates['stages.3.completed'] = true;
                }
                
                transaction.update(assignmentRef, assignmentUpdates);
                transaction.update(writerRef, { walletBalance: increment(payoutAmount) });
                
                if (serviceCharge > 0) {
                    transaction.set(financeSummaryRef, { totalProfit: increment(serviceCharge) }, { merge: true });
                    const transactionRef = doc(collection(db, "finances", "summary", "transactions"));
                    transaction.set(transactionRef, {
                        amount: serviceCharge,
                        type: 'commission',
                        description: `Service charge for assignment: ${assignment.title.substring(0, 30)}...`,
                        timestamp: serverTimestamp()
                    });
                }
            });
    
            const writerRef = doc(db, 'users', assignment.writerId);
            await runTransaction(db, async (transaction) => {
                const writerSnap = await transaction.get(writerRef);
                if (!writerSnap.exists()) throw new Error("Writer data not found.");
                const writerData = writerSnap.data() as UserData;
                const oldAverage = writerData.ratingCount === 0 ? 0 : (writerData.averageRating || 0);
                const ratingCount = writerData.ratingCount || 0;
                const newAverage = ((oldAverage * ratingCount) + rating) / (ratingCount + 1);
    
                transaction.update(writerRef, { averageRating: newAverage, ratingCount: increment(1) });
            });
            await updateDoc(doc(db, "assignments", id), { rating, review, reviewSubmitted: true });
    
            if (adminFeedback.trim()) {
                await addDoc(collection(db, "feedback"), {
                    assignmentId: assignment.id,
                    assignmentTitle: assignment.title,
                    userId: user.uid,
                    userName: userData.name || 'Anonymous',
                    feedbackText: adminFeedback,
                    createdAt: serverTimestamp(),
                });
                await updateDoc(doc(db, "assignments", id), { adminFeedbackSubmitted: true });
            }
    
            await createNotification(assignment.writerId, `An assignment has been marked as complete. Check your wallet for the payout.`, `/profile`);
            await createAdminNotification(`Assignment "${assignment.title.substring(0, 20)}..." completed.`, `/admin/assignments`);
    
            toast({ title: "Assignment Completed!", description: "Thank you! Payment has been released and your feedback submitted." });
            setIsFeedbackDialogOpen(false);
    
        } catch (error: any) {
            console.error("Error during assignment completion:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Could not complete the assignment." });
        } finally {
            setIsCompletingAssignment(false);
        }
    };

    const handleMarkStageAsComplete = async (stageNumber: number) => {
        if (!assignment || !isSeeker) return;
        
        if (stageNumber === 3 && assignment.stages?.[3]?.submitted) {
          setIsFeedbackDialogOpen(true);
          return;
        }

        setActionLoading(true);
        try {
            const updates: any = {
                [`stages.${stageNumber}.completed`]: true,
                currentStage: stageNumber + 1,
            };
            await updateDoc(doc(db, "assignments", id), updates);
            await createNotification(assignment.writerId!, `Stage ${stageNumber} for "${assignment.title.substring(0, 20)}..." has been marked as complete.`, `/assignment/${id}`);
            toast({ title: `Stage ${stageNumber} Complete!`, description: "The writer can now proceed to the next stage." });
        } catch(e) {
            console.error("Error completing stage:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not complete the stage.' });
        } finally {
            setActionLoading(false);
        }
    };
  
    const handleStageSubmit = async (stageNumber: number) => {
        if (!assignment || !isTheWriter || !stageSubmissionFile) return;
        setActionLoading(true);
        try {
            const filePath = `submissions/${assignment.id}/${assignment.writerId}/stage_${stageNumber}/${stageSubmissionFile.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, stageSubmissionFile);
            const downloadURL = await getDownloadURL(storageRef);

            await updateDoc(doc(db, "assignments", id), {
                [`stages.${stageNumber}.submitted`]: true,
                [`stages.${stageNumber}.submissionURL`]: downloadURL,
                [`stages.${stageNumber}.submissionName`]: stageSubmissionFile.name,
            });

            await createNotification(assignment.seekerId, `The writer has submitted work for Stage ${stageNumber} of "${assignment.title.substring(0, 20)}..."`, `/assignment/${id}`);
            toast({ title: "Stage Work Submitted", description: "The seeker has been notified to review your work." });
            setStageSubmissionFile(null);
        } catch (e) {
            console.error("Error submitting stage work:", e);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit stage work.' });
        } finally {
            setActionLoading(false);
        }
    };


  const handleFileSubmit = async () => {
    if (!submissionFile || !assignment || !user) return;

    setIsSubmittingFile(true);
    try {
      if (assignment.submissionURL && assignment.submissionName && assignment.writerId) {
        try {
            const oldFileRef = ref(storage, `submissions/${assignment.id}/${assignment.writerId}/${assignment.submissionName}`);
            await deleteObject(oldFileRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
              console.warn("Could not delete old submission file, it may be orphaned:", error);
            }
        }
      }

      const storageRef = ref(storage, `submissions/${assignment.id}/${user.uid}/${submissionFile.name}`);
      await uploadBytes(storageRef, submissionFile);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "assignments", assignment.id), {
        submissionURL: downloadURL,
        submissionName: submissionFile.name,
        status: 'submitted',
      });

      await createNotification(assignment.seekerId, `The writer has submitted the work for "${assignment.title.substring(0, 20)}..."`, `/assignment/${id}`);
      toast({ title: "Success!", description: "Your submission has been sent to the student." });
      setSubmissionFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not submit the file." });
    } finally {
      setIsSubmittingFile(false);
    }
  };
  
  const handleMakePublic = async () => {
    if (!assignment) return;
    setActionLoading(true);
    try {
        await updateDoc(doc(db, "assignments", id), {
            status: 'open',
            writerId: null, 
            writerName: null,
        });
        toast({ title: "Assignment is now public", description: "Your assignment is now available for all eligible writers to claim." });
    } catch (error) {
        console.error("Error making assignment public:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not make the assignment public." });
    } finally {
        setActionLoading(false);
    }
  }

  const handleStopBidding = async () => {
    if (!assignment || !isSeeker) return;
    setActionLoading(true);
    try {
        await updateDoc(doc(db, "assignments", id), {
            status: 'open', 
            biddingDeadline: Timestamp.now(),
        });
        toast({ title: "Bidding Stopped", description: "You can now select a writer from the bids." });
    } catch (error) {
        console.error("Error stopping bidding:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not stop the bidding." });
    } finally {
        setActionLoading(false);
    }
  };
  
  const handleSelectWriter = async (bid: Bid) => {
    if (!assignment || !isSeeker) return;
    setActionLoading(true);
    try {
        if (assignment.writerId && assignment.writerId !== bid.writerId) {
            await deleteChatHistory(assignment.id);
        }

        await updateDoc(doc(db, "assignments", id), {
            status: 'claimed',
            writerId: bid.writerId,
            writerName: bid.writerName,
            proposedFee: bid.fee,
            feeAgreed: false,
        });
        await createNotification(bid.writerId, `You have been selected to discuss the assignment: "${assignment.title.substring(0, 20)}..."`, `/assignment/${id}`);
        toast({ title: "Writer Selected for Chat", description: `You can now chat with ${bid.writerName} to finalize details before payment.` });
    } catch (error) {
        console.error("Error selecting writer:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not select the writer." });
    } finally {
        setActionLoading(false);
    }
  };

  const handleRemoveBid = async () => {
    if (!assignment || !userData) return;
    setActionLoading(true);
    try {
        await updateDoc(doc(db, "assignments", id), {
            [`bids.${userData.uid}`]: deleteField(),
            withdrawnBids: arrayUnion(userData.uid)
        });
        toast({ title: "Bid Removed", description: "You will not be able to bid on this assignment again." });
    } catch (error) {
        console.error("Error removing bid:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not remove your bid." });
    } finally {
        setActionLoading(false);
    }
  };

  const handleRequestZoomMeeting = async () => {
    if (!assignment || !userData || !requesterMessage.trim()) {
      toast({ variant: "destructive", title: "Message Required", description: "Please provide your available timeslots." });
      return;
    }
    setIsRequestingMeeting(true);
    try {
        const meetingData = {
            status: 'pending',
            requestedBy: userData.role,
            requesterMessage: requesterMessage,
            requestedAt: serverTimestamp()
        };
        await updateDoc(doc(db, 'assignments', id), {
            zoomMeeting: meetingData
        });

        const otherUserId = isSeeker ? assignment.writerId : assignment.seekerId;
        if (otherUserId) {
            await createNotification(otherUserId, `${userData.name} has requested a Zoom meeting.`, `/assignment/${id}`);
        }
        await createAdminNotification(`${userData.name} requested a Zoom meeting for "${assignment.title.substring(0, 20)}..."`, '/admin/assignments');
        toast({ title: "Request Sent", description: "Your request for a Zoom meeting has been sent to the admin." });
        setIsMeetingModalOpen(false);
        setRequesterMessage("");
    } catch (error) {
        console.error("Error requesting Zoom meeting:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not request the meeting.' });
    } finally {
        setIsRequestingMeeting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    const receiptElement = receiptRef.current;
    if (!receiptElement || !assignment) return;

    setIsDownloadingReceipt(true);
    try {
      const canvas = await html2canvas(receiptElement, { scale: 1.5 });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth - 20; 
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 10; 
      
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft >= -10) { 
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      pdf.save(`receipt-AH-${assignment.id.substring(0, 6)}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not generate PDF receipt." });
    } finally {
      setIsDownloadingReceipt(false);
    }
  }

  if (authLoading || loading || !assignment || !userData) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const isSeeker = userData.role === 'seeker' && userData.uid === assignment.seekerId;
  const isWriter = userData.role === 'writer';
  const isTheWriter = isWriter && userData.uid === assignment.writerId;
  const isAdmin = userData.role === 'admin';
  const canCatch = isWriter && assignment.status === 'open' && !assignment.isBidding && userData.educationLevel === assignment.educationLevel && !assignment.givenUpBy?.includes(userData.uid);
  const canChat = (isSeeker || isTheWriter || isAdmin) && ["claimed", "in-progress", "submitted", "completed", "pending-writer-acceptance", "rejected"].includes(assignment.status);
  const hasWithdrawnBid = assignment.withdrawnBids?.includes(userData.uid);


  const steps = ["Open", "Claimed", "In Progress", "Submitted", "Completed"];
  let currentStep = 0;

  if (assignment.isStagedPayment) {
    const stageNumber = assignment.currentStage || 1;
    steps.splice(2, 2, `Stage 1`, `Stage 2`, `Stage 3`);
    if (stageNumber === 1 && assignment.stages?.[1]?.paid) currentStep = 2;
    if (stageNumber === 2 && assignment.stages?.[2]?.paid) currentStep = 3;
    if (stageNumber === 3 && assignment.stages?.[3]?.paid) currentStep = 4;
    if (assignment.status === 'completed') currentStep = 6;
  } else {
    switch (assignment.status) {
        case "open": case "rejected": case "bidding": currentStep = 0; break;
        case "pending-writer-acceptance": case "claimed": currentStep = 1; break;
        case "in-progress": currentStep = 2; break;
        case "submitted": currentStep = 3; break;
        case "completed": currentStep = 5; break;
    }
  }

  const canCancel = !assignment.paymentConfirmed && assignment.status !== 'open' && assignment.status !== 'completed';
  const canWriterGiveUp = canCancel && isTheWriter && !assignment.isBidding;

  const totalPercentageAllocated = () => {
    if (!assignment.isStagedPayment || !assignment.stages) return 0;
    return Object.values(assignment.stages).reduce((acc, stage) => acc + (stage.percentage || 0), 0);
  };
  
  const seekerData = assignment.seekerId ? { uid: assignment.seekerId, name: assignment.seekerName } : null;
  const writerData = assignment.writerId ? { uid: assignment.writerId, name: assignment.writerName } : null;
  const receiptSeeker = isSeeker ? userData : seekerData;
  const receiptWriter = isTheWriter ? userData : writerData;
  
  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
       <div style={{ position: 'fixed', left: '-2000px', top: 0 }}>
        {receiptSeeker && receiptWriter && (
          <AssignmentReceipt
            ref={receiptRef}
            assignment={assignment}
            seeker={receiptSeeker as UserData}
            writer={receiptWriter as UserData}
          />
        )}
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <Badge variant={assignment.status === 'open' || assignment.status === 'bidding' ? 'secondary' : 'default'} className="capitalize mb-2">{assignment.status.replace(/-/g, ' ')}</Badge>
              <CardTitle className="text-3xl">{assignment.title}</CardTitle>
              <CardDescription className="text-base">{assignment.subject} - {assignment.educationLevel}</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {assignment.createdAt?.toDate ? format(assignment.createdAt.toDate(), 'PPP') : '...'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Assignment Details</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">{assignment.description}</p>
                {assignment.attachmentURL && (
                <div className="pt-2">
                    <Button asChild variant="outline">
                        <a href={assignment.attachmentURL} target="_blank" rel="noopener noreferrer">
                            <FileText className="mr-2 h-4 w-4" />
                            {assignment.attachmentName || "View Attachment"}
                        </a>
                    </Button>
                </div>
                )}
            </div>
            
            <Separator/>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">Assignment Progress</h3>
              <Stepper currentStep={currentStep} steps={steps} />
            </div>
            
            <Separator />
            
            <div className="grid md:grid-cols-2 gap-6">
              {!isSeeker && seekerData && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center"><User className="mr-2 h-5 w-5" /> Seeker Details</h3>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border">
                            
                            <AvatarFallback>{seekerData.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="w-full space-y-1">
                            <p className="font-bold text-base">{seekerData.name}</p>
                        </div>
                    </div>
                </div>
              )}
              
              {writerData && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center"><User className="mr-2 h-5 w-5" /> Writer Details</h3>
                     <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border">
                            
                            <AvatarFallback>{writerData.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="w-full space-y-1">
                             <div>
                                  <Link href={`/writer/${writerData.uid}`} className="font-bold text-base hover:underline">{writerData.name}</Link>
                                  
                              </div>
                        </div>
                    </div>
                </div>
              )}
            </div>

            {isSeeker && "completed" === assignment.status && assignment.reviewSubmitted && (
                assignment.rating && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Your Review</h4>
                        <div className="flex items-center gap-2">
                            <DisplayRating rating={assignment.rating} size={20} />
                        </div>
                        {assignment.review && <p className="text-sm italic mt-1 text-muted-foreground">"{assignment.review}"</p>}
                    </div>
                )
            )}
      
            {(isSeeker || isAdmin) && assignment.paymentConfirmed && (
                <div className="pt-2 space-y-2 text-sm">
                  <div className="p-4 bg-secondary rounded-md space-y-2 mt-2">
                      <h4 className="font-bold text-primary">Payment Confirmed!</h4>
                      {assignment.status === 'submitted' && assignment.submissionURL ? (
                          <div className="space-y-2">
                              <h5 className="font-bold">Assignment Submission</h5>
                              <p className="text-sm">The writer has submitted the completed assignment. Please download and review it.</p>
                              <Button asChild size="sm" className="w-full max-w-xs">
                                  <a href={assignment.submissionURL} target="_blank" rel="noopener noreferrer">
                                      <FileText className="mr-2 h-4 w-4" />Download Assignment
                                  </a>
                              </Button>
                          </div>
                      ) : (
                           !isStagedPayment && <p className="text-sm">Please communicate via the live chat. If needed, you can request a Zoom meeting to discuss further.</p>
                      )}
                  </div>
                </div>
            )}

            {(isSeeker || isAdmin || isTheWriter) && ['submitted', 'completed'].includes(assignment.status) && assignment.submissionURL && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center">
                        <FileText className="mr-2 h-5 w-5" /> Submission
                    </h3>
                    <div className="p-4 bg-secondary/50 rounded-md">
                        <p className="text-sm text-muted-foreground mb-3">
                        The final work has been submitted.
                        </p>
                        <Button asChild variant="outline">
                        <a href={assignment.submissionURL} target="_blank" rel="noopener noreferrer">
                            Download: {assignment.submissionName || 'File'}
                        </a>
                        </Button>
                    </div>
                </div>
            )}
          
            <div>
              <h3 className="font-semibold text-lg mb-4">Assignment Guide</h3>
                {isSeeker && (
                <div className="space-y-4 text-sm">
                    {assignment.status === 'open' && !assignment.isBidding && <p>Your assignment is live. Writers can now see and claim it.</p>}
                    {assignment.status === 'open' && assignment.isBidding && <p>Bidding has ended. You can now select a writer from the proposals below.</p>}
                    {assignment.status === 'pending-writer-acceptance' && <p>Your request has been sent to <strong>{assignment.writerName}</strong>. Waiting for a response.</p>}
                    {assignment.status === 'rejected' && <div className="space-y-3"><p><strong>{assignment.writerName}</strong> declined. You can make the assignment public or find another writer.</p><div className="flex flex-col sm:flex-row gap-2 mt-3"><Button size="sm" onClick={handleMakePublic} disabled={actionLoading}>{actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Users className="mr-2 h-4 w-4"/>} Make Public</Button><Button size="sm" variant="outline" asChild><Link href={`/find-helper?reassignId=${id}`}><Search className="mr-2 h-4 w-4"/> Find Another</Link></Button></div></div>}
                    {assignment.status === 'claimed' && !assignment.feeAgreed && !assignment.isStagedPayment && !assignment.proposedFee && <p><strong>{assignment.writerName}</strong> has claimed the assignment. Please wait for them to propose a fee.</p>}
                    {assignment.status === 'claimed' && assignment.proposedFee && !assignment.isStagedPayment && <div className="space-y-2"><p>Writer proposed <span className="font-bold">{assignment.proposedFee} LKR</span>.</p><div className="flex items-center gap-2 pt-2"><Button onClick={() => handleAcceptAndPayFee(0, assignment.proposedFee || 0)} disabled={isAcceptingFee} size="sm">{isAcceptingFee ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay & Accept'}</Button></div></div>}
                    {assignment.isStagedPayment && assignment.stages && [1,2,3].map(stageNum => {
                        const stage = assignment.stages![stageNum as keyof typeof assignment.stages];
                        if (assignment.currentStage === stageNum && !stage.paid && stage.amount > 0) {
                            return <div key={stageNum} className="space-y-2"><p>Writer proposed Stage {stageNum} fee: <span className="font-bold">{stage.amount} LKR</span>.</p><div className="flex items-center gap-2 pt-2"><Button onClick={() => handleAcceptAndPayFee(stageNum, stage.amount)} disabled={isAcceptingFee} size="sm">{isAcceptingFee ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay Stage ${stageNum}`}</Button></div></div>
                        }
                        if (assignment.currentStage === stageNum && !stage.paid && stage.amount === 0) {
                             return <p key={stageNum}>Waiting for writer to propose fee for Stage {stageNum}.</p>
                        }
                        return null;
                    })}
                    {assignment.status === 'in-progress' && !assignment.isStagedPayment && <p>Payment is secured. The writer is now working on your assignment.</p>}
                    {assignment.status === 'in-progress' && assignment.isStagedPayment && assignment.stages && [1,2,3].map(stageNum => {
                        const stage = assignment.stages![stageNum as keyof typeof assignment.stages];
                        if (assignment.currentStage === stageNum && stage.paid && !stage.submitted) {
                           return <p key={stageNum}>Stage {stageNum} paid. Waiting for writer to submit work.</p>
                        }
                        if (assignment.currentStage === stageNum && stage.paid && stage.submitted && !stage.completed) {
                            return (
                                <div key={stageNum} className="space-y-3">
                                    <p>Writer submitted Stage {stageNum} work. Please review and mark as complete to proceed.</p>
                                    {stage.submissionURL && (
                                        <Button asChild size="sm" variant="outline">
                                            <a href={stage.submissionURL} target="_blank" rel="noopener noreferrer">
                                                <FileText className="mr-2 h-4 w-4"/>Download Stage {stageNum} File
                                            </a>
                                        </Button>
                                    )}
                                    <Button onClick={() => handleMarkStageAsComplete(stageNum)} disabled={actionLoading} size="sm">{actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{stageNum === 3 ? `Mark Stage ${stageNum} as Complete & Finish` : `Mark Stage ${stageNum} as Complete`}</Button>
                                </div>
                            )
                        }
                        return null;
                    })}
                    {assignment.status === 'submitted' && <div className="space-y-3"><p>Please review the submission. If you are satisfied, mark the assignment as complete to release payment to the writer.</p><Button onClick={() => setIsFeedbackDialogOpen(true)} disabled={actionLoading} size="sm">{actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Mark as Complete</Button></div>}
                </div>
                )}


                {isTheWriter && (
                <div className="space-y-4 text-sm">
                    {assignment.status === 'pending-writer-acceptance' && <div className="space-y-3"><p><strong>{assignment.seekerName}</strong> has sent you a direct assignment request.</p><div className="flex gap-2 mt-3"><Button size="sm" onClick={handleAcceptRequest} disabled={isRespondingToRequest}>{isRespondingToRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserCheck className="mr-2 h-4 w-4"/>} Accept</Button><Button size="sm" variant="destructive" onClick={handleDeclineRequest} disabled={isRespondingToRequest}>{isRespondingToRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserX className="mr-2 h-4 w-4"/>} Decline</Button></div></div>}
                    {assignment.status === 'claimed' && !assignment.feeAgreed && !assignment.isStagedPayment && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Switch id="staged-payment-switch" checked={isStagedPayment} onCheckedChange={setIsStagedPayment}/>
                                <Label htmlFor="staged-payment-switch">Enable Staged Payments</Label>
                            </div>
                            <Label htmlFor="fee-proposal">Propose Your Fee (LKR)</Label>
                             {assignment.proposedFee && (
                                <p className="text-xs text-muted-foreground">
                                    Current proposal: <strong>{assignment.proposedFee.toFixed(2)} LKR</strong>. You can submit a new proposal below.
                                </p>
                            )}
                            <div className="flex items-center gap-2">
                                <Input id="fee-proposal" type="number" placeholder="e.g., 1500" value={feeInput} onChange={(e) => setFeeInput(e.target.value)} disabled={isSubmittingFee} />
                                <Button onClick={() => handleProposeFee(1)} disabled={isSubmittingFee || !feeInput}>{isSubmittingFee ? <Loader2 className="animate-spin" /> : 'Propose'}</Button>
                            </div>
                            {isStagedPayment && (
                                <div className="space-y-3 pt-2">
                                    <Label>Stage 1 Payment: {stagePercentage}%</Label>
                                    <Slider defaultValue={[10]} min={10} max={100} step={5} value={[stagePercentage]} onValueChange={(value) => setStagePercentage(value[0])}/>
                                    <p className="text-xs text-muted-foreground">The seeker pays this percentage first to start the assignment.</p>
                                </div>
                            )}
                        </div>
                    )}
                    {assignment.isStagedPayment && assignment.stages && [1,2,3].map(stageNum => {
                        const stage = assignment.stages![stageNum as keyof typeof assignment.stages];
                        const prevStage = assignment.stages![(stageNum - 1) as keyof typeof assignment.stages];
                        
                        if (assignment.currentStage === stageNum && !stage.paid && (!prevStage || prevStage.completed)) {
                            return (
                                <div key={stageNum} className="space-y-4">
                                    <Label htmlFor={`fee-proposal-stage-${stageNum}`}>Propose Fee for Stage {stageNum} (LKR)</Label>
                                     {stageNum > 1 && (
                                        <p className="text-xs text-muted-foreground">
                                            You have already allocated {totalPercentageAllocated()}% of the total fee.
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Input id={`fee-proposal-stage-${stageNum}`} type="number" placeholder="e.g., 1500" value={feeInput} onChange={(e) => setFeeInput(e.target.value)} disabled={isSubmittingFee} />
                                        <Button onClick={() => handleProposeFee(stageNum)} disabled={isSubmittingFee || !feeInput}>{isSubmittingFee ? <Loader2 className="animate-spin" /> : `Propose Stage ${stageNum}`}</Button>
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <Label>Stage {stageNum} Payment: {stagePercentage}%</Label>
                                        <Slider defaultValue={[10]} min={10} max={100} step={5} value={[stagePercentage]} onValueChange={(value) => setStagePercentage(value[0])}/>
                                    </div>
                                </div>
                            )
                        }
                        return null;
                    })}
                     {assignment.status === 'in-progress' && assignment.isStagedPayment && assignment.stages && [1,2,3].map(stageNum => {
                        const stage = assignment.stages![stageNum as keyof typeof assignment.stages];
                        if (assignment.currentStage === stageNum && stage.paid && !stage.submitted) {
                           return (
                                <div key={stageNum} className="space-y-3">
                                    <p>Stage {stageNum} is active. Upload and submit your work for this stage when ready.</p>
                                    <div className="flex items-center gap-4">
                                        <Label htmlFor={`stage-submission-${stageNum}`} className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
                                            <Upload className="mr-2 h-4 w-4"/>Choose File
                                        </Label>
                                        <Input id={`stage-submission-${stageNum}`} type="file" className="hidden" onChange={(e) => setStageSubmissionFile(e.target.files?.[0] || null)} disabled={actionLoading} />
                                        {stageSubmissionFile && (
                                            <span className="text-sm text-muted-foreground truncate max-w-xs" title={stageSubmissionFile.name}>
                                                {stageSubmissionFile.name}
                                            </span>
                                        )}
                                        <Button onClick={() => handleStageSubmit(stageNum)} disabled={actionLoading || !stageSubmissionFile} size="sm" className="ml-auto">
                                            {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : `Submit Stage ${stageNum}`}
                                        </Button>
                                    </div>
                                </div>
                           )
                        }
                        if (assignment.currentStage === stageNum && stage.paid && stage.submitted && !stage.completed) {
                           return <p key={stageNum}>Stage {stageNum} work submitted. Waiting for seeker to review and approve.</p>
                        }
                        return null;
                    })}
                    {assignment.status === 'in-progress' && !assignment.isStagedPayment && (
                    <div className="space-y-3">
                        <p>Submit your completed work here.</p>
                        <div className="flex items-center gap-4">
                            <Label htmlFor="submission-file" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
                                <Upload className="mr-2 h-4 w-4" />
                                Choose File
                            </Label>
                            <Input id="submission-file" type="file" className="hidden" onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} disabled={isSubmittingFile} ref={fileInputRef} />
                            {submissionFile && (
                                <span className="text-sm text-muted-foreground truncate max-w-xs" title={submissionFile.name}>
                                    {submissionFile.name}
                                </span>
                            )}
                            <Button onClick={handleFileSubmit} disabled={isSubmittingFile || !submissionFile} size="sm" className="ml-auto">
                                {isSubmittingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Submit'}
                            </Button>
                        </div>
                    </div>
                  )}
                  {assignment.status === 'submitted' && (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">The seeker will now review your work and mark the assignment as complete to release your payment.</p>
                         <div className="flex items-center gap-4 pt-2">
                            <Label htmlFor="resubmission-file" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer")}>
                                <Upload className="mr-2 h-4 w-4" /> Re-upload File
                            </Label>
                            <Input id="resubmission-file" type="file" onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} disabled={isSubmittingFile} ref={fileInputRef} className="hidden" />
                             {submissionFile && (
                                <span className="text-sm text-muted-foreground truncate max-w-xs" title={submissionFile.name}>
                                    {submissionFile.name}
                                </span>
                            )}
                            <Button onClick={handleFileSubmit} disabled={isSubmittingFile || !submissionFile} size="sm" className="ml-auto">
                                {isSubmittingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Re-submit'}
                            </Button>
                        </div>
                    </div>
                  )}
                  {assignment.status === 'completed' && <p>This assignment is complete. Payment has been released to your wallet.</p>}
                </div>
                )}
              
              {canCatch && <Button className="w-full" onClick={handleCatchAssignment} disabled={actionLoading}>{actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Catch Assignment</Button>}
              
                {(isTheWriter || isSeeker) && assignment.paymentConfirmed && assignment.status !== 'completed' && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Video /> Zoom Meeting</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(!assignment.zoomMeeting || ['declined', 'cancelled'].includes(assignment.zoomMeeting.status)) ? (
                                <>
                                    <p className="text-sm text-muted-foreground mb-4">Need to discuss the assignment live? Request a secure Zoom meeting facilitated by an admin.</p>
                                    <Button onClick={() => setIsMeetingModalOpen(true)}>
                                        Request Zoom Meeting
                                    </Button>
                                    {assignment.zoomMeeting?.status === 'declined' && (
                                        <p className="text-xs text-destructive mt-2">Your previous meeting request was declined.</p>
                                    )}
                                </>
                            ) : assignment.zoomMeeting.status === 'pending' ? (
                                <p className="text-sm text-muted-foreground">Your request for a Zoom meeting is pending admin approval.</p>
                            ) : assignment.zoomMeeting.status === 'approved' && assignment.zoomMeeting.link ? (
                                <div className="space-y-4">
                                     <Alert variant="default">
                                        <AlertTitle>Meeting Details</AlertTitle>
                                        <AlertDescription className="space-y-1">
                                            {assignment.zoomMeeting.adminMessage && <p>{assignment.zoomMeeting.adminMessage}</p>}
                                            {assignment.zoomMeeting.scheduledAt && (
                                                <p className="font-semibold">
                                                    Scheduled for: {format(assignment.zoomMeeting.scheduledAt.toDate(), 'PPP p')} for {assignment.zoomMeeting.durationMinutes} minutes.
                                                </p>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                    
                                    <Button asChild disabled={!isMeetingJoinable}>
                                        <a href={assignment.zoomMeeting.link} target="_blank" rel="noopener noreferrer">
                                          Join Zoom Meeting
                                        </a>
                                    </Button>
                                    {!isMeetingJoinable && assignment.zoomMeeting.scheduledAt && isFuture(assignment.zoomMeeting.scheduledAt.toDate()) && (
                                        <p className="text-xs text-muted-foreground">
                                            The meeting has not started yet. Time remaining: {formatDistanceToNowStrict(assignment.zoomMeeting.scheduledAt.toDate())}.
                                        </p>
                                    )}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                )}


              {canCancel && isSeeker && (
                <div className="pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={actionLoading}>
                        Cancel Assignment
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove the current writer and make the assignment open again.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Close</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSeekerCancel} disabled={actionLoading}>
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              {canWriterGiveUp && (
                  <div className="pt-4">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={actionLoading}>
                            Give Up Assignment
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action will make the assignment available for other writers. This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Close</AlertDialogCancel>
                            <AlertDialogAction onClick={handleGiveUpAssignment}>
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              )}


              {assignment.paymentConfirmed && !['completed', 'submitted'].includes(assignment.status) && (
                <Alert variant="default" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Need to Cancel?</AlertTitle>
                  <AlertDescription>
                    This assignment is already paid for. To request a cancellation, please <Link href="/support" className="font-bold underline">contact an admin</Link> via live support.
                  </AlertDescription>
                </Alert>
              )}
              
              {isAdmin && <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Admin View</AlertTitle></Alert>}
            </div>

            {canChat && (
                <>
                    <Separator />
                    <div className="pt-6">
                      <Chat assignmentId={id} />
                    </div>
                </>
            )}
        </CardContent>
        {isSeeker && assignment.status === 'completed' && (
          <CardFooter className="flex-col items-start gap-2 pt-6 border-t">
              <h3 className="font-semibold">Receipt</h3>
              <p className="text-sm text-muted-foreground">You can download the receipt for the completed task here.</p>
              <Button variant="outline" size="sm" onClick={handleDownloadReceipt} disabled={isDownloadingReceipt}>
                  {isDownloadingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
                  Download Receipt
              </Button>
          </CardFooter>
        )}
      </Card>
      
      {assignment.isBidding && !assignment.paymentConfirmed && (
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Gavel/>Bidding Activity</CardTitle>
                  {assignment.status === 'bidding' && assignment.biddingDeadline && (
                      <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1.5"><Timer className="h-4 w-4"/>Time left: <CountdownTimer deadline={assignment.biddingDeadline} /></span>
                        <span className="flex items-center gap-1.5"><Tag className="h-4 w-4"/>Bidding Range: <span className="font-semibold">{biddingRange}</span></span>
                        {assignment.budget && (
                            <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4"/>Budget: <span className="font-semibold">LKR {assignment.budget.toFixed(2)}</span></span>
                        )}
                      </CardDescription>
                  )}
                  {assignment.status !== 'bidding' && <CardDescription>Bidding has ended for this assignment.</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-6">
                  {isWriter && assignment.status === 'bidding' && !assignment.writerId && !hasWithdrawnBid && (
                      <div className="p-4 border rounded-lg space-y-4">
                          <h4 className="font-semibold text-lg">
                              {assignment.bids?.[userData.uid] ? "Manage Your Bid" : "Place Your Bid"}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                              {assignment.bids?.[userData.uid] 
                                  ? "You can edit your proposal up to 3 times or remove your bid entirely."
                                  : "Submit your proposal and fee to place your bid."
                              }
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button asChild disabled={(assignment.bids?.[userData.uid]?.editCount || 0) >= 3}>
                                <Link href={`/assignment/${id}/propose`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    {assignment.bids?.[userData.uid] ? "Edit Bid & Proposal" : "Place Bid & Proposal"}
                                </Link>
                            </Button>
                            {assignment.bids?.[userData.uid] && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" disabled={actionLoading}><Trash2 className="mr-2 h-4 w-4" /> Remove Bid</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure you want to remove your bid?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. You will not be able to bid on this assignment again.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleRemoveBid}>Confirm</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                          </div>
                           {(assignment.bids?.[userData.uid]?.editCount || 0) >= 3 && (
                                <p className="text-xs text-destructive">You have reached the maximum number of edits for this bid.</p>
                           )}
                      </div>
                  )}

                  {isSeeker && assignment.status === 'bidding' && (
                      <div className="flex justify-end">
                          <Button onClick={handleStopBidding} disabled={actionLoading} variant="destructive">
                              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Stop Bidding Now"}
                          </Button>
                      </div>
                  )}

                  <div className="space-y-4">
                        <h4 className="font-semibold">{bidsArray.length} Bid{bidsArray.length === 1 ? '' : 's'} Received</h4>
                        {bidsArray.length > 0 ? (
                             bidsArray.map(bid => {
                                const isOwnBid = bid.writerId === userData.uid;
                                const shouldObfuscate = isWriter && !isOwnBid;
                                const proposalText = shouldObfuscate
                                    ? `${bid.proposal.substring(0, 100)}...`
                                    : bid.proposal;

                                return (
                                <div key={bid.writerId} className="border rounded-lg p-4 flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarFallback>{bid.writerName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <Link href={`/writer/${bid.writerId}`} className={cn("font-semibold hover:underline", {"blur-sm select-none": shouldObfuscate})}>{shouldObfuscate ? "Anonymous Writer" : bid.writerName}</Link>
                                                <DisplayRating rating={bid.writerRating} ratingCount={bid.writerRatingCount} size={14}/>
                                            </div>
                                        </div>
                                        <div>
                                            <div className={cn("text-sm text-muted-foreground whitespace-pre-wrap relative", { "blur-sm select-none": shouldObfuscate })}>
                                                <p className="whitespace-pre-wrap">{proposalText}</p>
                                                {shouldObfuscate && <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="sm:text-right flex flex-row sm:flex-col justify-between items-center sm:items-end gap-2 sm:w-48">
                                        <div>
                                            <p className="text-lg font-bold">
                                              {bid.fee ? `LKR ${bid.fee.toFixed(2)}` : 'Fee not set'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{bid.createdAt ? formatDistanceToNow(bid.createdAt.toDate(), { addSuffix: true }) : ''}</p>
                                        </div>
                                        {isSeeker && !assignment.paymentConfirmed && (assignment.status === 'open' || assignment.status === 'claimed') && (
                                            <Button onClick={() => handleSelectWriter(bid)} disabled={actionLoading} size="sm">
                                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Crown className="mr-2 h-4 w-4"/>} 
                                                {assignment.writerId === bid.writerId ? "Selected" : "Select Writer"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                );
                            })
                        ) : <p className="text-sm text-muted-foreground text-center py-4">No bids have been placed yet.</p>}
                  </div>
              </CardContent>
          </Card>
      )}

       <AlertDialog open={isReopenDialogOpen} onOpenChange={setIsReopenDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Bidding Assignment?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Would you like to reopen this as a regular assignment (first-come, first-serve) or permanently delete it?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                     <AlertDialogAction onClick={handleReopenAssignment} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reopen for All'}
                    </AlertDialogAction>
                    <AlertDialogAction onClick={handleDeleteAssignment} className={cn(buttonVariants({ variant: "destructive" }))} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Permanently'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isMeetingModalOpen} onOpenChange={setIsMeetingModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request a Zoom Meeting</DialogTitle>
                    <DialogDescription>
                        Provide your available timeslots. An admin will review your request and schedule the meeting.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        placeholder="e.g., I'm free tomorrow between 2 PM - 5 PM, or on Wednesday after 1 PM."
                        value={requesterMessage}
                        onChange={(e) => setRequesterMessage(e.target.value)}
                        className="min-h-[100px]"
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsMeetingModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleRequestZoomMeeting} disabled={isRequestingMeeting || !requesterMessage.trim()}>
                        {isRequestingMeeting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Complete Assignment & Provide Feedback</DialogTitle>
                    <DialogDescription>
                        Please provide feedback before releasing the final payment to the writer.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] p-4">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base">Rate Your Writer</h4>
                            <div className="space-y-2">
                                <div>
                                    <Label htmlFor="rating">Your Rating *</Label>
                                    <RatingInput value={rating} onChange={setRating} />
                                </div>
                                <div>
                                    <Label htmlFor="review">Your Review (Optional)</Label>
                                    <Textarea id="review" placeholder="Describe your experience..." value={review} onChange={(e) => setReview(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <Separator />
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base">Feedback for Admin (Optional)</h4>
                            <p className="text-sm text-muted-foreground">Help us improve by sharing your experience with this assignment process.</p>
                            <Textarea
                                value={adminFeedback}
                                onChange={(e) => setAdminFeedback(e.target.value)}
                                placeholder="How was your experience? What can we do better?"
                            />
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(false)} disabled={isCompletingAssignment}>
                        Cancel
                    </Button>
                    <Button onClick={handleCompletionAndFeedback} disabled={isCompletingAssignment || rating === 0}>
                        {isCompletingAssignment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit & Complete Assignment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
