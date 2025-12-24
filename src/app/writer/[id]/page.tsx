
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { UserData, Assignment } from "@/types";
import { Loader2, BookOpen, Star, GraduationCap, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayRating } from "@/components/DisplayRating";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function WriterProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const writerId = params.id as string;
    
    const [writer, setWriter] = useState<UserData | null>(null);
    const [completedAssignments, setCompletedAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (writerId) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    // Fetch writer data
                    const writerRef = doc(db, "users", writerId);
                    const writerSnap = await getDoc(writerRef);

                    if (writerSnap.exists() && writerSnap.data().role === 'writer') {
                        setWriter(writerSnap.data() as UserData);

                        // Fetch ONLY completed assignments for this writer.
                        const assignmentsQuery = query(
                            collection(db, "assignments"),
                            where("writerId", "==", writerId),
                            where("status", "==", "completed")
                        );
                        const assignmentsSnapshot = await getDocs(assignmentsQuery);
                        const completed = assignmentsSnapshot.docs
                            .map(doc => ({ id: doc.id, ...doc.data() } as Assignment))
                            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                            
                        setCompletedAssignments(completed);
                    } else {
                        setWriter(null);
                    }
                } catch (error) {
                    console.error("Error fetching writer profile:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [writerId]);

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!writer) {
        return <div className="text-center py-20 text-xl">Writer not found.</div>;
    }
    
    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8">
            <Card>
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                    <Avatar className="h-24 w-24 text-3xl border-4 border-primary">
                        <AvatarImage src={writer.photoURL} alt={writer.name} />
                        <AvatarFallback>{writer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                     <div className="space-y-1">
                        <h1 className="text-3xl font-bold">{writer.name}</h1>
                        <p className="text-muted-foreground flex items-center justify-center gap-2"><GraduationCap className="h-4 w-4" />{writer.educationLevel}</p>
                    </div>
                    <DisplayRating rating={writer.averageRating} ratingCount={writer.ratingCount} size={20} />
                     {userData && userData.role === 'seeker' && user?.uid !== writer.uid && (
                        <Button asChild className="w-full max-w-xs">
                            <Link href={`/post-assignment?writerId=${writer.uid}&writerName=${encodeURIComponent(writer.name)}`}>Request Assignment</Link>
                        </Button>
                    )}
                    {writer.interestedAreas && (
                      <div className="flex flex-wrap gap-2 justify-center pt-2">
                        <h4 className="w-full text-sm font-semibold text-muted-foreground">Interested Areas:</h4>
                        {writer.interestedAreas.split(',').map(area => area.trim()).filter(Boolean).map((area, index) => (
                          <Badge key={index} variant="secondary">{area}</Badge>
                        ))}
                      </div>
                    )}
                </CardContent>
            </Card>
            
            {writer.aboutMe && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Info /> About Me</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">{writer.aboutMe}</p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BookOpen /> Completed Assignments</CardTitle>
                    <CardDescription>A showcase of the writer's successfully completed work.</CardDescription>
                </CardHeader>
                <CardContent>
                    {completedAssignments.length > 0 ? (
                        <div className="space-y-4">
                            {completedAssignments.map(assignment => (
                                <div key={assignment.id} className="p-4 border rounded-md">
                                    <h4 className="font-semibold">{assignment.title}</h4>
                                    <p className="text-sm text-muted-foreground">{assignment.subject} - {assignment.educationLevel}</p>
                                    {assignment.rating && (
                                        <>
                                            <Separator className="my-2" />
                                            <div className="flex items-center gap-2">
                                                <DisplayRating rating={assignment.rating} size={16} />
                                            </div>
                                            {assignment.review && <p className="text-sm italic mt-1 text-muted-foreground">"{assignment.review}"</p>}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">This writer hasn't completed any assignments yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
