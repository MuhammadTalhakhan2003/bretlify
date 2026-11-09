import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth is enforced where data is accessed (each protected page and API route),
// per Clerk's resource-based guidance. The proxy only attaches session state.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
