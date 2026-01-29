import { query } from "./_generated/server";

export const debugAuth = query({
  args: {},
  handler: async (ctx) => {
    console.log("=== DEBUG AUTH ===");
    
    try {
      const identity = await ctx.auth.getUserIdentity();
      console.log("User identity:", identity);
      
      if (identity) {
        console.log("User is authenticated!");
        console.log("Identity details:", {
          subject: identity.subject,
          email: identity.email,
          name: identity.name,
          issuer: identity.iss,
        });
        return { 
          authenticated: true, 
          identity: identity,
          message: "User is authenticated successfully"
        };
      } else {
        console.log("User is NOT authenticated - identity is null");
        return { 
          authenticated: false, 
          identity: null,
          message: "No user identity found"
        };
      }
    } catch (error) {
      console.error("Auth error:", error);
      return { 
        authenticated: false, 
        identity: null,
        error: error.message,
        message: "Authentication error occurred"
      };
    }
  },
});