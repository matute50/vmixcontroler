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

    // Parse inputs
    const inputsData = result.vmix?.inputs?.[0]?.input || [];
    
    // Map to a cleaner format
    const inputs = inputsData.map((input: any) => {
      const attrs = input.$ || {};
      return {
        id: attrs.key || '',
        number: attrs.number || '',
        title: attrs.title || attrs.name || '',
        type: attrs.type || ''
      };
    });

    // Active input is specified by its number in <active>
    const activeNumber = result.vmix?.active?.[0] || '';
    
    // Find the ID (key) of the active input
    const activeInput = inputs.find((i: any) => i.number === activeNumber);
    const activeId = activeInput ? activeInput.id : null;

    return NextResponse.json({
      activeId,
      activeNumber,
      inputs
    });

  } catch (error: any) {
    console.error('Error fetching from vMix API:', error);
    return NextResponse.json(
      { 
        error: 'No se pudo conectar a vMix. Asegúrate de que vMix esté abierto y configurado en el puerto 8088.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inputId = body.inputId;
    const func = body.function || 'Fade';

    if (!inputId) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro inputId' },
        { status: 400 }
      );
    }

    // Construct the URL with query parameters
    const url = new URL(VMIX_API_URL);
    url.searchParams.append('Function', func);
    url.searchParams.append('Input', inputId);

    const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`vMix API responded with status: ${response.status}`);
    }

    return NextResponse.json({ success: true, message: `Function ${func} executed on input ${inputId}` });
  } catch (error: any) {
    console.error('Error sending command to vMix API:', error);
    return NextResponse.json(
      { 
        error: 'No se pudo ejecutar el comando en vMix. Asegúrate de que vMix esté abierto y el puerto sea 8088.',
        details: error.message
      },
      { status: 500 }
    );
  }
}

