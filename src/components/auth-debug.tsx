"use client";

import { useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";

export const AuthDebug = () => {
  const { isAuthenticated: convexAuth, isLoading: convexLoading } = useConvexAuth();
  const { isSignedIn: clerkAuth, isLoaded: clerkLoaded, getToken } = useAuth();
  const { user } = useUser();
  const debugResult = useQuery(api.debug.debugAuth);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  // Test getting tokens
  useEffect(() => {
    const testTokens = async () => {
      if (clerkAuth && getToken) {
        try {
          const regularToken = await getToken();
          const convexToken = await getToken({ template: "convex" });
          
          setTokenInfo({
            hasRegularToken: !!regularToken,
            hasConvexToken: !!convexToken,
            regularTokenLength: regularToken?.length || 0,
            convexTokenLength: convexToken?.length || 0,
            tokensMatch: regularToken === convexToken,
          });
        } catch (error) {
          setTokenInfo({
            error: error.message,
          });
        }
      }
    };

    testTokens();
  }, [clerkAuth, getToken]);

  return (
    <div className="p-4 bg-gray-100 rounded-lg space-y-4 text-sm">
      <h3 className="font-bold text-lg">🔍 Authentication Debug Info</h3>
      
      <div className="space-y-2">
        <div>
          <strong>Clerk Status:</strong>
          <ul className="ml-4">
            <li>• Loaded: {clerkLoaded ? "✅" : "❌"}</li>
            <li>• Signed In: {clerkAuth ? "✅" : "❌"}</li>
            <li>• User ID: {user?.id || "None"}</li>
            <li>• User Email: {user?.emailAddresses?.[0]?.emailAddress || "None"}</li>
          </ul>
        </div>
        
        <div>
          <strong>Token Information:</strong>
          <ul className="ml-4">
            <li>• Regular Token: {tokenInfo?.hasRegularToken ? "✅" : "❌"}</li>
            <li>• Convex Token: {tokenInfo?.hasConvexToken ? "✅" : "❌"}</li>
            <li>• Tokens Match: {tokenInfo?.tokensMatch ? "✅" : "❌"}</li>
            {tokenInfo?.error && (
              <li className="text-red-600">• Token Error: {tokenInfo.error}</li>
            )}
          </ul>
        </div>
        
        <div>
          <strong>Convex Status:</strong>
          <ul className="ml-4">
            <li>• Loading: {convexLoading ? "⏳" : "✅"}</li>
            <li>• Authenticated: {convexAuth ? "✅" : "❌"}</li>
          </ul>
        </div>
        
        <div>
          <strong>Backend Debug:</strong>
          <ul className="ml-4">
            <li>• Query Status: {debugResult === undefined ? "Loading..." : "Loaded"}</li>
            <li>• Backend Auth: {debugResult?.authenticated ? "✅" : "❌"}</li>
            <li>• Message: {debugResult?.message || "Loading..."}</li>
            {debugResult?.error && (
              <li className="text-red-600">• Error: {debugResult.error}</li>
            )}
            {debugResult?.identity && (
              <li>• Identity Subject: {debugResult.identity.subject}</li>
            )}
          </ul>
        </div>
      </div>
      
      <div className="text-xs bg-white p-2 rounded">
        <strong>Raw Debug Data:</strong>
        <pre>{JSON.stringify(debugResult, null, 2)}</pre>
      </div>
    </div>
  );
};