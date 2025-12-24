"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, orderBy, query, doc, deleteDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SupportConversation } from "@/types";
import { Loader2, MessageSquare, ChevronRight, Trash } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";


export default function AdminSupportPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [conversations, setConversations] = useState<SupportConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [chatToDelete, setChatToDelete] = useState<SupportConversation | null>(null);

    useEffect(() => {
        if (!authLoading && userData?.role !== 'admin') {
            router.push("/dashboard");
        } else if (!authLoading && userData?.role === 'admin') {
            setLoading(true);
            const q = query(collection(db, "supportChats"), orderBy("lastMessageTimestamp", "desc"));
            
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const convos = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as SupportConversation));
                setConversations(convos);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching support conversations:", error);
                setLoading(false);
            });

            return () => unsubscribe();
        }
    }, [userData, authLoading, router]);

    const handleDeleteRequest = (e: React.MouseEvent, convo: SupportConversation) => {
        e.preventDefault();
        e.stopPropagation();
        setChatToDelete(convo);
        setIsDeleteDialogOpen(true);
    }

    const handleDeleteConfirm = async () => {
        if (!chatToDelete) return;
        
        try {
            const chatRef = doc(db, "supportChats", chatToDelete.id);
            const messagesRef = collection(chatRef, "messages");
            const messagesSnap = await getDocs(messagesRef);
            
            const batch = writeBatch(db);
            messagesSnap.forEach(doc => {
                batch.delete(doc.ref);
            });
            batch.delete(chatRef);
            
            await batch.commit();

            toast({ title: "Success", description: "Chat history has been deleted." });
            setConversations(prev => prev.filter(c => c.id !== chatToDelete.id));

        } catch (error) {
            console.error("Error deleting chat:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete the chat." });
        } finally {
            setIsDeleteDialogOpen(false);
            setChatToDelete(null);
        }
    };


    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <MessageSquare /> Support Inbox
                    </CardTitle>
                    <CardDescription>
                        Manage live chat conversations with users. Unread messages are highlighted.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {conversations.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No support requests yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {conversations.map(convo => (
                                <Link href={`/admin/support/${convo.id}`} key={convo.id}>
                                    <div className={cn(
                                        "flex items-center justify-between p-4 rounded-lg border hover:bg-secondary transition-colors",
                                        !convo.isReadByAdmin && "bg-primary/10 border-primary/40"
                                    )}>
                                        <div>
                                            <p className={cn(
                                                "font-semibold",
                                                !convo.isReadByAdmin && "text-primary"
                                            )}>{convo.userName}</p>
                                            <p className="text-sm text-muted-foreground truncate max-w-md">{convo.lastMessage}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {convo.lastMessageTimestamp ? formatDistanceToNow(convo.lastMessageTimestamp.toDate(), { addSuffix: true }) : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={(e) => handleDeleteRequest(e, convo)}>
                                                <Trash className="h-4 w-4 text-destructive" />
                                            </Button>
                                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this chat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the conversation with <strong>{chatToDelete?.userName}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
