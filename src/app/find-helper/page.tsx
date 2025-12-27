
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserData } from "@/types";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayRating } from "@/components/DisplayRating";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";


function FindHelperComponent() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reassignId = searchParams.get('reassignId');
  const [writers, setWriters] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [nameFilter, setNameFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState([0]);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'seeker')) {
      router.push("/dashboard");
    } else if (!authLoading) {
      const fetchWriters = async () => {
        setLoading(true);
        const writersQuery = query(collection(db, "users"), where("role", "==", "writer"), where("status", "==", "active"));
        const querySnapshot = await getDocs(writersQuery);
        const writersData = querySnapshot.docs.map(doc => doc.data() as UserData);
        setWriters(writersData);
        setLoading(false);
      };
      fetchWriters();
    }
  }, [user?.uid, authLoading, router]);
  
  const filteredWriters = useMemo(() => {
    return writers.filter(writer => {
      const nameMatch = writer.name.toLowerCase().includes(nameFilter.toLowerCase());
      const levelMatch = levelFilter === 'all' || writer.educationLevel === levelFilter;
      const effectiveRating = (writer.ratingCount === 0 || writer.ratingCount === undefined) ? 4.5 : (writer.averageRating || 0);
      const ratingMatch = effectiveRating >= ratingFilter[0];
      return nameMatch && levelMatch && ratingMatch;
    });
  }, [writers, nameFilter, levelFilter, ratingFilter]);

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Find a Helper</h1>
        <p className="text-muted-foreground max-w-lg">Browse our talented academic writers. Filter by name, education level, or rating to find the perfect match for your assignment.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" /> Filter Writers</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Input 
            placeholder="Search by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by education level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="O/L">O/L</SelectItem>
              <SelectItem value="A/L">A/L</SelectItem>
              <SelectItem value="University">University</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-2">
            <label className="text-sm font-medium">Minimum Rating: {ratingFilter[0]}</label>
            <Slider
              min={0}
              max={5}
              step={0.5}
              value={ratingFilter}
              onValueChange={setRatingFilter}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredWriters.length > 0 ? (
          filteredWriters.map(writer => {
            const requestUrl = `/post-assignment?writerId=${writer.uid}&writerName=${encodeURIComponent(writer.name)}${reassignId ? `&reassignId=${reassignId}` : ''}`;
            const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
            const isOnline = writer.isOnline && writer.lastSeen && writer.lastSeen.toDate() > twoMinutesAgo;
            
            return(
            <Card key={writer.uid}>
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                 <Avatar className="h-20 w-20 border-2 border-primary">
                    <AvatarImage src={writer.photoURL} alt={writer.name} />
                    <AvatarFallback>{writer.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <h3 className="text-xl font-semibold">{writer.name}</h3>
                    <p className="text-sm text-muted-foreground">{writer.educationLevel}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn("h-2.5 w-2.5 rounded-full", isOnline ? "bg-green-500" : "bg-gray-400")}></span>
                  <span>
                    {isOnline 
                      ? 'Online' 
                      : `Last seen ${writer.lastSeen ? format(writer.lastSeen.toDate(), 'Pp') : 'a while ago'}`
                    }
                  </span>
                </div>

                <DisplayRating rating={writer.averageRating} ratingCount={writer.ratingCount} />
                 {writer.interestedAreas && (
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    <h4 className="w-full text-sm font-semibold text-muted-foreground">Interested Areas:</h4>
                    {writer.interestedAreas.split(',').map(area => area.trim()).filter(Boolean).map((area, index) => (
                      <Badge key={index} variant="secondary">{area}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 w-full mt-2">
                  <Button asChild className="flex-1">
                    <Link href={requestUrl}>Request</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href={`/writer/${writer.uid}`}>Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )})
        ) : (
          <p className="text-muted-foreground col-span-full text-center py-8">No writers match your criteria.</p>
        )}
      </div>

    </div>
  );
}

export default function FindHelperPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <FindHelperComponent />
        </Suspense>
    )
}
