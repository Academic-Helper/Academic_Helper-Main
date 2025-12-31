
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, Suspense } from "react";
import { Textarea } from "@/components/ui/textarea";
import { doc, getDoc, updateDoc, Timestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { Loader2, FileText, ArrowLeft } from "lucide-react";
import type { Assignment, Bid } from "@/types";
import Link from "next/link";
import { Input } from "@/components/ui/input";

const proposalWithFeeSchema = z.object({
  aboutMe: z.string().optional(),
  qualifications: z.string().optional(),
  workPlan: z.string().optional(),
  fee: z.coerce.number().positive({ message: "Please enter a valid, positive fee." }),
});


function ProposalFormComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, userData, loading: authLoading } = useAuth();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [existingBid, setExistingBid] = useState<Bid | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<z.infer<typeof proposalWithFeeSchema>>({
    resolver: zodResolver(proposalWithFeeSchema),
    defaultValues: {
      aboutMe: "",
      qualifications: "",
      workPlan: "",
    },
  });

  const parseStructuredProposal = (proposal: string): Omit<z.infer<typeof proposalWithFeeSchema>, 'fee'> => {
    const aboutMeMatch = proposal.match(/🧑‍💼 About Me\n([\s\S]*?)\n\n🎓/);
    const qualificationsMatch = proposal.match(/🎓 Qualifications to Claim This Work\n([\s\S]*?)\n\n⏱️/);
    const workPlanMatch = proposal.match(/⏱️ Work Plan & Timely Delivery\n([\s\S]*)/);

    return {
      aboutMe: aboutMeMatch ? aboutMeMatch[1].trim() : "",
      qualifications: qualificationsMatch ? qualificationsMatch[1].trim() : "",
      workPlan: workPlanMatch ? workPlanMatch[1].trim() : "",
    };
  };

  useEffect(() => {
    if (!authLoading && user && userData) {
        if (!id) return;
        const fetchAssignment = async () => {
            setIsFetching(true);
            const docRef = doc(db, "assignments", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as Assignment;
                 if (data.status !== 'bidding') {
                    toast({ variant: "destructive", title: "Bidding Closed", description: "Bidding for this assignment has ended." });
                    router.push(`/assignment/${id}`);
                    return;
                }
                if (data.withdrawnBids?.includes(userData.uid)) {
                    toast({ variant: "destructive", title: "Action Not Allowed", description: "You have withdrawn your bid and cannot bid again." });
                    router.push(`/assignment/${id}`);
                    return;
                }
                setAssignment(data);

                const currentBid = data.bids?.[userData.uid];
                setExistingBid(currentBid || null);

                if (currentBid) {
                    if ((currentBid.editCount || 0) >= 3) {
                         toast({ variant: "destructive", title: "Edit Limit Reached", description: "You cannot edit this proposal anymore." });
                         router.push(`/assignment/${id}`);
                         return;
                    }
                    if (currentBid.proposal) {
                        const parsedData = parseStructuredProposal(currentBid.proposal);
                        form.reset({ ...parsedData, fee: currentBid.fee });
                    } else {
                        form.reset({ fee: currentBid.fee });
                    }
                }

            } else {
                toast({ variant: "destructive", title: "Not Found", description: "This assignment does not exist." });
                router.push("/dashboard");
            }
            setIsFetching(false);
        };
        fetchAssignment();
    } else if (!authLoading && !user) {
        router.push("/login");
    }
  }, [id, user?.uid, authLoading, router, toast, form]);

  async function onSubmit(values: z.infer<typeof proposalWithFeeSchema>) {
    if (!user || !userData || !id) return;

    setIsLoading(true);
    try {
      const assignmentRef = doc(db, "assignments", id);
      
      const proposalString = `🧑‍💼 About Me\n${values.aboutMe || ''}\n\n🎓 Qualifications to Claim This Work\n${values.qualifications || ''}\n\n⏱️ Work Plan & Timely Delivery\n${values.workPlan || ''}`;
      
      const isEditing = !!existingBid;

      await updateDoc(assignmentRef, {
        [`bids.${userData.uid}.writerId`]: userData.uid,
        [`bids.${userData.uid}.writerName`]: userData.name,
        [`bids.${userData.uid}.writerEducationLevel`]: userData.educationLevel,
        [`bids.${userData.uid}.writerRating`]: userData.averageRating ?? 4.5,
        [`bids.${userData.uid}.writerRatingCount`]: userData.ratingCount ?? 0,
        [`bids.${userData.uid}.proposal`]: proposalString,
        [`bids.${userData.uid}.fee`]: values.fee,
        [`bids.${userData.uid}.createdAt`]: existingBid?.createdAt || Timestamp.now(),
        [`bids.${userData.uid}.editCount`]: isEditing ? increment(1) : 0,
      });

      toast({
        title: `Proposal ${isEditing ? 'Updated' : 'Submitted'}`,
        description: `Your proposal has been successfully ${isEditing ? 'updated' : 'submitted'}.`,
      });
      router.push(`/assignment/${id}`);
    } catch (error: any) {
      console.error("Failed to submit proposal:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading || isFetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const isEditing = !!existingBid;

  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl flex items-center gap-2"><FileText /> {isEditing ? "Edit" : "Submit"} Your Proposal</CardTitle>
                <CardDescription>For assignment: "{assignment?.title || '...'}"</CardDescription>
            </div>
            <Button asChild variant="outline">
                <Link href={`/assignment/${id}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Assignment</Link>
            </Button>
          </div>
           {isEditing && (
            <p className="text-sm text-amber-600 pt-4">
                You have edited this proposal {existingBid?.editCount || 0} out of 3 times.
            </p>
           )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="aboutMe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>🧑‍💼 About Me (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Briefly introduce yourself and your relevant experience..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="qualifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>🎓 Qualifications to Claim This Work (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Explain why you are the best fit for this specific assignment. Mention relevant skills, knowledge, or past projects."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="workPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>⏱️ Work Plan & Timely Delivery (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Outline your plan to complete the work. Mention key steps and how you will ensure it's delivered on time."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Fee (LKR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 2500"
                        {...field}
                      />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Submitting...</> : "Submit Proposal"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProposePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ProposalFormComponent />
        </Suspense>
    )
}
