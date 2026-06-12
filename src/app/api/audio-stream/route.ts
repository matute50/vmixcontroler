import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

// ─── Config ─────────────────────────────────────────────────────────────────
// "vMix Audio" = Master output de vMix (dispositivo DirectShow)
// Si el usuario quiere otro bus puede cambiar aquí o pasar ?bus=A etc.
const VMIX_AUDIO_DEVICES: Record<string, string> = {
  master: 'vMix Audio',
  busA:   'vMix Audio - Bus A',
  busB:   'vMix Audio - Bus B',
  headphones: 'vMix Audio - M A B',
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const bus = request.nextUrl.searchParams.get('bus') ?? 'master';
  const deviceName = VMIX_AUDIO_DEVICES[bus] ?? VMIX_AUDIO_DEVICES.master;

  // Formato de audio: MP3 128kbps estéreo 44.1kHz
  // -re: read at native frame rate
  // -fflags nobuffer -flags low_delay: minimize latency
  const ffmpegArgs = [
    '-f',        'dshow',
    '-audio_buffer_size', '50',  // buffer pequeño = baja latencia (~50ms)
    '-i',        `audio=${deviceName}`,
    '-acodec',   'libmp3lame',
    '-b:a',      '128k',
    '-ar',       '44100',
    '-ac',       '2',
    '-f',        'mp3',
    '-write_xing', '0',          // evitar header de duración (stream infinito)
    'pipe:1',
  ];

  let ffmpegProcess: ReturnType<typeof spawn> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      ffmpegProcess.stdout!.on('data', (chunk: Buffer) => {
        try { controller.enqueue(new Uint8Array(chunk)); }
        catch { /* cliente desconectado */ }
      });

      ffmpegProcess.stderr!.on('data', (data: Buffer) => {
        // Silenciar logs de FFmpeg a menos que sea un error real
        const msg = data.toString();
        if (msg.includes('Error') || msg.includes('error')) {
          console.error('[audio-stream] FFmpeg:', msg.trim());
        }
      });

      ffmpegProcess.on('close', (code) => {
        console.log(`[audio-stream] FFmpeg cerrado con código ${code}`);
        try { controller.close(); } catch { /* ya cerrado */ }
      });

      ffmpegProcess.on('error', (err) => {
        console.error('[audio-stream] Error al iniciar FFmpeg:', err);
        controller.error(err);
      });
    },
    cancel() {
      // El celular cerró la conexión → matar FFmpeg
      if (ffmpegProcess) {
        ffmpegProcess.kill('SIGKILL');
        ffmpegProcess = null;
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type':     'audio/mpeg',
      'Transfer-Encoding': 'chunked',
      'Cache-Control':    'no-cache, no-store',
      'Connection':       'keep-alive',
      'X-Accel-Buffering': 'no', // Desactiva buffering en Nginx/proxies
      'Access-Control-Allow-Origin': '*',
    },
  });
}
