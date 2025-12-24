
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
import Link from "next/link";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signOut, sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import type { UserData } from "@/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Wrench } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
        const maintenanceRef = doc(db, "public_settings", "maintenance");
        const maintenanceSnap = await getDoc(maintenanceRef);
        if (maintenanceSnap.exists()) {
            setIsMaintenanceMode(maintenanceSnap.data().isActive);
        }
    };
    fetchMaintenanceStatus();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserData;
        if (isMaintenanceMode && userData.role !== 'admin') {
            await signOut(auth);
            toast({
              variant: "destructive",
              title: "Under Maintenance",
              description: "The site is currently under maintenance. Only admins can log in. Please try again later.",
            });
            setIsLoading(false);
            return;
        }

        if (userData.status === 'banned') {
          await signOut(auth);
          toast({
            variant: "destructive",
            title: "Account Banned",
            description: "Your account has been banned. Please contact support to get unbanned.",
          });
          setIsLoading(false);
          return;
        }
      } else if (values.email.toLowerCase() !== 'danashanaka@gmail.com') {
          await signOut(auth);
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: "User data not found. Please contact support.",
          });
          setIsLoading(false);
          return;
      }
      
      if (!userCredential.user.emailVerified && values.email.toLowerCase() !== 'danashanaka@gmail.com') {
        const user = userCredential.user;
        
        await sendEmailVerification(user);
        
        toast({
            variant: "destructive",
            title: "Email Not Verified",
            description: "A new verification link has been sent. Please check your inbox and spam folder.",
        });
       
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      toast({
        title: "Success",
        description: "Logged in successfully.",
      });
      router.push("/dashboard");

    } catch (error: any) {
      let description = "An unknown error occurred. Please try again.";
      if (error.code === 'auth/invalid-credential') {
        if (values.email.toLowerCase() === 'danashanaka@gmail.com') {
           description = "Admin login failed. Please ensure the admin user exists in Firebase Authentication with the correct password.";
        } else {
           description = "Invalid email or password. Please check your credentials, or sign up if you don't have an account.";
        }
      } else if (error.code === 'auth/too-many-requests') {
        description = "Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later."
      }
      else {
        description = error.message;
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Log In</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {isMaintenanceMode && (
            <Alert variant="destructive" className="mb-4">
                <Wrench className="h-4 w-4" />
                <AlertTitle>Maintenance Mode Active</AlertTitle>
                <AlertDescription>
                   Site access is limited to administrators.
                </AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging In..." : "Log In"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="underline">
              Forgot your password?
            </Link>
          </div>
          <div className="mt-2 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
