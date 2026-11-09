import { auth, currentUser } from "@clerk/nextjs/server";
import { Liveblocks } from "@liveblocks/node";
import { getAccessibleProject } from "@/lib/projects";
import { roomIdFor, colorFor } from "@/lib/collab-shared";

/** Lets the editor know whether to attempt a live connection at all. */
export function GET() {
  return Response.json({ enabled: Boolean(process.env.LIVEBLOCKS_SECRET_KEY) });
}

export async function POST(req: Request) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) return Response.json({ error: "Collaboration is not configured" }, { status: 501 });

  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { room } = (await req.json()) as { room?: string };
  const projectId = room?.startsWith(roomIdFor("")) ? room.slice(roomIdFor("").length) : null;
  if (!projectId || !(await getAccessibleProject(projectId, userId))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await currentUser();
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Guest";

  const liveblocks = new Liveblocks({ secret });
  const session = liveblocks.prepareSession(userId, {
    userInfo: { name, color: colorFor(userId), avatar: user?.imageUrl ?? "" },
  });
  session.allow(roomIdFor(projectId), session.FULL_ACCESS);
  const { status, body } = await session.authorize();
  return new Response(body, { status, headers: { "Content-Type": "application/json" } });
}
