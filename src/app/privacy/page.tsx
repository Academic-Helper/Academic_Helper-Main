
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
    // Using a static date to avoid hydration errors.
    const lastUpdatedDate = "October 26, 2024";

    return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
            <p>Last updated: {lastUpdatedDate}</p>
            
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
                <p>Academic Helper (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">2. Information We Collect</h2>
                <p>We may collect personal information about you in a variety of ways. The information we may collect on the Site includes:</p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                    <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and telephone number, that you voluntarily give to us when you register with the Site.</li>
                    <li><strong>Financial Data:</strong> We collect data related to your payments, including wallet balance, deposit, and withdrawal requests. We do not store your full bank account details on our primary database.</li>
                    <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, and your access times.</li>
                </ul>
            </div>
            
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">3. Use of Your Information</h2>
                <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                    <li>Create and manage your account.</li>
                    <li>Facilitate communication between Seekers and Writers.</li>
                    <li>Process payments and refunds.</li>
                    <li>Email you regarding your account or assignments.</li>
                    <li>Monitor and analyze usage and trends to improve your experience.</li>
                </ul>
            </div>
            
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">4. Disclosure of Your Information</h2>
                <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                    <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process or to protect the rights, property, and safety of others, we may share your information as permitted or required by law.</li>
                    <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us, including payment processing and data analysis.</li>
                </ul>
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">5. Security of Your Information</h2>
                <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no security measures are perfect or impenetrable.</p>
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">6. Contact Us</h2>
                <p>If you have questions or comments about this Privacy Policy, please contact us through our platform's support system.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
