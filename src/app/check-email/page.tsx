
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck } from "lucide-react";
import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
            <MailCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl mt-4">Check your inbox</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification link to your email address. Please click the link to activate your account. If you don&apos;t see it, be sure to check your spam folder.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm">
            <p>You can <Link href="/login" className="underline">try logging in</Link> again to have another link sent.</p>
        </CardContent>
      </Card>
    </div>
  );
}
