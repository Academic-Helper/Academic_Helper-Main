
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { User, UserPlus, Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markAllNotificationsAsRead } from "@/lib/notifications";
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const Header = () => {
  const { user, userData, loading, notifications } = useAuth();
  const router = useRouter();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleOpenChange = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open && unreadCount > 0 && user) {
      markAllNotificationsAsRead(user.uid);
    }
  };
  
  const handleNotificationClick = (link: string) => {
    setIsPopoverOpen(false);
    router.push(link);
  };

  return (
    <header className="bg-card shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {user && (
            <SidebarTrigger />
          )}
          <Link href={user ? "/dashboard" : "/"} className="text-xl font-bold text-primary sm:hidden">
            AH
          </Link>
          <Link href={user ? "/dashboard" : "/"} className="text-xl font-bold text-primary hidden sm:inline">
            Academic Helper
          </Link>
        </div>
        <nav className="flex items-center gap-2 md:gap-4">
          {loading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
          ) : user ? (
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground hidden md:inline">
                    Welcome, {userData?.name}
                </span>
                <Popover open={isPopoverOpen} onOpenChange={handleOpenChange}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                          You have {unreadCount} unread message{unreadCount === 1 ? '' : 's'}.
                        </p>
                      </div>
                      <div className="grid gap-2 max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                           notifications.map((notification) => (
                            <div key={notification.id} className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0 cursor-pointer hover:bg-accent -mx-2 px-2 py-2 rounded-md" onClick={() => handleNotificationClick(notification.link)}>
                                <span className={`flex h-2 w-2 translate-y-1 rounded-full ${!notification.isRead ? 'bg-primary' : 'bg-muted'}`} />
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium leading-none">{notification.message}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : ''}
                                    </p>
                                </div>
                            </div>
                           ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No notifications yet.</p>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <ThemeToggle />
                 <Link href="/profile">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={userData?.photoURL} alt={userData?.name || ""} />
                        <AvatarFallback>{userData?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                 </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">
                  <User className="mr-2 h-4 w-4" />
                  Log In
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign Up
                </Link>
              </Button>
              <ThemeToggle />
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
