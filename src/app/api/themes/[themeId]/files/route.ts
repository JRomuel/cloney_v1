import { NextRequest, NextResponse } from 'next/server';
import { getThemePackager } from '@/lib/themes/ThemePackager';

/**
 * API endpoint for serving theme files
 *
 * GET /api/themes/{themeId}/files
 *   - Returns list of all theme files with metadata
 *   - Query params: ?path=sections/header.liquid (optional, returns specific file content)
 *
 * This endpoint is used for:
 * 1. Client-side preview rendering (fetching templates)
 * 2. Theme packaging for Shopify upload
 */

interface RouteParams {
  params: Promise<{
    themeId: string;
  }>;
}

// GET /api/themes/{themeId}/files
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { themeId } = await params;
    const packager = getThemePackager();

    // Check if theme exists
    if (!(await packager.themeExists(themeId))) {
      return NextResponse.json(
        { error: `Theme '${themeId}' not found` },
        { status: 404 }
      );
    }

    // Check for specific file path query parameter
    const filePath = request.nextUrl.searchParams.get('path');

    if (filePath) {
      // Return content of specific file
      try {
        const content = await packager.getFile(themeId, filePath);
        return NextResponse.json({
          filename: filePath,
          content,
        });
      } catch {
        return NextResponse.json(
          { error: `File '${filePath}' not found in theme '${themeId}'` },
          { status: 404 }
        );
      }
    }

    // Return all files (for theme packaging)
    const includeContent = request.nextUrl.searchParams.get('includeContent') === 'true';

    if (includeContent) {
      // Return all files with content (for upload)
      const files = await packager.getThemeFiles(themeId);
      return NextResponse.json({
        themeId,
        fileCount: files.length,
        files,
      });
    }

    // Return file list without content (lighter response)
    const files = await packager.listFiles(themeId);
    const summary = await packager.getFileSummary(themeId);

    return NextResponse.json({
      themeId,
      fileCount: files.length,
      summary,
      files,
    });
  } catch (error) {
    console.error('[API] Error serving theme files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load theme files' },
      { status: 500 }
    );
  }
}
