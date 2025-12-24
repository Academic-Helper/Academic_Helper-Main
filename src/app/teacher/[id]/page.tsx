
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { UserData } from "@/types";
import { Loader2, GraduationCap, Info, MapPin, Book, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function TeacherProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const teacherId = params.id as string;
    
    const [teacher, setTeacher] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    const cleanPhoneNumber = (num: string = '') => num.replace(/\D/g, '');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (teacherId) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const teacherRef = doc(db, "users", teacherId);
                    const teacherSnap = await getDoc(teacherRef);

                    if (teacherSnap.exists() && teacherSnap.data().role === 'teacher') {
                        setTeacher(teacherSnap.data() as UserData);
                    } else {
                        setTeacher(null);
                    }
                } catch (error) {
                    console.error("Error fetching teacher profile:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [teacherId]);

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!teacher) {
        return <div className="text-center py-20 text-xl">Teacher not found.</div>;
    }
    
    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            <Card>
                <CardContent className="p-6 flex flex-col sm:flex-row items-center text-center sm:text-left gap-6">
                    <Avatar className="h-32 w-32 text-5xl border-4 border-primary">
                        <AvatarImage src={teacher.photoURL} alt={teacher.name} />
                        <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                     <div className="space-y-2">
                        <h1 className="text-4xl font-bold">{teacher.name}</h1>
                        <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2 text-lg"><GraduationCap className="h-5 w-5" /> Teacher / Tutor</p>
                         <div className="pt-4 flex flex-col sm:flex-row items-center gap-2">
                             <a href={`https://wa.me/${cleanPhoneNumber(teacher.whatsApp)}`} target="_blank" rel="noopener noreferrer">
                                <Button><WhatsAppIcon /> Chat on WhatsApp</Button>
                             </a>
                             <a href={`tel:${cleanPhoneNumber(teacher.phone)}`}>
                                <Button variant="outline"><Phone className="mr-2 h-4 w-4"/> Call Now</Button>
                             </a>
                         </div>
                    </div>
                </CardContent>
            </Card>
            
            {teacher.aboutMe && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Info /> About Me</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">{teacher.aboutMe}</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Book /> Subjects & Grades</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Subjects</h4>
                            <div className="flex flex-wrap gap-2">
                                {teacher.subjects && teacher.subjects.length > 0 ? (
                                    teacher.subjects.map(s => <Badge key={s} variant="secondary">{s}</Badge>)
                                ) : <p className="text-sm text-muted-foreground">No subjects listed.</p>}
                            </div>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-2">Grades</h4>
                            <div className="flex flex-wrap gap-2">
                               {teacher.grades && teacher.grades.length > 0 ? (
                                    teacher.grades.sort((a,b) => a-b).map(g => <Badge key={g} variant="outline">Grade {g}</Badge>)
                                ) : <p className="text-sm text-muted-foreground">No grades listed.</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><MapPin /> Teaching Locations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside text-muted-foreground space-y-1">
                          {teacher.locations && teacher.locations.length > 0 ? (
                                teacher.locations.map((loc, i) => (
                                    <li key={i}>{loc.city}, {loc.district}</li>
                                ))
                            ) : <p className="text-sm">No locations listed.</p>}
                        </ul>
                    </CardContent>
                </Card>
            </div>


            {teacher.banners && teacher.banners.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Banners</CardTitle>
                        <CardDescription>Promotional materials from the teacher. Click to view full size.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {teacher.banners.map((bannerUrl) => (
                            <Dialog key={bannerUrl}>
                                <DialogTrigger asChild>
                                    <div className="relative aspect-video rounded-md overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity">
                                        <Image src={bannerUrl} alt={`${teacher.name}'s banner`} layout="fill" objectFit="cover" />
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="p-0 border-0 max-w-4xl">
                                    <Image src={bannerUrl} alt={`${teacher.name}'s banner`} width={1280} height={720} className="w-full h-auto rounded-lg"/>
                                </DialogContent>
                            </Dialog>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
