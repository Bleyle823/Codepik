import dynamic from "next/dynamic";

import { Id } from "../../../../convex/_generated/dataModel";

// Dynamic import with ssr: false to prevent server-side analysis of Opik imports
const ProjectIdView = dynamic(
  () => import("@/features/projects/components/project-id-view-safe").then(m => ({ default: m.ProjectIdView })),
  {
    loading: () => (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse">Loading project...</div>
      </div>
    )
  }
);

const ProjectIdPage = async ({
  params,
}: {
  params: Promise<{ projectId: string }>
}) => {
  const { projectId } = await params;

  return <ProjectIdView projectId={projectId as Id<"projects">} />;
}

export default ProjectIdPage;