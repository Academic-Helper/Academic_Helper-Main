
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams } from "next/navigation";
import { Loader2, FileText, X } from "lucide-react";
import type { Assignment } from "@/types";
import { Label } from "@/components/ui/label";

// Bidding fields are not included here as they cannot be edited after posting.
const formSchema = z.object({
  title: z.string().min(10, { message: "Title must be at least 10 characters." }),
  subject: z.string().min(3, { message: "Subject is required." }),
  educationLevel: z.enum(["O/L", "A/L", "University"], { required_error: "Please select an education level." }),
  description: z.string().min(50, { message: "Description must be at least 50 characters." }),
  attachment: z.any().optional(),
});

export default function EditAssignmentPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, userData, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [existingAttachmentName, setExistingAttachmentName] = useState<string | null>(null);
  const [existingAttachmentURL, setExistingAttachmentURL] = useState<string | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      subject: "",
      description: "",
    },
  });

  const attachment = form.watch("attachment");

  useEffect(() => {
    if (!authLoading && user) {
        if (!id) return;
        const fetchAssignment = async () => {
            setIsFetching(true);
            const docRef = doc(db, "assignments", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as Assignment;
                if (data.seekerId !== user.uid) {
                    toast({ variant: "destructive", title: "Access Denied", description: "You are not the owner of this assignment." });
                    router.push("/dashboard");
                    return;
                }
                if (data.status !== 'open' && data.status !== 'bidding') {
                    toast({ variant: "destructive", title: "Cannot Edit", description: "You can only edit assignments that are still open or in bidding." });
                    router.push(`/assignment/${id}`);
                    return;
                }
                form.reset(data);
                setExistingAttachmentName(data.attachmentName || null);
                setExistingAttachmentURL(data.attachmentURL || null);
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
  }, [id, user, authLoading, router, toast, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !id) return;

    setIsLoading(true);
    try {
      const assignmentRef = doc(db, "assignments", id);
      const file = values.attachment?.[0];
      const updateData: any = {
        ...values,
        updatedAt: serverTimestamp(),
      };
      delete updateData.attachment;
      
      // Handle attachment removal
      if (removeAttachment && existingAttachmentName) {
         try {
            const oldFileRef = ref(storage, `assignments/${user.uid}/${id}/${existingAttachmentName}`);
            await deleteObject(oldFileRef);
          } catch (error: any) {
             if (error.code !== 'storage/object-not-found') {
              console.warn("Could not delete old attachment, it may be orphaned:", error);
            }
          }
          updateData.attachmentURL = "";
          updateData.attachmentName = "";
      }

      // Handle new attachment upload
      if (file) {
        // If there was an old file, delete it first
        if (existingAttachmentName) {
            try {
                const oldFileRef = ref(storage, `assignments/${user.uid}/${id}/${existingAttachmentName}`);
                await deleteObject(oldFileRef);
            } catch (error: any) {
                if (error.code !== 'storage/object-not-found') {
                    console.warn("Could not delete old attachment before replacing:", error);
                }
            }
        }
        const storageRef = ref(storage, `assignments/${user.uid}/${id}/${file.name}`);
        await uploadBytes(storageRef, file);
        updateData.attachmentURL = await getDownloadURL(storageRef);
        updateData.attachmentName = file.name;
      }


      await updateDoc(assignmentRef, updateData);

      toast({
        title: "Assignment Updated",
        description: "Your assignment has been successfully updated.",
      });
      router.push(`/assignment/${id}`);
    } catch (error: any) {
      console.error("Failed to update assignment:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  const handleRemoveAttachment = () => {
    setRemoveAttachment(true);
    setExistingAttachmentName(null);
    form.setValue('attachment', null);
  };

  if (authLoading || isFetching) {
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
          <CardTitle className="text-2xl">Edit Assignment</CardTitle>
          <CardDescription>Update the details of your assignment below. Bidding details cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormLabel>Attachment</FormLabel>
                    {existingAttachmentName && !removeAttachment ? (
                        <div className="flex items-center justify-between p-2 border rounded-md">
                            <a href={existingAttachmentURL || '#'} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {existingAttachmentName}
                            </a>
                            <Button type="button" variant="ghost" size="icon" onClick={handleRemoveAttachment}>
                                <X className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ) : (
                       <FormControl>
                         <Input
                          id="attachment-input"
                          type="file"
                          onChange={(e) => {
                            onChange(e.target.files);
                            setRemoveAttachment(false); // If they upload, don't remove
                          }}
                          onBlur={onBlur}
                          name={name}
                          ref={ref}
                        />
                       </FormControl>
                    )}
                     <FormDescription>
                      {existingAttachmentName && !removeAttachment ? 'To change the file, first remove the current one.' : 'Attach any relevant documents for the assignment.'}
                     </FormDescription>
                     <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Updating...</> : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
