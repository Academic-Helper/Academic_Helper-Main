
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query, doc, updateDoc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Assignment, AssignmentStatus } from "@/types";
import { Loader2, ArrowUpDown, Trash, BookOpen, Video, ExternalLink, Ban, CalendarIcon as CalendarIconLucide } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createNotification, createAdminNotification } from "@/lib/notifications";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SortableKeys = keyof Assignment;

type SortConfig = {
    key: SortableKeys;
    direction: 'ascending' | 'descending';
} | null;

const useSortableData = (items: Assignment[], config: SortConfig = null) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    let sortableItems = [...items];
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key) {
                const valA = a[sortConfig.key as keyof Assignment];
                const valB = b[sortConfig.key as keyof Assignment];
                
                const aExists = valA !== null && valA !== undefined;
                const bExists = valB !== null && valB !== undefined;

                if (!aExists && !bExists) return 0;
                if (!aExists) return 1;
                if (!bExists) return -1;
                
                if (valA < valB) {
                  return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                  return sortConfig.direction === 'ascending' ? 1 : -1;
                }
            }
            return 0;
        });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

export default function AdminAssignmentsPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    const [isManagingZoom, setIsManagingZoom] = useState(false);
    const [zoomLink, setZoomLink] = useState("");
    const [adminZoomMessage, setAdminZoomMessage] = useState("");
    const [selectedZoomRequest, setSelectedZoomRequest] = useState<Assignment | null>(null);
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
    const [scheduledTime, setScheduledTime] = useState("12:00");
    const [duration, setDuration] = useState("60");

    const { items: sortedAssignments, requestSort, sortConfig } = useSortableData(assignments, { key: 'createdAt', direction: 'descending' });

    const zoomRequests = useMemo(() => assignments.filter(a => a.zoomMeeting?.status === 'pending'), [assignments]);
    const approvedZoomMeetings = useMemo(() => assignments.filter(a => a.zoomMeeting?.status === 'approved'), [assignments]);

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        try {
            const assignmentsSnapshot = await getDocs(query(collection(db, "assignments"), orderBy("createdAt", "desc")));
            setAssignments(assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
        } catch (error) {
            console.error("Error fetching assignments:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch assignments." });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (!authLoading) {
            if (userData?.role !== 'admin') {
                router.push("/dashboard");
            } else {
                fetchAssignments();
            }
        }
    }, [userData, authLoading, router, fetchAssignments]);

    const handleStatusChange = async (assignmentId: string, status: AssignmentStatus) => {
        const assignmentRef = doc(db, "assignments", assignmentId);
        try {
            await updateDoc(assignmentRef, { status });
            setAssignments(prev => prev.map(a => a.id === assignmentId ? {...a, status} : a));
            toast({ title: "Success", description: "Assignment status updated." });
        } catch (error) {
            console.error("Failed to update status", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
        }
    }

    const handleDeleteRequest = (id: string, name: string) => {
        setDeleteTarget({ id, name });
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;

        const { id, name } = deleteTarget;
        setIsDeleteDialogOpen(false);

        toast({ title: "Deletion in Progress", description: `Removing assignment "${name}"...` });
        try {
            const messagesRef = collection(db, "assignments", id, "messages");
            const messagesSnap = await getDocs(messagesRef);
            const batch = writeBatch(db);
            messagesSnap.forEach(doc => batch.delete(doc.ref));
            batch.delete(doc(db, "assignments", id));
            await batch.commit();
            
            setAssignments(prev => prev.filter(a => a.id !== id));
            toast({ title: "Success", description: "Assignment and its chat history deleted." });
        } catch (error) {
             console.error(`Error deleting assignment:`, error);
             toast({ variant: "destructive", title: "Error", description: `Could not delete the assignment.` });
        }
        setDeleteTarget(null);
    };
    
    const handleAcceptZoomRequest = async () => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const extractedUrls = zoomLink.match(urlRegex);
      const finalZoomLink = extractedUrls ? extractedUrls[0] : null;

      if (!selectedZoomRequest || !finalZoomLink || !scheduledDate || !duration) {
          toast({ variant: "destructive", title: "Invalid Input", description: "Please provide a valid Zoom link, date, time, and duration." });
          return;
      }
      setIsManagingZoom(true);
      try {
          const assignmentRef = doc(db, "assignments", selectedZoomRequest.id);
          const [hours, minutes] = scheduledTime.split(':').map(Number);
          const finalScheduledDate = new Date(scheduledDate);
          finalScheduledDate.setHours(hours, minutes, 0, 0);

          await updateDoc(assignmentRef, {
              "zoomMeeting.status": 'approved',
              "zoomMeeting.link": finalZoomLink,
              "zoomMeeting.adminMessage": adminZoomMessage,
              "zoomMeeting.scheduledAt": Timestamp.fromDate(finalScheduledDate),
              "zoomMeeting.durationMinutes": parseInt(duration, 10),
          });

          await createNotification(selectedZoomRequest.seekerId, `Your Zoom meeting for "${selectedZoomRequest.title.substring(0, 20)}..." has been approved.`, `/assignment/${selectedZoomRequest.id}`);
          if (selectedZoomRequest.writerId) {
              await createNotification(selectedZoomRequest.writerId, `Your Zoom meeting for "${selectedZoomRequest.title.substring(0, 20)}..." has been approved.`, `/assignment/${selectedZoomRequest.id}`);
          }
          
          toast({ title: "Zoom Request Approved", description: "The users have been notified." });
          fetchAssignments(); // Refetch to update lists
          setSelectedZoomRequest(null);
          setZoomLink("");
          setAdminZoomMessage("");
      } catch (e) {
          console.error("Error accepting zoom request:", e);
          toast({ variant: "destructive", title: "Error", description: "Could not approve the request." });
      } finally {
          setIsManagingZoom(false);
      }
    };
    
    const handleRejectZoomRequest = async (request: Assignment) => {
        setIsManagingZoom(true);
        try {
            const assignmentRef = doc(db, "assignments", request.id);
            await updateDoc(assignmentRef, {
                "zoomMeeting.status": 'declined',
            });
            await createNotification(request.seekerId, `Your Zoom meeting request for "${request.title.substring(0, 20)}..." has been declined by the admin.`, `/assignment/${request.id}`);
            if (request.writerId) {
                await createNotification(request.writerId, `Your Zoom meeting request for "${request.title.substring(0, 20)}..." has been declined by the admin.`, `/assignment/${request.id}`);
            }
            toast({ title: "Zoom Request Declined", description: "The users have been notified." });
            fetchAssignments();
        } catch (e) {
            console.error("Error declining zoom request:", e);
            toast({ variant: "destructive", title: "Error", description: "Could not decline the request." });
        } finally {
            setIsManagingZoom(false);
        }
    };

    const handleCancelZoomMeeting = async (request: Assignment) => {
        setIsManagingZoom(true);
        try {
            const assignmentRef = doc(db, "assignments", request.id);
            await updateDoc(assignmentRef, {
                "zoomMeeting.status": 'cancelled',
                "zoomMeeting.link": null,
                "zoomMeeting.scheduledAt": null,
                "zoomMeeting.durationMinutes": null,
            });

            await createNotification(request.seekerId, `The Zoom meeting for "${request.title.substring(0, 20)}..." has been cancelled by the admin.`, `/assignment/${request.id}`);
            if (request.writerId) {
                await createNotification(request.writerId, `The Zoom meeting for "${request.title.substring(0, 20)}..." has been cancelled by the admin.`, `/assignment/${request.id}`);
            }
            toast({ title: "Zoom Meeting Cancelled", description: "The users have been notified." });
            fetchAssignments(); // Refetch to update lists
        } catch (e) {
            console.error("Error cancelling zoom meeting:", e);
            toast({ variant: "destructive", title: "Error", description: "Could not cancel the meeting." });
        } finally {
            setIsManagingZoom(false);
        }
    };


    const getSortIndicator = (key: string, config: SortConfig) => {
        if (!config || config.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return config.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold flex items-center gap-4"><BookOpen className="h-10 w-10 text-primary" /> Assignment Management</h1>
            
             <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Video /> Zoom Requests ({zoomRequests.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Assignment</TableHead>
                                    <TableHead>By</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {zoomRequests.length > 0 ? zoomRequests.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium truncate max-w-24" title={req.title}>{req.title}</TableCell>
                                        <TableCell className="capitalize">{req.zoomMeeting?.requestedBy}</TableCell>
                                        <TableCell className="flex gap-1">
                                            <Button size="sm" onClick={() => setSelectedZoomRequest(req)} className="px-1.5 h-7 text-xs">Accept</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleRejectZoomRequest(req)} disabled={isManagingZoom} className="px-1.5 h-7 text-xs">Reject</Button>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={3} className="h-24 text-center">No pending requests.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Video /> Active Zoom Meetings ({approvedZoomMeetings.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Assignment</TableHead>
                            <TableHead>Scheduled For</TableHead>
                            <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {approvedZoomMeetings.length > 0 ? (
                            approvedZoomMeetings.map((req) => (
                                <TableRow key={req.id}>
                                <TableCell className="font-medium truncate max-w-sm" title={req.title}>{req.title}</TableCell>
                                <TableCell>
                                    {req.zoomMeeting?.scheduledAt ? format(req.zoomMeeting.scheduledAt.toDate(), 'PPp') : 'N/A'}
                                </TableCell>
                                <TableCell className="flex gap-2">
                                    <Button asChild size="sm" variant="outline">
                                    <a href={req.zoomMeeting?.link} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" /> Join
                                    </a>
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleCancelZoomMeeting(req)} disabled={isManagingZoom}>
                                    <Ban className="mr-2 h-4 w-4" /> Cancel
                                    </Button>
                                </TableCell>
                                </TableRow>
                            ))
                            ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">No active meetings.</TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </div>
                    </CardContent>
                </Card>
            </div>


            <Card>
                <CardHeader>
                    <CardTitle>All Assignments</CardTitle>
                    <CardDescription>View, manage, and monitor all assignments on the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Desktop Table */}
                    <div className="rounded-md border hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('title')}>Title{getSortIndicator('title', sortConfig)}</Button></TableHead>
                                    <TableHead>Seeker/Writer</TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('status')}>Status{getSortIndicator('status', sortConfig)}</Button></TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedAssignments.map((a) => (
                                <TableRow key={a.id}>
                                    <TableCell className="font-medium max-w-xs truncate">{a.title}</TableCell>
                                    <TableCell className="text-xs">
                                        <p><strong>Seeker:</strong> {a.seekerName}</p>
                                        <p><strong>Writer:</strong> {a.writerName || 'Not claimed'}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={a.status} onValueChange={(value) => handleStatusChange(a.id, value as AssignmentStatus)}>
                                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="bidding">Bidding</SelectItem>
                                                <SelectItem value="claimed">Claimed</SelectItem>
                                                <SelectItem value="in-progress">In Progress</SelectItem>
                                                <SelectItem value="submitted">Submitted</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                                <SelectItem value="pending-writer-acceptance">Pending Acceptance</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                    {a.feeAgreed ? (
                                        <Button variant={a.paymentConfirmed ? "default" : "secondary"} size="sm">
                                            {a.paymentConfirmed ? `Paid LKR ${a.fee?.toFixed(2)}` : `Pending LKR ${a.fee?.toFixed(2)}`}
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Fee not agreed</span>
                                    )}
                                    </TableCell>
                                    <TableCell className="flex items-center gap-1">
                                    <Button asChild variant="outline" size="sm"><Link href={`/assignment/${a.id}`}>View</Link></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(a.id, a.title)}>
                                        <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Mobile Cards */}
                    <div className="grid gap-4 md:hidden">
                        {sortedAssignments.map((a) => (
                            <Card key={a.id}>
                                <CardHeader>
                                    <CardTitle className="truncate">{a.title}</CardTitle>
                                    <CardDescription>Seeker: {a.seekerName} | Writer: {a.writerName || 'N/A'}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Status</span>
                                        <Select value={a.status} onValueChange={(value) => handleStatusChange(a.id, value as AssignmentStatus)}>
                                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="bidding">Bidding</SelectItem>
                                                <SelectItem value="claimed">Claimed</SelectItem>
                                                <SelectItem value="in-progress">In Progress</SelectItem>
                                                <SelectItem value="submitted">Submitted</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                                <SelectItem value="pending-writer-acceptance">Pending Acceptance</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">Payment</span>
                                        {a.feeAgreed ? (
                                            <Button variant={a.paymentConfirmed ? "default" : "secondary"} size="sm">
                                                {a.paymentConfirmed ? `Paid LKR ${a.fee?.toFixed(2)}` : `Pending LKR ${a.fee?.toFixed(2)}`}
                                            </Button>
                                        ) : (<span className="text-xs text-muted-foreground">Fee not agreed</span>)}
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                    <Button asChild variant="outline" size="sm"><Link href={`/assignment/${a.id}`}>View</Link></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(a.id, a.title)}>
                                        <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the assignment "{deleteTarget?.name}" and all associated data, including the chat history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <Dialog open={!!selectedZoomRequest} onOpenChange={(isOpen) => !isOpen && setSelectedZoomRequest(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Approve & Schedule Zoom Meeting</DialogTitle>
                        <DialogDescription>
                            Review the request, provide the meeting link, and set a start time.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {selectedZoomRequest?.zoomMeeting?.requesterMessage && (
                            <div className="space-y-2">
                                <Label>User's Availability</Label>
                                <p className="text-sm p-3 bg-secondary rounded-md border">{selectedZoomRequest.zoomMeeting.requesterMessage}</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="zoom-link">Zoom Link</Label>
                            <Input
                                id="zoom-link"
                                value={zoomLink}
                                onChange={(e) => setZoomLink(e.target.value)}
                                placeholder="https://zoom.us/j/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="admin-zoom-message">Message (e.g., Confirmed Time)</Label>
                            <Textarea
                                id="admin-zoom-message"
                                value={adminZoomMessage}
                                onChange={(e) => setAdminZoomMessage(e.target.value)}
                                placeholder="Your meeting is confirmed for 4 PM tomorrow."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Scheduled Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}
                                        >
                                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                                            {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={scheduledDate}
                                            onSelect={setScheduledDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Scheduled Time</Label>
                                <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Duration (in minutes)</Label>
                            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g., 60"/>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedZoomRequest(null)}>Cancel</Button>
                        <Button onClick={handleAcceptZoomRequest} disabled={isManagingZoom || !zoomLink}>
                            {isManagingZoom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Approve & Send Link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
