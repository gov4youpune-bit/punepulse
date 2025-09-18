import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/worker(.*)',
  '/api/complaints/assign(.*)',
  '/api/complaints/assigned(.*)',
  '/api/complaints/report(.*)',
  '/api/complaints/verify(.*)',
  '/api/complaints/reports(.*)',
  '/api/workers(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  console.log(`[MIDDLEWARE] Processing: ${req.nextUrl.pathname}`);
  console.log(`[MIDDLEWARE] Is protected: ${isProtectedRoute(req)}`);
  
  if (isProtectedRoute(req)) {
    console.log(`[MIDDLEWARE] Protecting route: ${req.nextUrl.pathname}`);
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
