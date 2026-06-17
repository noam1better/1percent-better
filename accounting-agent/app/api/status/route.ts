import { NextResponse } from 'next/server';

export interface StatusData {
  running: boolean;
  port: number;
  checkedAt: string;
}

export async function GET() {
  const port = parseInt(process.env.WEBHOOK_PORT ?? '3001', 10);

  try {
    const res = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      return NextResponse.json<StatusData>({
        running: true,
        port,
        checkedAt: new Date().toISOString(),
      });
    }
    throw new Error(`HTTP ${res.status}`);
  } catch {
    return NextResponse.json<StatusData>({
      running: false,
      port,
      checkedAt: new Date().toISOString(),
    });
  }
}
