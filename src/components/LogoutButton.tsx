"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function LogoutButton() {
  return (
    <SignOutButton>
      <button className="button logout">
        Log Out
      </button>
    </SignOutButton>
  );
}
