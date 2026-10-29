import { spawn } from 'node:child_process';

const BITRATE = '96k';

/** Encodes 16-bit little-endian mono PCM to MP3 with ffmpeg (installed in the API image). */
export function encodeMp3(pcm: Uint8Array, sampleRate: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      'ffmpeg',
      [
        ...['-hide_banner', '-loglevel', 'error'],
        ...['-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0'],
        ...['-codec:a', 'libmp3lame', '-b:a', BITRATE, '-f', 'mp3', 'pipe:1'],
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const output: Buffer[] = [];
    let stderr = '';
    ffmpeg.stdout.on('data', (chunk: Buffer) => output.push(chunk));
    ffmpeg.stderr.on('data', (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-500);
    });
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve(new Uint8Array(Buffer.concat(output)));
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`));
    });
    ffmpeg.stdin.on('error', reject);
    ffmpeg.stdin.end(pcm);
  });
}
