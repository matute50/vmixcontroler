import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';

const VMIX_API_URL = 'http://127.0.0.1:8088/api';

export async function GET() {
  try {
    const response = await fetch(VMIX_API_URL, { cache: 'no-store' });
    const xmlText = await response.text();
    const result = await parseStringPromise(xmlText);

    // Devolver el XML crudo y el objeto parseado para diagnóstico
    return NextResponse.json({
      xmlRaw: xmlText.substring(0, 3000), // primeros 3000 chars
      audioNode: result.vmix?.audio,
      masterAttrs: result.vmix?.audio?.[0]?.$,
      vmixKeys: Object.keys(result.vmix || {}),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
