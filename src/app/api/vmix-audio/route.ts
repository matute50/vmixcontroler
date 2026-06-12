/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';

const VMIX_API_URL = 'http://127.0.0.1:8088/api';

export async function GET() {
  try {
    const response = await fetch(VMIX_API_URL, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`vMix API responded with status: ${response.status}`);
    }

    const xmlText = await response.text();
    const result = await parseStringPromise(xmlText);

    // ── Estructura real del XML de vMix ────────────────────────────────────
    // <audio>
    //   <master volume="100" muted="False" meterF1="0.82" meterF2="0.75" />
    // </audio>
    //
    // Con xml2js:  result.vmix.audio[0].master[0].$
    // ────────────────────────────────────────────────────────────────────────
    const masterNode = result.vmix?.audio?.[0]?.master?.[0]?.$;

    const masterF1     = parseFloat(masterNode?.meterF1     ?? '0');
    const masterF2     = parseFloat(masterNode?.meterF2     ?? '0');
    const masterVolume = parseFloat(masterNode?.volume      ?? '100');
    const masterMuted  = masterNode?.muted === 'True';
    const headphonesVolume = parseFloat(masterNode?.headphonesVolume ?? '100');

    return NextResponse.json({
      master: {
        meterF1:          masterF1,
        meterF2:          masterF2,
        volume:           masterVolume,
        muted:            masterMuted,
        headphonesVolume: headphonesVolume,
      },
      timestamp: Date.now(),
    });

  } catch (error: any) {
    console.error('Error fetching audio levels from vMix:', error);
    return NextResponse.json(
      {
        error: 'No se pudo obtener los niveles de audio de vMix.',
        details: error.message,
        master: { meterF1: 0, meterF2: 0, volume: 100, muted: false },
      },
      { status: 500 }
    );
  }
}

