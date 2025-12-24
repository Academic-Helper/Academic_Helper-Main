
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Gift, ClipboardCopy, Users, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PromotionStatus {
  winnerCount: number;
  endDate: { seconds: number; nanoseconds: number; };
  maxWinners: number;
  referralsNeeded: number;
}

const Countdown = ({ endDate }: { endDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft(); // Initial calculation

    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <div className="flex justify-center gap-4 text-center">
      <div>
        <div className="text-2xl font-bold">{timeLeft.days}</div>
        <div className="text-xs text-muted-foreground">Days</div>
      </div>
      <div>
        <div className="text-2xl font-bold">{timeLeft.hours}</div>
        <div className="text-xs text-muted-foreground">Hours</div>
      </div>
      <div>
        <div className="text-2xl font-bold">{timeLeft.minutes}</div>
        <div className="text-xs text-muted-foreground">Minutes</div>
      </div>
      <div>
        <div className="text-2xl font-bold">{timeLeft.seconds}</div>
        <div className="text-xs text-muted-foreground">Seconds</div>
      </div>
    </div>
  );
};

export default function PromotionsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [promoStatus, setPromoStatus] = useState<PromotionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotionEnded, setPromotionEnded] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || userData?.role !== 'writer') {
        router.push('/dashboard');
      } else {
        const fetchPromoStatus = async () => {
          setLoading(true);
          try {
            const promoRef = doc(db, 'promotions', 'referralProgram');
            const promoSnap = await getDoc(promoRef);
            if (promoSnap.exists()) {
              const data = promoSnap.data() as PromotionStatus;
              setPromoStatus(data);
              if (new Date() > new Date(data.endDate.seconds * 1000)) {
                setPromotionEnded(true);
              }
            }
          } catch (error) {
            console.error("Error fetching promotion status:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load promotion details.' });
          } finally {
            setLoading(false);
          }
        };
        fetchPromoStatus();
      }
    }
  }, [user, userData, authLoading, router, toast]);
  
  const copyToClipboard = () => {
    if (userData?.ahUserId) {
        navigator.clipboard.writeText(userData.ahUserId);
        toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  if (!promoStatus) {
    return <div className="text-center py-20">The referral program is not active at the moment. Check back later!</div>
  }
  
  const referralCount = userData?.referralCount || 0;
  const progress = (referralCount / promoStatus.referralsNeeded) * 100;
  const endDate = new Date(promoStatus.endDate.seconds * 1000);
  const isWinner = userData?.hasZeroServiceCharge;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <Gift className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-3xl font-bold">Writer Referral Program</h1>
        <p className="text-muted-foreground">
          Invite new writers to join and earn a lifetime 0% service charge!
        </p>
      </div>

      {isWinner && (
         <Card className="bg-green-100 dark:bg-green-900/30 border-green-500">
          <CardHeader className="text-center">
            <Trophy className="mx-auto h-12 w-12 text-yellow-500" />
            <CardTitle>Congratulations!</CardTitle>
            <CardDescription className="text-green-800 dark:text-green-300">
              You are one of the winners! You now have a 0% service charge on all future earnings.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {promotionEnded && !isWinner && (
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader className="text-center">
            <CardTitle>Promotion Ended</CardTitle>
            <CardDescription className="text-destructive-foreground/80">
              This referral promotion has ended. Thank you for participating!
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      {!promotionEnded && !isWinner && (
        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
            <CardDescription>You have successfully referred {referralCount} out of {promoStatus.referralsNeeded} writers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center mt-2">{referralCount} / {promoStatus.referralsNeeded} Referrals</p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Code</CardTitle>
            <CardDescription>Share this code with new writers. They must enter it during signup for you to get credit.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Input value={userData?.ahUserId || '...'} readOnly className="font-mono text-lg" />
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <ClipboardCopy className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Promotion Status</CardTitle>
            <CardDescription>First {promoStatus.maxWinners} writers to complete the goal win!</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center gap-4">
             <div className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-bold">{promoStatus.winnerCount} / {promoStatus.maxWinners}</span>
                <span className="text-muted-foreground">Winners</span>
            </div>
          </CardContent>
        </Card>
      </div>

       {!promotionEnded && (
        <Card>
            <CardHeader>
              <CardTitle>Time Remaining</CardTitle>
            </CardHeader>
            <CardContent>
                <Countdown endDate={endDate} />
            </CardContent>
        </Card>
       )}
    </div>
  );
}
