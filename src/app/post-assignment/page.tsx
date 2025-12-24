

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, Suspense } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addDoc, collection, serverTimestamp, doc, getDoc, updateDoc, arrayRemove, setDoc, Timestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, User, Upload } from "lucide-react";
import { createAdminNotification, createNotification } from "@/lib/notifications";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


const formSchema = z.object({
  title: z.string().min(10, { message: "Title must be at least 10 characters." }),
  subject: z.string().min(3, { message: "Subject is required." }),
  educationLevel: z.enum(["O/L", "A/L", "University"], { required_error: "Please select an education level." }),
  description: z.string().min(50, { message: "Description must be at least 50 characters." }),
  attachment: z.any().optional(),
  isBidding: z.boolean().default(false),
  biddingDurationValue: z.coerce.number({invalid_type_error: "Please enter a number."}).int().min(1, "Duration must be at least 1.").optional(),
  biddingDurationUnit: z.enum(['minutes', 'hours']).default('hours').optional(),
  budget: z.coerce.number().optional(),
}).refine(data => {
    if (data.isBidding) {
        return data.biddingDurationValue !== undefined && data.biddingDurationValue > 0;
    }
    return true;
}, {
    message: "Bidding duration is required when bidding is enabled.",
    path: ["biddingDurationValue"],
});

function PostAssignmentFormComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const writerId = searchParams.get('writerId');
  const writerName = searchParams.get('writerName');
  const reassignId = searchParams.get('reassignId');
  const isDirectRequest = !!writerId && !!writerName;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
      isBidding: false,
      biddingDurationUnit: 'hours',
    },
  });
  
  const attachment = form.watch("attachment");
  const isBidding = form.watch("isBidding");


  useEffect(() => {
    if (!authLoading) {
      if (!user || userData?.role !== 'seeker') {
        toast({ variant: "destructive", title: "Access Denied", description: "You must be a seeker to post assignments." });
        router.push("/dashboard");
      } else if (reassignId) {
        const fetchOldAssignmentData = async () => {
            setIsLoading(true);
            const docRef = doc(db, "assignments", reassignId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.seekerId === user.uid) {
                    form.reset({
                        title: data.title,
                        subject: data.subject,
                        educationLevel: data.educationLevel,
                        description: data.description,
                    });
                } else {
                    toast({ variant: "destructive", title: "Access Denied", description: "You cannot reassign an assignment you do not own." });
                    router.push('/dashboard');
                }
            } else {
                toast({ variant: "destructive", title: "Not Found", description: "The assignment to reassign was not found." });
                router.push('/dashboard');
            }
            setIsLoading(false);
        };
        fetchOldAssignmentData();
      }
    }
  }, [user, userData, authLoading, router, toast, reassignId, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userData) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to post an assignment." });
        return;
    }

    setIsLoading(true);
    try {
      const file = values.attachment?.[0];
      let attachmentURL = "";
      let attachmentName = "";
      
      const docRef = reassignId ? doc(db, "assignments", reassignId) : doc(collection(db, "assignments"));
      
      if (file) {
          const storageRef = ref(storage, `assignments/${user.uid}/${docRef.id}/${file.name}`);
          await uploadBytes(storageRef, file);
          attachmentURL = await getDownloadURL(storageRef);
          attachmentName = file.name;
      }

      let biddingDeadline = null;
      if (values.isBidding && values.biddingDurationValue) {
        const durationInMs = values.biddingDurationUnit === 'minutes'
            ? values.biddingDurationValue * 60 * 1000
            : values.biddingDurationValue * 60 * 60 * 1000;
        biddingDeadline = Timestamp.fromMillis(Date.now() + durationInMs);
      }
      
      const assignmentData: any = {
        ...values,
        id: docRef.id,
        seekerId: user.uid,
        seekerName: userData.name,
        status: values.isBidding ? "bidding" : (isDirectRequest ? "pending-writer-acceptance" : "open"),
        createdAt: serverTimestamp(),
        attachmentURL,
        attachmentName,
        ...(isDirectRequest && { writerId: writerId, writerName: writerName }),
        ...(values.isBidding && { biddingDeadline, budget: values.budget || null, bids: {} }),
      };
      delete assignmentData.attachment;
      delete assignmentData.biddingDurationValue;
      delete assignmentData.biddingDurationUnit;

      if (reassignId && writerId && writerName) {
        const assignmentDoc = await getDoc(docRef);
        if (!assignmentDoc.exists() || assignmentDoc.data().seekerId !== user.uid) {
            throw new Error("You do not have permission to modify this assignment or it does not exist.");
        }

        await updateDoc(docRef, {
            ...values,
            attachmentURL: attachmentURL || (assignmentDoc.data().attachmentURL || ""),
            attachmentName: attachmentName || (assignmentDoc.data().attachmentName || ""),
            status: "pending-writer-acceptance",
            writerId,
            writerName,
            updatedAt: serverTimestamp(),
            proposedFee: null, fee: null, feeAgreed: false, paymentConfirmed: false, paidOut: false, rating: null, review: null, reviewSubmitted: false, submissionURL: null, submissionName: null,
            givenUpBy: arrayRemove(writerId),
            isBidding: false, // Re-assigning disables bidding for now
        });

        await createNotification(writerId, `${userData.name} has directly requested an assignment from you: "${values.title.substring(0, 20)}..."`, `/assignment/${reassignId}`);
        toast({ title: "Assignment Re-requested", description: `Your request has been sent to ${writerName}.` });
        router.push("/dashboard");

      } else {
        
        await setDoc(docRef, assignmentData);

        if (isDirectRequest && writerId) {
          await createNotification(writerId, `${userData.name} has directly requested an assignment from you: "${values.title.substring(0, 20)}..."`, `/assignment/${docRef.id}`);
          toast({ title: "Assignment Requested", description: `Your request has been sent to ${writerName}.` });
        } else {
          await createAdminNotification(`New assignment by ${userData.name}: "${values.title.substring(0,20)}..."`, `/assignment/${docRef.id}`);
          toast({ title: "Assignment Posted", description: "Your assignment is now live for writers to view." });
        }
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Failed to post/update assignment:", error);
      toast({ variant: "destructive", title: "Submission Failed", description: error.message || "An unknown error occurred." });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (authLoading || (reassignId && isLoading)) {
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
          <CardTitle className="text-2xl">{isDirectRequest ? "Request Assignment" : "Post a New Assignment"}</CardTitle>
          <CardDescription>{isDirectRequest ? `You are requesting a new assignment directly from ${writerName}.` : "Fill out the details below to find a qualified writer."}</CardDescription>
        </CardHeader>
        <CardContent>
           {isDirectRequest && (
              <Alert className="mb-6">
                <User className="h-4 w-4" />
                <AlertTitle>Direct Request</AlertTitle>
                <AlertDescription>
                  This assignment will be sent directly to <strong>{writerName}</strong>. If they accept, you can proceed with fee negotiation.
                </AlertDescription>
              </Alert>
            )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 'Analysis of Modernist Literature'" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 'English Literature'" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="educationLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="O/L">O/L</SelectItem>
                          <SelectItem value="A/L">A/L</SelectItem>
                          <SelectItem value="University">University</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed description of your assignment requirements, including any specific guidelines, formatting, and deadlines."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>The more detail you provide, the better.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attachment"
                render={({ field: { onChange, onBlur, name, ref } }) => (
                  <FormItem>
                    <FormLabel>Attachment (Optional)</FormLabel>
                    <FormControl>
                       <div className="flex items-center gap-4">
                        <Label
                          htmlFor="attachment-input"
                          className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                        </Label>
                        <Input
                          id="attachment-input"
                          type="file"
                          className="hidden"
                          onChange={(e) => onChange(e.target.files)}
                          onBlur={onBlur}
                          name={name}
                          ref={ref}
                        />
                         {attachment?.[0]?.name && (
                          <span className="text-sm text-muted-foreground truncate max-w-xs" title={attachment[0].name}>
                            {attachment[0].name}
                          </span>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>Attach any relevant documents for the assignment.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isDirectRequest && (
                 <FormField
                    control={form.control}
                    name="isBidding"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Enable Bidding</FormLabel>
                                <FormDescription>
                                    Allow multiple writers to bid on your assignment.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
              )}

              {isBidding && !isDirectRequest && (
                <Card className="bg-secondary/50">
                    <CardContent className="pt-6 space-y-6">
                        <FormField
                            control={form.control}
                            name="biddingDurationValue"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Bidding Duration</FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 24" {...field} />
                                    </FormControl>
                                    <FormField
                                        control={form.control}
                                        name="biddingDurationUnit"
                                        render={({ field: unitField }) => (
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={unitField.onChange}
                                                    defaultValue={unitField.value}
                                                    className="flex items-center space-x-2"
                                                >
                                                    <FormItem className="flex items-center space-x-1 space-y-0">
                                                        <FormControl><RadioGroupItem value="hours" /></FormControl>
                                                        <FormLabel className="font-normal text-sm">Hours</FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-1 space-y-0">
                                                        <FormControl><RadioGroupItem value="minutes" /></FormControl>
                                                        <FormLabel className="font-normal text-sm">Minutes</FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                        )}
                                    />
                                </div>
                                <FormDescription>How long writers have to place their bids.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="budget"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Expected Budget (LKR, Optional)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 2000" {...field} />
                                </FormControl>
                                <FormDescription>This helps writers place relevant bids.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
              )}


              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> {isDirectRequest ? "Requesting..." : "Posting..."}</> : (isDirectRequest ? "Send Request to Writer" : "Post Assignment")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


export default function PostAssignmentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <PostAssignmentFormComponent />
    </Suspense>
  );
}
