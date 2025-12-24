
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
import { useState, useEffect, useRef, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { doc, updateDoc, getDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, Edit, User as UserIcon, Upload, Trash, PlusCircle, MapPin, Eye } from "lucide-react";
import { DisplayRating } from "@/components/DisplayRating";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile } from "firebase/auth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Location } from "@/types";
import { Label } from "@/components/ui/label";
import { locations } from "@/lib/locations";
import Link from "next/link";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().min(1, { message: "Phone number is required." }),
  whatsApp: z.string().min(1, { message: "WhatsApp number is required." }),
  educationLevel: z.enum(["O/L", "A/L", "University"]).optional(),
  interestedAreas: z.string().optional(),
  aboutMe: z.string().max(500, { message: "About me cannot be more than 500 characters." }).optional(),
});

const bankDetailsSchema = z.object({
    accountName: z.string().min(1, "Account name is required."),
    accountNumber: z.string().min(1, "Account number is required."),
    bankName: z.string().min(1, "Bank name is required."),
    branchName: z.string().min(1, "Branch name is required."),
});

const olSubjects = [
    "Mother language (Sinhala or Tamil)", "Buddhism", "Catholicism", "Christianity",
    "Islam", "Hinduism", "English", "Mathematics", "Science", "History",
    "Business & Accounting Studies", "Geography", "Civic Education",
    "Entrepreneurship Studies", "Second Language - Sinhala (For students whose dominant language is Tamil)",
    "Second Language - Tamil (For students whose dominant language is Sinhala)", "Pali Language",
    "Sanskrit Language", "French Language", "German Language", "Hindi Language",
    "Japanese Language", "Arabic Language", "Korean Language", "Chinese Language",
    "Russian Language", "Eastern Music", "Western Music", "Carnatic Music",
    "Eastern Dancing", "Bharatha Dancing", "Art", "Appreciation of English Literary Texts (English Literature)",
    "Appreciation of Sinhala Literary Texts (Sinhala Literature)", "Appreciation of Tamil Literary Texts (Tamil Literature)",
    "Appreciation of Arabic Literary Texts (Arabic Literature)", "Drama and Theatre",
    "Information & Communication Technology", "Agriculture & Food Technology", "Aquatic Bio resources Technology",
    "Arts & Crafts", "Home Economics", "Health & Physical Education", "Communication & Media Studies",
    "Design & Construction Technology", "Design & Mechanical Technology", "Design, Electrical & Electronic Technology",
    "Electronic Writing & Shorthand"
];

const alSubjects = [
    // Science & Technology
    "Combined Mathematics", "Physics", "Chemistry", "Biology", "Agricultural Science",
    "ICT (Information and Communication Technology)", "Engineering Technology", "Science for Technology", "Bio-system Technology",
    // Commerce & Business
    "Business Studies", "Accounting", "Economics", "Business Statistics",
    // Religion & Civilizations
    "Buddhism", "Hinduism", "Islam", "Christianity", "Buddhist Civilization",
    "Hindu Civilization", "Islam Civilization", "Christian Civilization", "Greek and Roman Civilization",
    // Languages
    "Sinhala", "Tamil", "English", "Pali", "Sanskrit", "Arabic", "Hindi",
    "Japanese", "Chinese", "Korean", "Malay", "French", "German", "Russian",
    // Humanities & Social Sciences
    "Political Science", "History (Sri Lankan, Indian, European, or of the Modern World)",
    "Geography", "Logic and Scientific Method", "Mass Media and Communication Studies",
    // Aesthetics & Applied Arts
    "Aesthetic Subjects (Dancing, Music [Western or Eastern], Drama, Arts)", "Home Science"
];
const grades = Array.from({ length: 13 }, (_, i) => i + 1);

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isBankDetailsLoading, setIsBankDetailsLoading] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // Teacher specific state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isDeletingBanner, setIsDeletingBanner] = useState<string | null>(null);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      whatsApp: "",
      interestedAreas: "",
      aboutMe: "",
    },
  });
  
  const bankForm = useForm<z.infer<typeof bankDetailsSchema>>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
        accountName: "",
        accountNumber: "",
        bankName: "",
        branchName: ""
    }
  });
  
  useEffect(() => {
    if (!authLoading) {
        if (!user) {
            router.push("/login");
        } else if (userData) {
            form.reset({
                name: userData.name,
                educationLevel: userData.educationLevel,
                phone: userData.phone,
                whatsApp: userData.whatsApp || '',
                interestedAreas: userData.interestedAreas || '',
                aboutMe: userData.aboutMe || '',
            });
            if (userData.bankDetails) {
                bankForm.reset(userData.bankDetails);
            }
        }
    }
  }, [user, userData, authLoading, router, form, bankForm]);


  async function onSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!user || !userData) return;

    setIsLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      
      const dataToUpdate: any = {
        name: values.name,
        phone: values.phone,
        whatsApp: values.whatsApp,
        interestedAreas: values.interestedAreas || "",
        aboutMe: values.aboutMe || "",
      };

      if (userData.role === 'writer' && values.educationLevel) {
        dataToUpdate.educationLevel = values.educationLevel;
      }

      await updateDoc(userRef, dataToUpdate);

      toast({
        title: "Profile Updated",
        description: "Your personal details have been successfully updated.",
      });
      
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  async function onBankSubmit(values: z.infer<typeof bankDetailsSchema>) {
    if (!user) return;
    setIsBankDetailsLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { bankDetails: values });
      toast({ title: "Bank Details Saved", description: "Your bank details have been updated." });
      setIsEditingBank(false);
    } catch(e) {
      toast({ variant: "destructive", title: "Error", description: "Could not save bank details."});
    } finally {
      setIsBankDetailsLoading(false);
    }
  }

  const handlePhotoUpload = async () => {
    if (!photoFile || !user) return;
    setIsUploading(true);
    try {
        const filePath = `profile-photos/${user.uid}/${photoFile.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, photoFile);
        const photoURL = await getDownloadURL(storageRef);
        
        await updateProfile(user, { photoURL });
        await updateDoc(doc(db, "users", user.uid), { photoURL });

        toast({ title: "Success", description: "Profile photo updated." });
        setPhotoFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

    } catch (error) {
        console.error("Error uploading photo:", error);
        toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload profile photo." });
    } finally {
        setIsUploading(false);
    }
  };

  const handleTeacherFieldUpdate = async (field: 'subjects' | 'grades', value: any) => {
    if (!user) return;
    try {
        await updateDoc(doc(db, "users", user.uid), { [field]: value });
        toast({ title: "Success", description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated.` });
    } catch(e) {
        toast({ variant: "destructive", title: "Update Failed", description: `Could not update ${field}.` });
    }
  };

  const handleAddLocation = async () => {
    if(!user || !selectedProvince || !selectedDistrict || !selectedCity) {
        toast({ variant: "destructive", title: "Incomplete", description: "Please select a province, district, and city."});
        return;
    }
    setIsSavingLocation(true);
    try {
        const newLocation: Location = { province: selectedProvince, district: selectedDistrict, city: selectedCity };
        await updateDoc(doc(db, "users", user.uid), { locations: arrayUnion(newLocation) });
        toast({ title: "Location Added" });
        setIsLocationModalOpen(false);
        setSelectedProvince(""); setSelectedDistrict(""); setSelectedCity("");
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Could not add location." });
    } finally {
        setIsSavingLocation(false);
    }
  };
  
  const handleRemoveLocation = async (location: Location) => {
    if(!user) return;
    try {
        await updateDoc(doc(db, "users", user.uid), { locations: arrayRemove(location) });
        toast({ title: "Location Removed" });
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Could not remove location." });
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !userData) return;
    if ((userData.banners?.length || 0) >= 3) {
        toast({ variant: "destructive", title: "Limit Reached", description: "You can only upload a maximum of 3 banners." });
        return;
    }
    setIsUploadingBanner(true);
    try {
        const filePath = `teacher-banners/${user.uid}/${Date.now()}-${file.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        const bannerUrl = await getDownloadURL(storageRef);

        await updateDoc(doc(db, "users", user.uid), { banners: arrayUnion(bannerUrl) });
        toast({ title: "Banner Uploaded" });
    } catch(e) {
        toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload banner. Check storage rules." });
    } finally {
        setIsUploadingBanner(false);
        if(bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleDeleteBanner = async (bannerUrl: string) => {
    if (!user) return;
    setIsDeletingBanner(bannerUrl);
    try {
        const imageRef = ref(storage, bannerUrl);
        await deleteObject(imageRef);
        await updateDoc(doc(db, "users", user.uid), { banners: arrayRemove(bannerUrl) });
        toast({ title: "Banner Deleted" });
    } catch(e) {
        toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete banner." });
    } finally {
        setIsDeletingBanner(null);
    }
  }
  
  const availableDistricts = useMemo(() => {
    if (!selectedProvince) return [];
    return locations.districts[selectedProvince as keyof typeof locations.districts] || [];
  }, [selectedProvince]);

  const availableCities = useMemo(() => {
    if (!selectedDistrict) return [];
    return locations.cities[selectedDistrict as keyof typeof locations.cities] || [];
  }, [selectedDistrict]);

  
  if (authLoading || !userData) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start py-12">
      <div className="w-full max-w-2xl space-y-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">Edit Profile</CardTitle>
                <CardDescription>Update your personal and profile information below.</CardDescription>
              </div>
              {userData.role === 'teacher' && user && (
                <Button asChild variant="outline">
                  <Link href={`/teacher/${user.uid}`}><Eye className="mr-2 h-4 w-4"/> View Public Profile</Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                  <AvatarImage src={userData.photoURL || undefined} alt={userData.name} />
                  <AvatarFallback>{userData.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <Input 
                  id="photo-upload" 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} 
                  className="hidden" 
                  ref={fileInputRef}
              />
              <div className="flex gap-2">
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <UserIcon className="mr-2 h-4 w-4" /> Choose Photo
                  </Button>
                  <Button onClick={handlePhotoUpload} disabled={!photoFile || isUploading}>
                      {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Upload Photo
                  </Button>
              </div>
              {photoFile && <p className="text-sm text-muted-foreground">{photoFile.name}</p>}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Your full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                
                <FormItem>
                  <FormLabel>AH User ID</FormLabel>
                  <FormControl><Input value={userData.ahUserId || 'N/A'} disabled /></FormControl>
                  <FormDescription>Your unique user ID on Academia Helper.</FormDescription>
                </FormItem>
                
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="Your email" value={userData.email} disabled /></FormControl><FormDescription>Your email address cannot be changed.</FormDescription></FormItem>
                <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="Your contact number" {...field} /></FormControl><FormDescription>Your phone number will only be shared after payment confirmation.</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="whatsApp" render={({ field }) => (<FormItem><FormLabel>WhatsApp Number</FormLabel><FormControl><Input placeholder="e.g., +94771234567" {...field} /></FormControl><FormDescription>Your number for WhatsApp. Will be shared after payment confirmation.</FormDescription><FormMessage /></FormItem>)} />
                <FormItem><FormLabel>Role</FormLabel><FormControl><Input placeholder="Your role" value={userData.role} disabled className="capitalize"/></FormControl><FormDescription>Your role cannot be changed.</FormDescription></FormItem>
                
                {(userData.role === 'writer' || userData.role === 'teacher') && (
                  <FormField control={form.control} name="aboutMe" render={({ field }) => (
                    <FormItem>
                      <FormLabel>About Me</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell students a little bit about yourself, your expertise, and your writing/teaching style."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This will be displayed on your public profile. Max 500 characters.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {userData.role === 'writer' && (
                  <>
                    <FormField control={form.control} name="educationLevel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Highest Education Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select your education level" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="O/L">O/L</SelectItem>
                            <SelectItem value="A/L">A/L</SelectItem>
                            <SelectItem value="University">University</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>You will only see assignments matching this level.</FormDescription><FormMessage />
                      </FormItem>
                    )} />
                     <FormField control={form.control} name="interestedAreas" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interested Areas</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g., History, Physics, Creative Writing" {...field} />
                        </FormControl>
                        <FormDescription>List your areas of expertise, separated by commas.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormItem>
                        <FormLabel>Your Rating</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4 p-2 border rounded-md bg-secondary">
                              <DisplayRating rating={userData.averageRating} ratingCount={userData.ratingCount} />
                            </div>
                        </FormControl>
                        <FormDescription>This is your average rating from completed assignments.</FormDescription>
                    </FormItem>
                  </>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Updating...</> : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {userData.role === 'teacher' && (
             <Card>
                <CardHeader>
                    <CardTitle>Teacher Profile</CardTitle>
                    <CardDescription>Manage your teaching subjects, grades, locations and banners.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label>Subjects</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">Select Subjects ({userData.subjects?.length || 0})</Button></DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
                                    <DropdownMenuLabel>O/L Subjects</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {olSubjects.map(subject => (
                                        <DropdownMenuCheckboxItem key={subject} checked={userData.subjects?.includes(subject)} onCheckedChange={() => {
                                            const currentSubjects = userData.subjects || [];
                                            const newSubjects = currentSubjects.includes(subject) ? currentSubjects.filter(s => s !== subject) : [...currentSubjects, subject];
                                            handleTeacherFieldUpdate('subjects', newSubjects);
                                        }}>{subject}</DropdownMenuCheckboxItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>A/L Subjects</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {alSubjects.map(subject => (
                                        <DropdownMenuCheckboxItem key={subject} checked={userData.subjects?.includes(subject)} onCheckedChange={() => {
                                            const currentSubjects = userData.subjects || [];
                                            const newSubjects = currentSubjects.includes(subject) ? currentSubjects.filter(s => s !== subject) : [...currentSubjects, subject];
                                            handleTeacherFieldUpdate('subjects', newSubjects);
                                        }}>{subject}</DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                         <div className="space-y-2">
                            <Label>Grades</Label>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">Select Grades ({userData.grades?.length || 0})</Button></DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto">
                                <DropdownMenuLabel>Filter by Grade</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {grades.map(grade => (
                                    <DropdownMenuCheckboxItem key={grade} checked={userData.grades?.includes(grade)} onCheckedChange={() => {
                                        const currentGrades = userData.grades || [];
                                        const newGrades = currentGrades.includes(grade) ? currentGrades.filter(g => g !== grade) : [...currentGrades, grade];
                                        handleTeacherFieldUpdate('grades', newGrades);
                                    }}>Grade {grade}</DropdownMenuCheckboxItem>
                                ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label>Teaching Locations</Label>
                            <Button variant="outline" size="sm" onClick={() => setIsLocationModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Location</Button>
                        </div>
                        <div className="space-y-2">
                            {userData.locations && userData.locations.length > 0 ? userData.locations.map((loc, i) => (
                                <div key={i} className="flex items-center justify-between p-2 border rounded-md text-sm">
                                    <span>{loc.city}, {loc.district}, {loc.province}</span>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveLocation(loc)}><Trash className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center py-2">No locations added.</p>}
                        </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <Label>Banners (Max 3)</Label>
                             <Button variant="outline" size="sm" onClick={() => bannerInputRef.current?.click()} disabled={isUploadingBanner || (userData.banners?.length || 0) >= 3}>
                                {isUploadingBanner ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>} Upload Banner
                            </Button>
                            <Input id="banner-upload" type="file" accept="image/png, image/jpeg" ref={bannerInputRef} onChange={handleBannerUpload} className="hidden" />
                        </div>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {userData.banners?.map(banner => (
                                <div key={banner} className="relative group">
                                    <div className="aspect-video relative rounded-md overflow-hidden border">
                                       <Image src={banner} alt="Teacher banner" layout="fill" objectFit="cover" />
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="destructive" size="icon" onClick={() => handleDeleteBanner(banner)} disabled={!!isDeletingBanner}>
                                            {isDeletingBanner === banner ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </CardContent>
            </Card>
        )}

        {(userData.role === 'writer' || userData.role === 'seeker' || userData.role === 'teacher') && (
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl">Bank Details for Payouts</CardTitle>
                        <CardDescription>This information is required to receive payments or withdrawals.</CardDescription>
                    </div>
                    {!isEditingBank && (
                        <Button variant="outline" size="icon" onClick={() => setIsEditingBank(true)}><Edit className="h-4 w-4" /></Button>
                    )}
                </CardHeader>
                <CardContent>
                    {isEditingBank ? (
                         <Form {...bankForm}>
                             <form onSubmit={bankForm.handleSubmit(onBankSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={bankForm.control} name="accountName" render={({ field }) => (<FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={bankForm.control} name="accountNumber" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={bankForm.control} name="bankName" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="Commercial Bank" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={bankForm.control} name="branchName" render={({ field }) => (<FormItem><FormLabel>Branch Name</FormLabel><FormControl><Input placeholder="Colombo" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className="flex gap-2">
                                     <Button type="button" variant="outline" onClick={() => setIsEditingBank(false)} disabled={isBankDetailsLoading}>Cancel</Button>
                                     <Button type="submit" disabled={isBankDetailsLoading}>{isBankDetailsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Bank Details</Button>
                                </div>
                             </form>
                         </Form>
                    ) : userData.bankDetails ? (
                        <div className="space-y-2 text-sm">
                            <p><strong>Account Name:</strong> {userData.bankDetails.accountName}</p>
                            <p><strong>Account Number:</strong> {userData.bankDetails.accountNumber}</p>
                            <p><strong>Bank:</strong> {userData.bankDetails.bankName}</p>
                            <p><strong>Branch:</strong> {userData.bankDetails.branchName}</p>
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center py-4">
                            You have not added your bank details yet. Click the edit icon to add them.
                        </div>
                    )}
                </CardContent>
            </Card>
        )}
        
        <Dialog open={isLocationModalOpen} onOpenChange={setIsLocationModalOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Teaching Location</DialogTitle>
                    <DialogDescription>Select the province, district, and city where you teach.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Province</Label>
                        <Select value={selectedProvince} onValueChange={v => {setSelectedProvince(v); setSelectedDistrict(""); setSelectedCity("");}}>
                            <SelectTrigger><SelectValue placeholder="Select a province" /></SelectTrigger>
                            <SelectContent>{locations.provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>District</Label>
                        <Select value={selectedDistrict} onValueChange={v => {setSelectedDistrict(v); setSelectedCity("");}} disabled={!selectedProvince}>
                            <SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger>
                            <SelectContent>{availableDistricts.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>City</Label>
                        <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedDistrict}>
                            <SelectTrigger><SelectValue placeholder="Select a city" /></SelectTrigger>
                            <SelectContent>{availableCities.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLocationModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddLocation} disabled={isSavingLocation}>{isSavingLocation && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Location</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
