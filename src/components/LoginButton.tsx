"use client";

import { SignInButton } from "@clerk/nextjs";

export default function LoginButton() {
  return (
    <SignInButton>
      <button className="button login">
        Log In
      </button>
    </SignInButton>
  );
}
