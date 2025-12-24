
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfServicePage() {
  // Using a static date to avoid hydration errors.
  const lastUpdatedDate = "October 26, 2024";

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <p>Last updated: {lastUpdatedDate}</p>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
            <p>Welcome to Academic Helper (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). These Terms of Service (&quot;Terms&quot;) govern your use of our website and services. By accessing or using our platform, you agree to be bound by these Terms.</p>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">2. User Accounts</h2>
            <p>You must create an account to use certain features of our service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must be at least 18 years old to create an account.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">3. Service Description</h2>
            <p>Academic Helper provides a platform for &quot;Seekers&quot; to post academic assignments and for &quot;Writers&quot; to offer their services to complete these assignments. We act as a facilitator and do not guarantee the quality of work or the successful completion of any assignment.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">4. User Responsibilities</h2>
            <p><strong>Seekers:</strong> You agree to provide accurate and complete details for your assignments. You are responsible for evaluating the writers and their proposals. All work provided by writers should be used as a reference and learning tool, and not submitted as your own original work, which constitutes academic dishonesty.</p>
            <p><strong>Writers:</strong> You agree to provide original, high-quality work that meets the requirements specified by the Seeker. You will not engage in plagiarism or any form of academic misconduct.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">5. Payments and Fees</h2>
            <p>Seekers are required to deposit the agreed-upon fee into their wallet after a writer's proposal is accepted. These funds are held by Academic Helper and are released to the writer (minus a service fee) upon successful completion and approval of the assignment by the Seeker. All transactions are handled through our platform.</p>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">6. User Conduct and Warnings</h2>
            <p>To maintain a safe and professional environment, all users must adhere to our conduct policies. Violations will result in warnings and may lead to account termination.</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
                <li>
                    <strong>Contact Information Sharing:</strong> Sharing personal contact information (such as email addresses, phone numbers, or social media profiles) within the platform's chat systems is strictly prohibited. Each violation will result in one (1) warning. Accumulating five (5) contact sharing warnings will lead to an automatic and permanent account ban.
                </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">7. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time, without notice, for conduct that we believe violates these Terms, including accumulating warnings as described in Section 6, or is harmful to other users of the service, us, or third parties, or for any other reason.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">8. Disclaimers</h2>
            <p>Our service is provided &quot;as is&quot; and &quot;as available&quot; without any warranties of any kind, either express or implied. We do not warrant that the service will be uninterrupted, error-free, or secure.</p>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <p>In no event shall Academic Helper be liable for any indirect, incidental, special, consequential, or punitive damages, including but not to, loss of profits, data, or goodwill, arising out of your use of the service.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">10. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us through our platform's support system.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
