
"use client";

// This page is no longer used and can be removed.
// It is kept in the project to avoid breaking navigation during development,
// but the functionality has been removed.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileWarning } from "lucide-react";

export default function ReportsPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold flex items-center gap-4"><FileWarning className="h-10 w-10 text-primary" /> Cancellation Reports</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Feature Removed</CardTitle>
                    <CardDescription>The assignment cancellation feature and associated reporting have been removed from the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-24 flex items-center justify-center text-muted-foreground">
                        There are no reports to display.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
