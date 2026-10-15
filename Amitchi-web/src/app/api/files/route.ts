import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let filePath = searchParams.get('path');

  if (!filePath) {
    return new NextResponse('Path is required', { status: 400 });
  }

  // Clean the path: remove file:/// and normalize slashes for Windows
  filePath = filePath.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
  filePath = path.normalize(filePath);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return new NextResponse(`File not found at ${filePath}`, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  
  let contentType = 'image/jpeg';
  if (extension === '.png') contentType = 'image/png';
  if (extension === '.webp') contentType = 'image/webp';

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
