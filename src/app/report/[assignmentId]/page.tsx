
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
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
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Assignment, UserData, CancellationReport } from "@/types";
import { createAdminNotification } from "@/lib/notifications";

const reportSchema = z.object({
  reason: z.string().min(20, { message: "Report must be at least 20 characters." }),
});

type ReportFormValues = z.infer<typeof reportSchema>;

function ReportFormComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const assignmentId = params.assignmentId as string;
  const reportedUserId = searchParams.get('reportedUserId');

  const { user, userData, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [reportedUser, setReportedUser] = useState<UserData | null>(null);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reason: "",
    },
  });
  
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        router.push('/login');
        return;
    }
    if (!assignmentId || !reportedUserId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required information to file a report.' });
        router.push('/dashboard');
        return;
    }

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const assignmentSnap = await getDoc(doc(db, "assignments", assignmentId));
            if (assignmentSnap.exists()) {
                setAssignment(assignmentSnap.data() as Assignment);
            } else {
                throw new Error("Assignment not found.");
            }

            const reportedUserSnap = await getDoc(doc(db, "users", reportedUserId));
            if (reportedUserSnap.exists()) {
                setReportedUser(reportedUserSnap.data() as UserData);
            } else {
                throw new Error("User to be reported not found.");
            }
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
            router.push('/dashboard');
        } finally {
            setIsLoading(false);
        }
    }
    fetchData();

  }, [authLoading, user, router, toast, assignmentId, reportedUserId]);

  const onSubmit: SubmitHandler<ReportFormValues> = async (values) => {
    if (!user || !userData || !assignment || !reportedUser) {
        toast({ variant: "destructive", title: "Error", description: "Could not submit report. Missing required data." });
        return;
    }

    setIsLoading(true);
    try {
        const report: Omit<CancellationReport, 'id'> = {
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            reporterId: user.uid,
            reporterName: userData.name,
            reporterRole: userData.role,
            reportedUserId: reportedUser.uid,
            reportedUserName: reportedUser.name,
            reason: values.reason,
            createdAt: serverTimestamp() as any,
        };

        await addDoc(collection(db, "cancellationReports"), report);
        await createAdminNotification(`Cancellation report filed by ${userData.name}`, `/admin/reports`);
        
        toast({ title: "Report Submitted", description: "Thank you. An admin will review your report shortly." });
        router.push('/dashboard');
      
    } catch (error: any) {
      console.error("Failed to submit report:", error);
      toast({ variant: "destructive", title: "Submission Failed", description: error.message || "An unknown error occurred." });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (authLoading || isLoading || !assignment || !reportedUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">File a Cancellation Report</CardTitle>
          <CardDescription>
            You are filing a report against <strong>{reportedUser.name}</strong> regarding the assignment: <strong>"{assignment.title}"</strong>. Please provide details below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Report</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe why you are reporting this user in relation to the assignment cancellation. Be as specific as possible."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Submitting...</> : "Submit Report"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ReportFormComponent />
    </Suspense>
  );
}
