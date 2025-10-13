"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

interface GoogleAnalyticsProps {
  ga_id: string;
}

declare global {
  interface Window {
    gtag: (
      command: "config" | "event",
      targetId: string,
      config?: { page_path?: string }
    ) => void;
  }
}

export default function GoogleAnalytics({ ga_id }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageview = (path: string) => {
    if (window.gtag) {
      window.gtag("config", ga_id, {
        page_path: path,
      });
    }
  };

  useEffect(() => {
    if (pathname) {
      pageview(pathname);
    }
  }, [pathname, searchParams]);

  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${ga_id}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${ga_id}', {
                            page_path: window.location.pathname,
                        });
                    `,
        }}
      />
    </>
  );
}
