
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CircleCheckBig, MessageSquare, ShieldCheck, Star, User, PenSquare, PieChartIcon, Users, MessageCircle, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Wrench } from "lucide-react";
import { useOnScreen } from "@/hooks/useOnScreen";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayRating } from "@/components/DisplayRating";
import { PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { type ChartConfig } from "@/components/ui/chart";
import NetworkBackground from "@/components/NetworkBackground";

const AnimatedSection = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const [ref, isIntersecting] = useOnScreen({ threshold: 0.1, triggerOnce: true });
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isIntersecting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className
      )}
    >
      {children}
    </div>
  );
};

const topWriters = [
  { name: "Anusha Perera", rating: 4.9, completed: 124, avatar: "/avatars/01.png" },
  { name: "Kavindu Silva", rating: 4.8, completed: 98, avatar: "/avatars/02.png" },
  { name: "Fathima Rizwan", rating: 4.9, completed: 85, avatar: "/avatars/03.png" },
  { name: "Dinesh Kumar", rating: 4.7, completed: 76, avatar: "/avatars/04.png" },
];

const recentReviews = [
    { review: "Fantastic writer who understood my needs perfectly. The chat feature was a lifesaver!", author: "Praveen, University Student", rating: 5 },
    { review: "As a freelance writer, this platform is a game-changer. I found a consistent stream of work.", author: "Anusha, Freelance Writer", rating: 5 },
    { review: "Quick turnaround and high-quality work. The secure payment system gave me peace of mind.", author: "Samitha, A/L Student", rating: 5 },
];

const chartData = [
  { level: "University", value: 187, fill: "var(--color-university)" },
  { level: "A/L", value: 125, fill: "var(--color-al)" },
  { level: "O/L", value: 92, fill: "var(--color-ol)" },
];

const chartConfig = {
  value: { label: "Writers" },
  university: { label: "University", color: "hsl(var(--chart-1))" },
  al: { label: "A/L", color: "hsl(var(--chart-2))" },
  ol: { label: "O/L", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;


const PieChartCard = () => {
  const [ref, isIntersecting] = useOnScreen({ threshold: 0.5, triggerOnce: true });

  return (
      <Card ref={ref}>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChartIcon /> Writer Expertise</CardTitle>
              <CardDescription>Distribution of writers by education level.</CardDescription>
          </CardHeader>
          <CardContent>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                  {isIntersecting ? (
                      <PieChart>
                          <ChartTooltip content={<ChartTooltipContent nameKey="level" hideLabel />} />
                          <Pie data={chartData} dataKey="value" nameKey="level" innerRadius={60} strokeWidth={5}>
                              {chartData.map((entry) => (
                                  <Cell key={entry.level} fill={entry.fill} />
                              ))}
                          </Pie>
                      </PieChart>
                  ) : (
                      <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground">Loading chart...</div>
                  )}
              </ChartContainer>
          </CardContent>
      </Card>
  );
};


export default function Home() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const titleText = "Academic Helper";

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      const maintenanceRef = doc(db, "public_settings", "maintenance");
      const maintenanceSnap = await getDoc(maintenanceRef);
      if (maintenanceSnap.exists()) {
        setIsMaintenanceMode(maintenanceSnap.data().isActive);
      }
    };
    fetchMaintenanceStatus();
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center text-center space-y-16 sm:space-y-20 md:space-y-24 max-w-4xl mx-auto">
      {isMaintenanceMode && (
        <Alert variant="destructive" className="w-full text-center">
          <Wrench className="h-4 w-4" />
          <AlertTitle>Under Maintenance</AlertTitle>
          <AlertDescription>
            The site is currently undergoing maintenance. Access is limited.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Hero Section */}
      <section className="w-full py-12 md:py-16">
        <div className="flex flex-col items-center justify-center space-y-6 text-center">
           <div className="space-y-4">
             <div className="mb-6 flex justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="150"
                  height="150"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-draw text-primary animate-float"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
              </div>
             <h2 className="text-base font-medium tracking-widest text-muted-foreground uppercase sm:text-xl md:text-2xl animate-fade-in-up">
              Live Interactive Academic Helping Platform
            </h2>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground drop-shadow-lg">
              {titleText.split("").map((char, index) => (
                <span
                  key={index}
                  className="animate-pop-in inline-block"
                  style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </h1>
            <p className="max-w-[700px] text-muted-foreground text-base sm:text-lg md:text-xl mx-auto drop-shadow-md animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Your bridge between academic needs and experts. Find qualified writers for your assignments or connect with skilled teachers.
            </p>
          </div>
          <div className="w-full pt-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <h2 className="text-xl font-medium text-foreground mb-6">Start your journey as a...</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-3">
                  <Link href="/signup?role=seeker">
                      <Card className="group hover:border-primary hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                          <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
                              <User className="h-12 w-12 text-primary group-hover:scale-110 transition-transform" />
                              <span className="text-lg font-semibold text-foreground">Student</span>
                          </CardContent>
                      </Card>
                  </Link>
                  <p className="text-sm text-muted-foreground px-4">Find a writer for your assignments or a teacher for your studies.</p>
              </div>
              <div className="space-y-3">
                  <Link href="/signup?role=writer">
                      <Card className="group hover:border-primary hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                          <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
                              <PenSquare className="h-12 w-12 text-primary group-hover:scale-110 transition-transform" />
                              <span className="text-lg font-semibold text-foreground">Writer</span>
                          </CardContent>
                      </Card>
                  </Link>
                  <p className="text-sm text-muted-foreground px-4">Offer your academic writing skills and earn by helping students.</p>
              </div>
              <div className="space-y-3">
                  <Link href="/signup?role=teacher">
                      <Card className="group hover:border-primary hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                          <CardContent className="p-6 flex flex-col items-center justify-center gap-4">
                              <GraduationCap className="h-12 w-12 text-primary group-hover:scale-110 transition-transform" />
                              <span className="text-lg font-semibold text-foreground">Teacher</span>
                          </CardContent>
                      </Card>
                  </Link>
                  <p className="text-sm text-muted-foreground px-4">Share your knowledge, connect with students, and grow your tutoring career.</p>
              </div>
            </div>
             <p className="mt-6 text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="underline hover:text-primary">Log in</Link>
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full">
        <AnimatedSection>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-12 text-foreground">How It Works</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="text-left transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <CardHeader className="flex flex-row items-center gap-4">
                <User className="w-10 h-10 text-primary" />
                <CardTitle>For Students</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4"><CircleCheckBig className="text-primary mt-1 h-5 w-5 flex-shrink-0" /><p><strong>Post or Search:</strong> Post assignment needs or browse for writers and teachers.</p></div>
                <div className="flex items-start gap-4"><CircleCheckBig className="text-primary mt-1 h-5 w-5 flex-shrink-0" /><p><strong>Connect Directly:</strong> Chat in real-time to discuss details and agree on terms.</p></div>
                <div className="flex items-start gap-4"><CircleCheckBig className="text-primary mt-1 h-5 w-5 flex-shrink-0" /><p><strong>Secure Payments:</strong> Pay securely through the platform. Funds are released upon your approval.</p></div>
              </CardContent>
            </Card>
            <Card className="text-left transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <CardHeader className="flex flex-row items-center gap-4">
                <PenSquare className="w-10 h-10 text-primary" />
                <CardTitle>For Writers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4"><CircleCheckBig className="text-primary mt-1 h-5 w-5 flex-shrink-0" /><p><strong>Find Opportunities:</strong> Browse assignments that match your expertise and education level.</p></div>
                <div className="flex items-start gap-4"><CircleCheckBig className="text-primary mt-1 h-5 w-5 flex-shrink-0" /><p><strong>Claim &amp; Work:</strong> "Catch" assignments on a first-come, first-serve basis or receive direct requests.</p></div>
                <div className="flex items-start gap-4"><CircleCheckBig className="text-primary mt-1 h-5 w-5 flex-shrink-0" /><p><strong>Get Paid:</strong> Receive timely payments upon successful completion of assignments.</p></div>
              </CardContent>
            </Card>
             <Card className="text-left transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
              <CardHeader className="flex flex-row items-center gap-4">
                <GraduationCap className="w-10 h-10 text-primary" />
                <CardTitle>For Teachers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4"><CircleCheckBig className="text-primary mt-1 h-5 w-5 flex-shrink-0" /><p><strong>Create Your Profile:</strong> Showcase your subjects, grades, and teaching locations.</p></div>
                <div className="flex items-start gap-4"><CircleCheckBig className="text-primary mt-1 h-5 w-5 flex-shrink-0" /><p><strong>Get Discovered:</strong> Students can find your profile and contact you directly via call or WhatsApp.</p></div>
                <div className="flex items-start gap-4"><CircleCheckBig className="text-primary mt-1 h-5 w-5 flex-shrink-0" /><p><strong>Manage Your Career:</strong> Upload banners, update your availability, and grow your student base.</p></div>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>
      </section>

       {/* Data Visualization Section */}
      <section className="w-full py-12 md:py-16">
        <AnimatedSection>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-16 text-center text-foreground">Our Thriving Community</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users /> Top Writers</CardTitle>
                        <CardDescription>Meet some of our highly-rated academic experts.</CardDescription>
                    </CardHeader>
                    <CardContent className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Writer</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead className="text-right">Completed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topWriters.map((writer) => (
                                    <TableRow key={writer.name}>
                                        <TableCell className="font-medium flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{writer.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            {writer.name}
                                        </TableCell>
                                        <TableCell><DisplayRating rating={writer.rating} /></TableCell>
                                        <TableCell className="text-right">{writer.completed}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <PieChartCard />
                 <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><MessageCircle /> Recent Reviews</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {recentReviews.map((review, index) => (
                            <div key={index} className="space-y-2">
                                <DisplayRating rating={review.rating} />
                                <p className="italic text-muted-foreground text-left">"{review.review}"</p>
                                <p className="font-semibold text-sm text-left">- {review.author}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </AnimatedSection>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-16">
        <AnimatedSection>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl mb-16 text-center text-foreground">Features for Success</h2>
          <div className="grid gap-12 md:grid-cols-3">
            <div className="flex flex-col items-center space-y-4"><MessageSquare className="h-14 w-14 text-primary animate-float-rotate-1" /><h3 className="text-xl font-bold">Real-time Chat</h3><p className="text-muted-foreground text-center">Communicate directly with seekers or writers to clarify requirements and track progress.</p></div>
            <div className="flex flex-col items-center space-y-4"><ShieldCheck className="h-14 w-14 text-primary animate-float-rotate-2" /><h3 className="text-xl font-bold">Secure Payments</h3><p className="text-muted-foreground text-center">Funds are held securely and released to writers only after you mark the assignment as complete.</p></div>
            <div className="flex flex-col items-center space-y-4"><Star className="h-14 w-14 text-primary animate-float-rotate-3" /><h3 className="text-xl font-bold">Rating System</h3><p className="text-muted-foreground text-center">Rate writers after project completion to help maintain a high-quality, trustworthy community.</p></div>
          </div>
        </AnimatedSection>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12">
        <AnimatedSection className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-foreground">Ready to Get Started?</h2>
          <p className="max-w-[600px] text-muted-foreground">Sign up today and take the first step towards academic success or a rewarding freelance career.</p>
          <div className="flex flex-col gap-3 min-[400px]:flex-row justify-center">
            <Button asChild size="lg"><Link href="/signup">Sign Up Now</Link></Button>
            <Button asChild variant="outline" size="lg"><Link href="/login">I Have an Account</Link></Button>
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}
