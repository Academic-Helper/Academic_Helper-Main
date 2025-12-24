
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, EducationLevel } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, BookCopy, Gavel, Pencil, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/lib/notifications";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WriterAssignmentCard = ({ assignment, onCatch, isCatching }: { assignment: Assignment, onCatch: (a: Assignment) => void, isCatching: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-4">
                <Badge variant={assignment.status === 'bidding' ? 'default' : 'secondary'} className="capitalize w-fit mb-2">{assignment.status}</Badge>
            <CardTitle className="text-base line-clamp-2">{assignment.title}</CardTitle>
            <CardDescription className="text-xs">{assignment.subject} - {assignment.educationLevel}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
                {assignment.createdAt?.toDate ? formatDistanceToNow(assignment.createdAt.toDate()) : '...'} ago
            </p>
            <div className="flex gap-2">
                <Link href={`/assignment/${assignment.id}`}><Button variant="outline" size="sm">View</Button></Link>
                {assignment.status === 'open' && !assignment.isBidding && (
                    <Button size="sm" onClick={() => onCatch(assignment)} disabled={isCatching}>
                        {isCatching ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Catch'}
                    </Button>
                )}
                {assignment.status === 'bidding' && (
                    <Button asChild size="sm"><Link href={`/assignment/${assignment.id}`}><Gavel className="mr-2 h-4 w-4"/>Bid</Link></Button>
                )}
            </div>
        </CardContent>
    </Card>
);

const SeekerAssignmentCard = ({ assignment, onDelete }: { assignment: Assignment, onDelete: (id: string) => void }) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader className="pb-4">
      <div className="flex justify-between items-start">
        <div>
          <Badge variant={['open', 'bidding', 'pending-writer-acceptance', 'rejected'].includes(assignment.status) ? 'secondary' : 'default'} className="capitalize w-fit mb-2">{assignment.status.replace(/-/g, ' ')}</Badge>
          <CardTitle className="text-base line-clamp-2">{assignment.title}</CardTitle>
          <CardDescription className="text-xs">{assignment.subject} - {assignment.educationLevel}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
            {assignment.createdAt?.toDate ? formatDistanceToNow(assignment.createdAt.toDate(), { addSuffix: true }) : ''}
        </p>
        <div className="flex items-center gap-1">
          {assignment.status !== 'completed' && assignment.status !== 'submitted' && (
            <>
               <Link href={`/assignment/edit/${assignment.id}`}>
                <Button variant="ghost" size="icon" title="Edit assignment" disabled={assignment.status !== 'open' && assignment.status !== 'bidding'}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="icon" title="Delete assignment" onClick={() => onDelete(assignment.id)} disabled={assignment.status !== 'open' && assignment.status !== 'bidding'}>
                <Trash className="h-4 w-4 text-destructive" />
              </Button>
            </>
          )}
          <Link href={`/assignment/${assignment.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
        </div>
    </CardContent>
  </Card>
);

const AssignmentColumn = ({ title, count, children }: { title: string, count: number, children: React.ReactNode }) => (
    <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">{title} ({count})</h2>
        <div className="space-y-4 p-2 rounded-lg bg-secondary/50 h-[70vh] overflow-y-auto">
            {count > 0 ? children : (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                    <BookCopy className="h-10 w-10 mb-2"/>
                    <p>No assignments here.</p>
                </div>
            )}
        </div>
    </div>
);


export default function ProjectsPage() {
    const { user, userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    // Writer state
    const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);
    const [writerOngoingAssignments, setWriterOngoingAssignments] = useState<Assignment[]>([]);
    const [writerCompletedAssignments, setWriterCompletedAssignments] = useState<Assignment[]>([]);
    const [isCatchingId, setIsCatchingId] = useState<string | null>(null);

    // Seeker state
    const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
    const [seekerOngoingAssignments, setSeekerOngoingAssignments] = useState<Assignment[]>([]);
    const [seekerCompletedAssignments, setSeekerCompletedAssignments] = useState<Assignment[]>([]);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);

    const fetchAssignments = useCallback(async () => {
        if (!userData) return;
        setLoading(true);

        if (userData.role === 'writer') {
            try {
                const ongoingQuery = query(collection(db, "assignments"), where("writerId", "==", userData.uid));
                const ongoingSnapshot = await getDocs(ongoingQuery);
                const allClaimed = ongoingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

                setWriterOngoingAssignments(allClaimed.filter(a => a.status !== 'completed'));
                setWriterCompletedAssignments(allClaimed.filter(a => a.status === 'completed'));

                const levels: EducationLevel[] = ["O/L", "A/L", "University"];
                const userLvlIdx = userData.educationLevel ? levels.indexOf(userData.educationLevel) : -1;
                const accessibleLvls = userLvlIdx !== -1 ? levels.slice(0, userLvlIdx + 1) : [];

                if (accessibleLvls.length > 0) {
                    const availableQuery = query(collection(db, "assignments"), where("educationLevel", "in", accessibleLvls), where("status", "in", ["open", "bidding"]));
                    const availableSnapshot = await getDocs(availableQuery);
                    const available = availableSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)).sort((a, b) => (b.createdAt.toMillis() || 0) - (a.createdAt.toMillis() || 0));
                    
                    const now = new Date();
                    const filteredAvailable = available.filter(a => {
                        if (a.givenUpBy?.includes(userData.uid)) return false;
                        if (a.isBidding && a.biddingDeadline && a.biddingDeadline.toDate() < now) {
                            return a.bids?.[userData.uid] ? true : false;
                        }
                        return true;
                    });
                    setAvailableAssignments(filteredAvailable);
                } else {
                    setAvailableAssignments([]);
                }
            } catch (error) {
                toast({ variant: "destructive", title: "Error", description: "Could not fetch writer assignments." });
            }
        } else if (userData.role === 'seeker') {
            try {
                const q = query(collection(db, "assignments"), where("seekerId", "==", userData.uid), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                const allAssignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));

                setPendingAssignments(allAssignments.filter(a => ['open', 'bidding', 'rejected', 'pending-writer-acceptance'].includes(a.status)));
                setSeekerOngoingAssignments(allAssignments.filter(a => ['claimed', 'in-progress', 'submitted'].includes(a.status)));
                setSeekerCompletedAssignments(allAssignments.filter(a => a.status === 'completed'));
            } catch (error) {
                 toast({ variant: "destructive", title: "Error", description: "Could not fetch seeker assignments." });
            }
        }
        setLoading(false);
    }, [userData, toast]);

    useEffect(() => {
        if (authLoading) return;
        if (!user || (userData && !['writer', 'seeker'].includes(userData.role))) {
            router.push("/dashboard");
        } else if (userData) {
            fetchAssignments();
        }
    }, [user, userData, authLoading, router, fetchAssignments]);

    const handleCatchAssignment = async (assignment: Assignment) => {
        if (!userData) return;
        setIsCatchingId(assignment.id);
        try {
            await updateDoc(doc(db, "assignments", assignment.id), { status: "claimed", writerId: userData.uid, writerName: userData.name });
            await createNotification(assignment.seekerId, `${userData.name} has claimed your assignment: "${assignment.title.substring(0, 20)}..."`, `/assignment/${assignment.id}`);
            toast({ title: "Success!", description: "Assignment claimed." });
            fetchAssignments();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not claim assignment." });
        } finally {
            setIsCatchingId(null);
        }
    };

    const handleDeleteRequest = (id: string) => {
        setAssignmentToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!assignmentToDelete) return;
        try {
            await deleteDoc(doc(db, "assignments", assignmentToDelete));
            toast({ title: "Success", description: "Assignment deleted." });
            fetchAssignments();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not delete assignment." });
        } finally {
            setIsDeleteDialogOpen(false);
            setAssignmentToDelete(null);
        }
    };
    
    if (authLoading || loading || !userData) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const renderWriterView = () => (
        <div className="space-y-8">
             <div className="space-y-4">
                <h2 className="text-xl font-semibold text-center">Available Assignments ({availableAssignments.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {availableAssignments.length > 0 ? availableAssignments.map(a => <WriterAssignmentCard key={a.id} assignment={a} onCatch={handleCatchAssignment} isCatching={isCatchingId === a.id} />) : (
                         <div className="col-span-full flex flex-col items-center justify-center h-full text-muted-foreground text-center py-12">
                            <BookCopy className="h-10 w-10 mb-2"/>
                            <p>No new assignments available right now.</p>
                        </div>
                     )}
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start pt-8">
                <AssignmentColumn title="Ongoing" count={writerOngoingAssignments.length}>
                    {writerOngoingAssignments.map(a => <WriterAssignmentCard key={a.id} assignment={a} onCatch={() => {}} isCatching={false} />)}
                </AssignmentColumn>
                <AssignmentColumn title="Completed" count={writerCompletedAssignments.length}>
                     {writerCompletedAssignments.map(a => <WriterAssignmentCard key={a.id} assignment={a} onCatch={() => {}} isCatching={false} />)}
                </AssignmentColumn>
            </div>
        </div>
    );

    const renderSeekerView = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <AssignmentColumn title="Pending" count={pendingAssignments.length}>
                {pendingAssignments.map(a => <SeekerAssignmentCard key={a.id} assignment={a} onDelete={handleDeleteRequest} />)}
            </AssignmentColumn>
            <AssignmentColumn title="Ongoing" count={seekerOngoingAssignments.length}>
                {seekerOngoingAssignments.map(a => <SeekerAssignmentCard key={a.id} assignment={a} onDelete={handleDeleteRequest} />)}
            </AssignmentColumn>
            <AssignmentColumn title="Completed" count={seekerCompletedAssignments.length}>
                {seekerCompletedAssignments.map(a => <SeekerAssignmentCard key={a.id} assignment={a} onDelete={handleDeleteRequest} />)}
            </AssignmentColumn>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Projects</h1>
                <p className="text-muted-foreground">Manage your assignment workflow from here.</p>
            </div>
            {userData.role === 'writer' ? renderWriterView() : renderSeekerView()}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this assignment. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
