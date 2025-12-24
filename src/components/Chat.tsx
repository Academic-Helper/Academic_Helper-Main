
"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, runTransaction, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';
import type { Message, UserData, Assignment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { censorContactInfo } from '@/lib/utils';
import { createAdminNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { sendThrottledNotificationEmail } from '@/lib/email-actions';


const TypingIndicator = () => (
    <div className="flex items-center space-x-1 p-2">
        <span className="text-sm text-muted-foreground">Typing</span>
        <div className="flex items-center space-x-1">
            <span className="h-1.5 w-1.5 bg-green-700 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="h-1.5 w-1.5 bg-green-700 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="h-1.5 w-1.5 bg-green-700 rounded-full animate-bounce"></span>
        </div>
    </div>
);

const ChatStatusIndicator = ({ user, otherUser }: { user: UserData | null; otherUser: UserData | null }) => {
  if (!user || !otherUser) return null;

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const isOnline = otherUser.isOnline && otherUser.lastSeen && otherUser.lastSeen.toDate() > twoMinutesAgo;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
      <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-green-500" : "bg-gray-400")}></span>
      <span>
        {isOnline
          ? `${otherUser.name} is online`
          : `${otherUser.name} was last seen ${
              otherUser.lastSeen ? format(otherUser.lastSeen.toDate(), 'Pp') : 'a while ago'
            }`}
      </span>
    </div>
  );
};


interface ChatProps {
    assignmentId: string;
}

export default function Chat({ assignmentId }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const { user, userData } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [otherParticipant, setOtherParticipant] = useState<UserData | null>(null);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const updateTypingStatus = useCallback(async (isTyping: boolean) => {
        if (!user || !assignmentId) return;
        const assignmentRef = doc(db, 'assignments', assignmentId);
        try {
            await updateDoc(assignmentRef, {
                [`typingUsers.${user.uid}`]: isTyping
            });
        } catch (error) {
            console.error("Error updating typing status:", error);
        }
    }, [user, assignmentId]);

    useEffect(() => {
        if (!assignmentId || !user) return;
        
        setLoading(true);
        const assignmentRef = doc(db, "assignments", assignmentId);
        let unsubscribeOtherUser = () => {};
    
        const unsubscribeAssignment = onSnapshot(assignmentRef, async (docSnap) => {
            unsubscribeOtherUser(); // Unsubscribe from previous listener
            if (docSnap.exists()) {
                const data = docSnap.data() as Assignment;
                const typingUsers = data.typingUsers || {};
                
                const participantIds = [data.seekerId, data.writerId].filter(Boolean);
                const otherUserId = participantIds.find(id => id !== user.uid);
    
                if (otherUserId) {
                    // Fetch other user's data for online status
                    const userRef = doc(db, 'users', otherUserId);
                    unsubscribeOtherUser = onSnapshot(userRef, (userSnap) => {
                        if (userSnap.exists()) {
                            setOtherParticipant(userSnap.data() as UserData);
                        }
                    });
                    
                    // Check typing status
                    setOtherUserTyping(!!typingUsers[otherUserId]);
                } else {
                    setOtherParticipant(null);
                    setOtherUserTyping(false);
                }
            }
        });
    
        const messagesCollection = collection(db, "assignments", assignmentId, "messages");
        const q = query(messagesCollection, orderBy("createdAt", "asc"));
    
        const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
            const newMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
            setMessages(newMessages);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoading(false);
        });
    
        return () => {
            unsubscribeMessages();
            unsubscribeAssignment();
            unsubscribeOtherUser();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if(user) updateTypingStatus(false);
        };
    }, [assignmentId, user, updateTypingStatus]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        updateTypingStatus(true);
        typingTimeoutRef.current = setTimeout(() => {
            updateTypingStatus(false);
        }, 3000);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !userData || !user || !assignmentId) return;
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        updateTypingStatus(false);

        const { censoredText, isCensored } = censorContactInfo(newMessage);
        
        if (isCensored) {
            try {
                const userRef = doc(db, "users", user.uid);
                await runTransaction(db, async (transaction) => {
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists()) {
                        throw "User not found";
                    }
                    const currentWarnings = userDoc.data().contactWarningCount || 0;
                    const newWarnings = currentWarnings + 1;
                    
                    if (newWarnings >= 5) {
                        transaction.update(userRef, { 
                            contactWarningCount: newWarnings,
                            status: 'banned' 
                        });
                        
                        toast({
                            variant: "destructive",
                            title: "Account Banned",
                            description: "You have received 5 warnings for sharing contact information. Your account has been banned. Please contact support.",
                        });
                        
                        await createAdminNotification(`${userData.name} has been banned for sharing contact info.`, `/admin/support/${user.uid}`);
                        
                        setTimeout(() => signOut(auth), 3000);
                        
                    } else {
                        transaction.update(userRef, { contactWarningCount: newWarnings });
                        toast({
                            variant: "destructive",
                            title: "Contact Info Detected",
                            description: `Sharing contact information is not allowed. This is warning ${newWarnings} of 5.`,
                        });
                    }
                });
            } catch (error) {
                console.error("Error updating warning count:", error);
                 toast({
                    variant: "destructive",
                    title: "Error",
                    description: "There was an issue processing your message.",
                });
            }
        }

        const messagesCollection = collection(db, "assignments", assignmentId, "messages");
        try {
            await addDoc(messagesCollection, {
                text: censoredText,
                senderId: userData.uid,
                senderName: userData.name,
                createdAt: serverTimestamp(),
            });

             // Send offline notification if needed
            if (otherParticipant?.uid && userData.name) {
                await sendThrottledNotificationEmail(
                    otherParticipant.uid,
                    userData.name,
                    'assignment',
                    assignmentId
                );
            }


            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isAdmin = userData?.role === 'admin';
    const isChatDisabled = !userData;

    return (
        <div className="flex flex-col h-[28rem] sm:h-[32rem]">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg flex items-center">
                    <MessageSquare className="mr-2 h-5 w-5"/> Live Chat
                </h3>
                 <ChatStatusIndicator user={userData} otherUser={otherParticipant} />
            </div>
            <div className="flex-grow overflow-y-auto p-4 bg-secondary/50 rounded-md space-y-4">
                {messages.length === 0 && !loading ? (
                    <div className="text-center text-muted-foreground p-8">No messages yet. Start the conversation!</div>
                ) : (
                    messages.map(message => (
                        <div key={message.id} className={`flex flex-col ${message.senderId === userData?.uid ? 'items-end' : 'items-start'}`}>
                            <div className={`rounded-lg px-4 py-2 max-w-xs ${message.senderId === userData?.uid ? (isAdmin ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground') : 'bg-card'}`}>
                                <p className="text-xs font-bold pb-1">{message.senderName}{message.senderId === userData?.uid && isAdmin && ' (Admin)'}</p>
                                <p className="whitespace-pre-wrap">{message.text}</p>
                            </div>
                            <span className="text-xs text-muted-foreground px-1 pt-1">
                                {message.createdAt ? format(message.createdAt.toDate(), 'p') : 'sending...'}
                            </span>
                        </div>
                    ))
                )}
                 <div ref={messagesEndRef} />
            </div>
            <div className="h-8 flex items-center">
                {otherUserTyping && <TypingIndicator />}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    disabled={isChatDisabled}
                />
                <Button type="submit" size="icon" disabled={!newMessage.trim() || isChatDisabled}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
