import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth callback stub for social platform connections.
 * In M13 (Ayrshare integration), this will:
 * 1. Validate the OAuth callback (state, code)
 * 2. Exchange the code for tokens via Ayrshare
 * 3. Store encrypted tokens in social_connections
 * 4. Redirect back to the workspace settings page
 *
 * For now, it redirects to the home page with an info message.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  // TODO (M13): Implement real OAuth callback
  // 1. Extract code + state from query params
  // 2. Validate state against stored value
  // 3. Exchange code for tokens via Ayrshare
  // 4. Encrypt tokens and store in social_connections
  // 5. Redirect to workspace settings with success toast

  const redirectUrl = new URL('/', req.url);
  redirectUrl.searchParams.set(
    'info',
    `OAuth callback for ${platform} is not yet implemented`
  );

  return NextResponse.redirect(redirectUrl);
}
