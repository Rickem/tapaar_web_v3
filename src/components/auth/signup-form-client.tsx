"use client";

import dynamic from "next/dynamic";

const SignUpForm = dynamic(() => import("@/components/auth/signup-form"), {
  ssr: false,
});

export default function SignUpFormClient() {
  return <SignUpForm />;
}
