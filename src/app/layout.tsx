
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import Footer from '@/components/Footer';
import AppSidebar from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import NetworkBackground from '@/components/NetworkBackground';
import { ThemeProvider } from "@/components/providers/theme-provider";
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Academic Helper',
  description: 'Connecting students with freelance academic writers.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const GA_TRACKING_ID = "G-H6BJ1KT519"; 

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
        >
          <div className="relative isolate min-h-screen w-full">
            <NetworkBackground />
            <AuthProvider>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full relative z-0">
                    <AppSidebar />
                    <div className="flex flex-col flex-1">
                      <Header />
                      <main className="p-4 sm:p-6 lg:p-8 flex-1 flex-grow">
                        {children}
                      </main>
                      <Footer />
                    </div>
                  </div>
                  <Toaster />
                </SidebarProvider>
            </AuthProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
