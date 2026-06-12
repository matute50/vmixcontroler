import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

// vMix saves snapshots to a fixed temp directory
// The snapshot filename is controlled by the "Value" parameter we send
const SNAPSHOT_FILENAME = 'vmix_monitor_preview.jpg';
const VMIX_API_URL = 'http://127.0.0.1:8088/api';

// vMix typically saves to the Documents folder or the path specified.
// We use the system's temp directory as a reliable writable location.
const SNAPSHOT_PATH = path.join(os.tmpdir(), SNAPSHOT_FILENAME);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  // "output" means the final program output (what's going to air)
  // You can also pass a specific input key to preview that input
  const inputTarget = searchParams.get('input') || 'Output';

  try {
    // Step 1: Ask vMix to take a snapshot and save it to our known path
    const snapshotUrl = new URL(`${VMIX_API_URL}`);
    snapshotUrl.searchParams.set('Function', 'SnapshotInput');
    snapshotUrl.searchParams.set('Input', inputTarget);
    snapshotUrl.searchParams.set('Value', SNAPSHOT_PATH);

    const snapshotResponse = await fetch(snapshotUrl.toString(), {
      cache: 'no-store',
    });

    if (!snapshotResponse.ok) {
      throw new Error(`vMix snapshot command failed: ${snapshotResponse.status}`);
    }

    // Step 2: Wait a short moment for vMix to write the file to disk
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Step 3: Read the file and return it as an image response
    if (!fs.existsSync(SNAPSHOT_PATH)) {
      return NextResponse.json(
        { error: 'Snapshot file not found. vMix may not have written it yet.' },
        { status: 404 }
      );
    }

    const imageBuffer = fs.readFileSync(SNAPSHOT_PATH);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Error getting vMix snapshot:', error);
    return NextResponse.json(
      { error: 'No se pudo obtener el snapshot de vMix.', details: error.message },
      { status: 500 }
    );
  }
}
