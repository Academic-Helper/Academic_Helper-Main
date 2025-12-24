
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ShieldCheck, MessageSquare, LogOut, User, Pencil, LayoutDashboard, LifeBuoy, Users, Search, HelpCircle, Gift, Trophy, FolderKanban, BookOpen, Banknote } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "./ui/skeleton";

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading, handleSignOut: AuthContextSignOut } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleLogout = async () => {
    await AuthContextSignOut();
    if (isMobile) {
      setOpenMobile(false);
    }
    router.push("/");
  };

  const isActive = (path: string) => {
    if (path === "/admin") return pathname === path;
    return pathname.startsWith(path);
  }

  if (!user) {
    return null; // Don't render the sidebar if the user is not logged in
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href={user ? "/dashboard" : "/"} className="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">
          Academic Helper
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {loading ? (
           <div className="p-2 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
           </div>
        ) : userData ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                  <Link href="/dashboard" onClick={handleLinkClick}><LayoutDashboard /><span>Dashboard</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/profile")} tooltip="Profile">
                  <Link href="/profile" onClick={handleLinkClick}><User /><span>Profile</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {userData.role === 'seeker' && (
                <>
                   <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/projects")} tooltip="Projects">
                      <Link href="/projects" onClick={handleLinkClick}><FolderKanban /><span>Projects</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/find-helper")} tooltip="Find an assignment writer">
                      <Link href="/find-helper" onClick={handleLinkClick}><Search /><span>Find an assignment writer</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/post-assignment")} tooltip="Quick post an assignment">
                      <Link href="/post-assignment" onClick={handleLinkClick}><Pencil /><span>Quick post an assignment</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              
              {userData.role === 'writer' && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/projects")} tooltip="Projects">
                      <Link href="/projects" onClick={handleLinkClick}><FolderKanban /><span>Projects</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/promotions")} tooltip="Promotions">
                      <Link href="/promotions" onClick={handleLinkClick}><Gift /><span>Promotions</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {['seeker', 'writer'].includes(userData.role) && (
                 <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/support")} tooltip="Live Support">
                    <Link href="/support" onClick={handleLinkClick}><LifeBuoy /><span>Live Support</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              
              {userData.role === 'admin' && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === "/admin"} tooltip="Admin Panel">
                      <Link href="/admin" onClick={handleLinkClick}><ShieldCheck /><span>Admin</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                   <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/assignments")} tooltip="Assignments">
                      <Link href="/admin/assignments" onClick={handleLinkClick}><BookOpen /><span>Assignments</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/finances")} tooltip="Finances">
                      <Link href="/admin/finances" onClick={handleLinkClick}><Banknote /><span>Finances</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/promotions")} tooltip="Promotions">
                      <Link href="/admin/promotions" onClick={handleLinkClick}><Gift /><span>Promotions</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/leaderboard")} tooltip="Leaderboard">
                      <Link href="/admin/leaderboard" onClick={handleLinkClick}><Trophy /><span>Leaderboard</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/support")} tooltip="Support Inbox">
                      <Link href="/admin/support" onClick={handleLinkClick}><MessageSquare /><span>Support Inbox</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive("/admin/feedback")} tooltip="Feedback">
                      <Link href="/admin/feedback" onClick={handleLinkClick}><HelpCircle /><span>Feedback</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
        ) : null }
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
