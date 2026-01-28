"use client";

import { useUser, SignedIn, SignedOut } from "@clerk/nextjs";

export default function AuthExample() {
  const { user } = useUser();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Clerk Authentication Example</h1>
      
      <SignedOut>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Welcome!</h2>
          <p className="text-blue-700">
            Please sign in or sign up to access your account. Use the buttons in the header to get started.
          </p>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            Welcome back, {user?.firstName || user?.fullName}!
          </h2>
          <div className="space-y-2 text-green-700">
            <p><strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress}</p>
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Created:</strong> {user?.createdAt?.toLocaleDateString()}</p>
          </div>
        </div>
      </SignedIn>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">Integration Complete!</h3>
        <p className="text-gray-700 mb-2">
          Your Next.js app is now using Clerk for authentication with the following features:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>✅ ClerkProvider wrapping the app</li>
          <li>✅ clerkMiddleware() for route protection</li>
          <li>✅ Sign In/Sign Up buttons</li>
          <li>✅ UserButton for account management</li>
          <li>✅ Authentication state management</li>
        </ul>
      </div>
    </div>
  );
}