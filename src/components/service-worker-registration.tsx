"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    // Check for updates every 60 seconds
                    setInterval(() => {
                        registration.update();
                    }, 60 * 1000);

                    registration.addEventListener("updatefound", () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener("statechange", () => {
                                if (
                                    newWorker.state === "activated" &&
                                    navigator.serviceWorker.controller
                                ) {
                                    // New version available — reload to get latest
                                    window.location.reload();
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error("SW registration failed:", error);
                });
        }
    }, []);

    return null;
}
