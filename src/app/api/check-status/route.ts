import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ip = searchParams.get('ip');

  if (!ip) {
    return NextResponse.json({ online: false }, { status: 400 });
  }

  try {
    // Intentar conectar a la API del controlador remoto
    const controllerUrl = `http://${ip}:3000/api/vmix-debug`;
    const res = await fetch(controllerUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });

    if (res.ok) {
      return NextResponse.json({ online: true });
    }
    return NextResponse.json({ online: false });
  } catch (error) {
    return NextResponse.json({ online: false });
  }
}
