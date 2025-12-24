
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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, Gift, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { promotionSettingsSchema, type PromotionStatus } from "@/types";

export default function AdminPromotionsPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<z.infer<typeof promotionSettingsSchema>>({
        resolver: zodResolver(promotionSettingsSchema),
        defaultValues: {
            maxWinners: 5,
            referralsNeeded: 10,
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // Default to one year from now
        },
    });

    useEffect(() => {
        if (!authLoading) {
            if (userData?.role !== 'admin') {
                router.push("/dashboard");
            } else {
                const fetchPromoSettings = async () => {
                    setLoading(true);
                    try {
                        const promoRef = doc(db, "promotions", "referralProgram");
                        const promoSnap = await getDoc(promoRef);
                        if (promoSnap.exists()) {
                            const data = promoSnap.data() as PromotionStatus;
                            form.reset({ ...data, endDate: data.endDate.toDate() });
                        }
                    } catch (error) {
                        console.error("Error fetching promotion settings:", error);
                        toast({ variant: "destructive", title: "Error", description: "Could not fetch promotion settings." });
                    } finally {
                        setLoading(false);
                    }
                };
                fetchPromoSettings();
            }
        }
    }, [userData, authLoading, router, form, toast]);
    
    async function onSavePromotion(values: z.infer<typeof promotionSettingsSchema>) {
        setIsSaving(true);
        try {
            const promoRef = doc(db, "promotions", "referralProgram");
            const promoSnap = await getDoc(promoRef);
            
            const dataToSet = {
                ...values,
                endDate: Timestamp.fromDate(values.endDate),
                winnerCount: promoSnap.exists() ? promoSnap.data().winnerCount : 0,
            };

            await setDoc(promoRef, dataToSet, { merge: true });
            toast({ title: "Success", description: "Referral program settings updated." });
        } catch (error) {
            console.error("Error saving promotion settings:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not save promotion settings." });
        } finally {
            setIsSaving(false);
        }
    }

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
             <h1 className="text-3xl font-bold flex items-center gap-4"><Gift className="h-10 w-10 text-primary" /> Referral Program Settings</h1>
             <Card>
                <CardHeader>
                    <CardTitle>Manage Referral Promotion</CardTitle>
                    <CardDescription>Configure the rules for the writer referral program.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSavePromotion)} className="space-y-4">
                            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="maxWinners" render={({ field }) => (
                                    <FormItem><FormLabel>Max Winners</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="referralsNeeded" render={({ field }) => (
                                    <FormItem><FormLabel>Referrals Needed</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="endDate" render={({ field }) => (
                                    <FormItem className="flex flex-col pt-2"><FormLabel className="mb-2">End Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                    <FormMessage /></FormItem>
                                )} />
                            </div>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Save Promotion Settings
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
