import { ShieldAlertIcon } from "lucide-react";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { AuthDebug } from "@/components/auth-debug";

export const UnauthenticatedView = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-background p-4">
      <div className="w-full max-w-4xl space-y-4">
        {/* Debug Component */}
        <AuthDebug />
        
        {/* Original Unauthorized Message */}
        <div className="bg-muted">
          <Item variant="outline">
            <ItemMedia variant="icon">
              <ShieldAlertIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Unauthorized Access</ItemTitle>
              <ItemDescription>
                You are not authorized to access this resource.
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <SignInButton>
                <Button variant="outline" size="sm">
                  Sign in
                </Button>
              </SignInButton>
            </ItemActions>
          </Item>
        </div>
      </div>
    </div>
  );
};
