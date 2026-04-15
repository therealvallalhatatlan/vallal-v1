import { NextRequest, NextResponse } from 'next/server';
import { runProactiveAgent } from '@/lib/proactive';

export const runtime = 'nodejs';

function resolveCronSecret(req: NextRequest) {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return req.headers.get('x-cron-secret') || bearer || '';
}

function authorizeCronRequest(req: NextRequest) {
  const expected = process.env.CRON_SECRET_TOKEN || process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'cron secret not configured' }, { status: 500 });
  }

  if (resolveCronSecret(req) !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return null;
}

function parseDryRun(req: NextRequest, body?: Record<string, unknown>) {
  if (req.nextUrl.searchParams.get('dry_run') === 'false') return false;
  if (req.nextUrl.searchParams.get('dry_run') === 'true') return true;
  if (body?.dryRun === false) return false;
  if (body?.dryRun === true) return true;
  return true;
}

function parseLimit(req: NextRequest, body?: Record<string, unknown>) {
  const raw = req.nextUrl.searchParams.get('limit') ?? body?.limit;
  const limit = Number(raw);
  return Number.isFinite(limit) ? limit : undefined;
}

export async function GET(req: NextRequest) {
  const authError = authorizeCronRequest(req);
  if (authError) return authError;

  const result = await runProactiveAgent({
    dryRun: parseDryRun(req),
    limit: parseLimit(req),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const authError = authorizeCronRequest(req);
  if (authError) return authError;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await runProactiveAgent({
    dryRun: parseDryRun(req, body),
    limit: parseLimit(req, body),
  });

  return NextResponse.json(result);
}
