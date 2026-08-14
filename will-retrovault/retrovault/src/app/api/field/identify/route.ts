import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import prisma from '@/lib/prisma';
import { normalizeText } from '@/lib/fieldMode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GOOGLE_VISION_KEY_PATH = '/home/apesch/google_vision.txt';
const AUTO_RUN_THRESHOLD = 0.7;

type Candidate = { title: string; platform: string; confidence: number };

function loadVisionApiKey() {
  try {
    const raw = fs.readFileSync(GOOGLE_VISION_KEY_PATH, 'utf8').trim();
    return raw || null;
  } catch {
    return null;
  }
}

function normalizeForWords(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|and|for|with|edition|game|games|nintendo|playstation|sega|xbox)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreCandidate(text: string, title: string, platform: string) {
  const normalizedText = normalizeForWords(text);
  const titleWords = normalizeForWords(title).split(' ').filter(Boolean);
  const platformWords = normalizeForWords(platform).split(' ').filter(Boolean);
  if (!normalizedText || titleWords.length === 0) return 0;

  const matchedTitleWords = titleWords.filter((word) => normalizedText.includes(word)).length;
  const matchedPlatformWords = platformWords.filter((word) => normalizedText.includes(word)).length;
  const titleRatio = matchedTitleWords / titleWords.length;
  const platformRatio = platformWords.length > 0 ? matchedPlatformWords / platformWords.length : 0;

  let score = titleRatio * 0.82 + platformRatio * 0.18;
  if (normalizedText.includes(normalizeForWords(title))) score += 0.12;
  if (platformWords.length > 0 && normalizedText.includes(normalizeForWords(platform))) score += 0.06;
  return Math.min(score, 0.99);
}

async function runVisionOcr(base64Image: string, apiKey: string) {
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64Image },
          features: [
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            { type: 'TEXT_DETECTION', maxResults: 1 },
          ],
        },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Google Vision OCR failed');
  }

  const response = data?.responses?.[0] || {};
  return response?.fullTextAnnotation?.text || response?.textAnnotations?.[0]?.description || '';
}

export async function POST(req: NextRequest) {
  console.log('[field-identify] request received');
  const apiKey = loadVisionApiKey();
  if (!apiKey) {
    console.error('[field-identify] missing API key file at', GOOGLE_VISION_KEY_PATH);
    return NextResponse.json(
      { error: 'Photo Lookup is not configured on this server yet.' },
      { status: 503 }
    );
  }

  try {
    const form = await req.formData();
    console.log('[field-identify] parsed form data');
    const image = form.get('image');
    if (!(image instanceof File)) {
      console.error('[field-identify] image missing from form data');
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
    }

    const bytes = Buffer.from(await image.arrayBuffer());
    console.log('[field-identify] image bytes', bytes.length);
    const extractedText = await runVisionOcr(bytes.toString('base64'), apiKey);
    console.log('[field-identify] OCR text length', extractedText.length);
    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'No readable text found in image.' }, { status: 422 });
    }

    const games = await prisma.game.findMany({
      select: { title: true, platform: true },
    });

    const candidates: Candidate[] = games
      .map((game) => ({
        title: game.title,
        platform: game.platform,
        confidence: scoreCandidate(extractedText, game.title, game.platform),
      }))
      .filter((candidate) => candidate.confidence > 0.18)
      .sort((a, b) => b.confidence - a.confidence)
      .filter((candidate, index, arr) =>
        arr.findIndex((entry) => normalizeText(entry.title) === normalizeText(candidate.title) && normalizeText(entry.platform) === normalizeText(candidate.platform)) === index
      )
      .slice(0, 5);

    const match = candidates[0] || null;
    const confidencePercent = match ? Math.round(match.confidence * 100) : 0;

    console.log('[field-identify] candidates', candidates.slice(0, 3));
    return NextResponse.json({
      configured: true,
      extractedText,
      match,
      candidates,
      confidence: confidencePercent,
      autoRun: !!match && match.confidence >= AUTO_RUN_THRESHOLD,
    });
  } catch (error: unknown) {
    console.error('[field-identify] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not identify image.' },
      { status: 500 }
    );
  }
}
