import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2, validateImageFile, deleteFromR2 } from '@/lib/storage/r2';

// POST - Upload a file to R2 storage
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle multipart form data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const sessionId = formData.get('sessionId') as string | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      if (!sessionId) {
        return NextResponse.json(
          { error: 'Session ID is required' },
          { status: 400 }
        );
      }

      // Validate file type and size
      const validation = validateImageFile(file.type, file.size);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to R2
      const url = await uploadToR2(buffer, file.name, file.type);

      return NextResponse.json({ url });
    }

    // Handle JSON body (URL upload - legacy support)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { imageUrl, sessionId } = body;

      if (!imageUrl) {
        return NextResponse.json(
          { error: 'Image URL is required' },
          { status: 400 }
        );
      }

      if (!sessionId) {
        return NextResponse.json(
          { error: 'Session ID is required' },
          { status: 400 }
        );
      }

      // For URL uploads, fetch the image and upload to R2
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch image from URL' },
          { status: 400 }
        );
      }

      const fileContentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate file type and size
      const validation = validateImageFile(fileContentType, buffer.length);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Extract filename from URL
      const urlPath = new URL(imageUrl).pathname;
      const filename = urlPath.split('/').pop() || 'image.jpg';

      // Upload to R2
      const url = await uploadToR2(buffer, filename, fileContentType);

      return NextResponse.json({ url });
    }

    return NextResponse.json(
      { error: 'Unsupported content type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a file from R2 storage
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, sessionId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Delete from R2
    const deleted = await deleteFromR2(imageUrl);

    if (!deleted) {
      // URL doesn't belong to our R2 bucket - this is fine, just means
      // it's an external image that doesn't need to be deleted from R2
      return NextResponse.json({
        success: true,
        message: 'Image URL is not from R2 storage, no deletion needed'
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete image' },
      { status: 500 }
    );
  }
}
