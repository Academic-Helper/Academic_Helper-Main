
"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, getDocs, runTransaction, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';
import type { SupportMessage, SupportConversation, UserData } from '@/types';
import { createAdminNotification, createNotification } from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';
import { censorContactInfo, cn } from '@/lib/utils';
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

const ChatStatusIndicator = ({ otherUser }: { otherUser: UserData | { name: string; isOnline: boolean; lastSeen: any } | null }) => {
    if (!otherUser) return null;
  
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


interface SupportChatProps {
    userId: string;
    userRole: 'user' | 'admin';
}

export default function SupportChat({ userId, userRole }: SupportChatProps) {
    const [messages, setMessages] = useState<SupportMessage[]>([]);
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
        if (!userId) return;
        const chatDocRef = doc(db, 'supportChats', userId);
        const typingUser = userRole === 'admin' ? 'admin' : 'user';
        try {
            await updateDoc(chatDocRef, {
                [`typingUsers.${typingUser}`]: isTyping
            });
        } catch (error) {
            if ((error as any).code === 'not-found') {
                await setDoc(chatDocRef, { 
                    typingUsers: { [typingUser]: isTyping } 
                }, { merge: true });
            } else {
                console.error("Error updating typing status:", error);
            }
        }
    }, [userId, userRole]);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
    
        const chatDocRef = doc(db, "supportChats", userId);
        const unsubscribeChat = onSnapshot(chatDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as SupportConversation;
                const typingUsers = data.typingUsers || {};
    
                if (userRole === 'admin') {
                    // Admin is viewing, the other user is the one the chat belongs to
                    const userRef = doc(db, 'users', userId);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setOtherParticipant(userSnap.data() as UserData);
                    }
                    setOtherUserTyping(!!typingUsers['user']);
                } else {
                    // User is viewing, the other "user" is the admin
                    // We can't get a specific admin's status, so we create a placeholder
                    setOtherParticipant({ name: "Admin", isOnline: true, lastSeen: serverTimestamp() } as any);
                    setOtherUserTyping(!!typingUsers['admin']);
                }
            }
        });
    
        const messagesCollection = collection(db, "supportChats", userId, "messages");
        const q = query(messagesCollection, orderBy("createdAt", "asc"));
    
        const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
            const newMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportMessage));
            setMessages(newMessages);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching messages:", error);
            setLoading(false);
        });
    
        return () => {
            unsubscribeMessages();
            unsubscribeChat();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            updateTypingStatus(false);
        };
    }, [userId, userRole, updateTypingStatus]);
    
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
        if (newMessage.trim() === '' || !userData || !userId) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        updateTypingStatus(false);

        const { censoredText, isCensored } = censorContactInfo(newMessage);
        
        if (isCensored && userRole === 'user' && user) {
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

        const messagesCollection = collection(db, "supportChats", userId, "messages");
        
        const querySnapshot = await getDocs(query(messagesCollection));
        const isFirstUserMessage = querySnapshot.empty && userRole === 'user';

        const senderId = userRole === 'admin' ? 'admin' : userData.uid;
        const senderName = userRole === 'admin' ? 'Admin Support' : userData.name;

        const chatDocRef = doc(db, "supportChats", userId);
        
        try {
            if (isFirstUserMessage) {
                const welcomeMessage = "Please wait until a support agent connects with you. We'll be with you shortly.";
                await addDoc(messagesCollection, {
                    text: welcomeMessage,
                    senderId: 'admin',
                    senderName: 'Admin Support',
                    createdAt: serverTimestamp(),
                });
            }
            
            await addDoc(messagesCollection, {
                text: censoredText,
                senderId: senderId,
                senderName: senderName,
                createdAt: serverTimestamp(),
            });
            
            const updateData: any = {
                lastMessage: censoredText,
                lastMessageTimestamp: serverTimestamp(),
            };

            if (userRole === 'user') {
                updateData.userName = userData.name;
                updateData.userEmail = userData.email;
                updateData.isReadByAdmin = false;
                await createAdminNotification(`New support message from ${userData.name}`, `/admin/support/${userId}`);
            } else if (userRole === 'admin' && otherParticipant) {
                updateData.isReadByAdmin = true;
                await createNotification(userId, 'You have a new message from Admin Support.', '/support');
                await sendThrottledNotificationEmail(otherParticipant.uid, "Admin Support", 'support', userId);
            }

            await setDoc(chatDocRef, updateData, { merge: true });

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    const isChatDisabled = !userData;

    return (
        <div className="flex flex-col h-[28rem] sm:h-[32rem]">
            {userRole === 'admin' && <ChatStatusIndicator otherUser={otherParticipant} />}
            <div className="flex-grow overflow-y-auto p-4 bg-secondary/50 rounded-md space-y-4">
                {messages.length === 0 && !loading ? (
                    <div className="text-center text-muted-foreground p-8">No messages yet. Ask us anything!</div>
                ) : (
                    messages.map(message => (
                        <div key={message.id} className={`flex flex-col ${
                            (userRole === 'user' && message.senderId !== 'admin') || (userRole === 'admin' && message.senderId === 'admin') 
                            ? 'items-end' : 'items-start'
                        }`}>
                            <div className={`rounded-lg px-4 py-2 max-w-xs ${
                                (userRole === 'user' && message.senderId !== 'admin') || (userRole === 'admin' && message.senderId === 'admin')
                                ? 'bg-primary text-primary-foreground' : 'bg-card'
                            }`}>
                                <p className="text-xs font-bold pb-1">{message.senderName}</p>
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
