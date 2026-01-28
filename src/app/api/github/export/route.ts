import { z } from "zod";
import { NextResponse } from "next/server";
import { getSession } from '@auth0/nextjs-auth0';

import { inngest } from "@/inngest/client";
import { getUserId } from "@/lib/auth-helpers";

import { Id } from "../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  projectId: z.string(),
  repoName: z.string().min(1).max(100),
  visibility: z.enum(["public", "private"]).default("private"),
  description: z.string().max(350).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getUserId(session.user);
  const body = await request.json();
  const { projectId, repoName, visibility, description } = requestSchema.parse(body);

  // For Auth0, we'll need to implement GitHub OAuth separately
  // For now, we'll require a GitHub token to be provided or stored in user metadata
  const githubToken = session.user['https://github.com/access_token'] || process.env.GITHUB_TOKEN;

  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub not connected. Please connect your GitHub account." },
      { status: 400 }
    );
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const event = await inngest.send({
    name: "github/export.repo",
    data: {
      projectId,
      repoName,
      visibility,
      description,
      githubToken,
      internalKey,
    },
  });

  return NextResponse.json({ 
    success: true, 
    projectId, 
    eventId: event.ids[0]
  });
};
