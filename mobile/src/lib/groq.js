/**
 * LifeLink AI Triage — powered by Groq
 *
 * Pipeline:
 *  1. Audio  → Groq Whisper (whisper-large-v3)  → transcript
 *  2. Images + transcript → Groq Llama 4 Scout (vision) → triage JSON
 *
 * Free tier: 14,400 requests/day — plenty for hackathon testing.
 */

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.warn('[Groq] Missing EXPO_PUBLIC_GROQ_API_KEY in .env');
}

const GROQ_BASE = 'https://api.groq.com/openai/v1';

/**
 * Step 1: Transcribe audio via Groq Whisper
 * @param {string} audioBase64 - base64-encoded audio
 * @param {string} mimeType - 'audio/m4a' | 'audio/mp4'
 * @returns {Promise<string>} transcript text
 */
async function transcribeAudio(audioBase64, mimeType) {
  try {
    // Convert base64 → Blob → File
    const byteChars = atob(audioBase64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNums);
    const blob = new Blob([byteArray], { type: mimeType });

    const formData = new FormData();
    const ext = mimeType.includes('m4a') ? 'm4a' : 'mp4';
    formData.append('file', blob, `audio.${ext}`);
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');
    formData.append('language', 'en');

    const response = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn('[Groq Whisper] Transcription failed:', err);
      return '';
    }

    const data = await response.json();
    return data.text || '';
  } catch (e) {
    console.warn('[Groq Whisper] Error:', e.message);
    return '';
  }
}

/**
 * Step 2: Vision triage via Llama 4 Scout
 * @param {string} transcript
 * @param {Array<{base64: string, mimeType: string}>} images
 * @returns {Promise<object>} parsed triage JSON
 */
async function visionTriage(transcript, images) {
  const systemPrompt = `You are an emergency medical AI triage assistant. Analyze the provided scene images and voice transcript.

IMPORTANT RULES:
- Respond ONLY with a valid JSON object, no markdown, no explanation.
- If images show no emergency and transcript suggests no danger, set severity to "green".
- If media is unclear/empty, set severity to "unknown".
- Never hallucinate injuries that are not visible or mentioned.

Return ONLY this JSON:
{
  "severity": "red" | "orange" | "yellow" | "green" | "unknown",
  "summary": "2-3 sentence description",
  "injuries": ["list of detected injuries"],
  "risks": ["list of immediate risks if untreated"],
  "recommendations": ["first-aid steps for bystanders"]
}

Severity guide:
- red: life-threatening, immediate intervention needed
- orange: serious, urgent care needed within 30 minutes
- yellow: minor, non-urgent but needs attention  
- green: no danger / false alarm
- unknown: cannot determine from available media`;

  // Build the user message content: text + images
  const userContent = [];

  // Add transcript context
  userContent.push({
    type: 'text',
    text: transcript
      ? `Voice transcript from victim/bystander: "${transcript}"\n\nAnalyze the following scene images:`
      : 'No voice description provided. Analyze the following scene images:',
  });

  // Add up to 2 images (resized on-device before reaching here)
  for (const img of images.slice(0, 2)) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType || 'image/jpeg'};base64,${img.base64}`,
      },
    });
  }

  const response = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 1024,
      temperature: 0.1, // Low temperature for consistent medical outputs
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq vision API error: ${err}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content?.trim() || '';

  // Strip any accidental markdown fencing
  const cleaned = rawText.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();

  return JSON.parse(cleaned);
}

/**
 * Main entry point — runs full AI triage pipeline via Groq
 * @param {object|null} audio - { base64: string, mimeType: string }
 * @param {Array<{base64: string, mimeType: string}>} images
 * @returns {Promise<{severity, summary, injuries, risks, recommendations, transcript, raw}>}
 */
export async function runAITriage(audio, images = []) {
  // Step 1: Transcribe audio (if available)
  let transcript = '';
  if (audio?.base64) {
    console.log('[Groq] Transcribing audio via Whisper...');
    transcript = await transcribeAudio(audio.base64, audio.mimeType || 'audio/mp4');
    console.log('[Groq] Transcript:', transcript);
  }

  // Step 2: Vision + text triage
  console.log('[Groq] Running vision triage via Llama 4 Scout...');
  const parsed = await visionTriage(transcript, images);

  return {
    severity:        parsed.severity        || 'unknown',
    summary:         parsed.summary         || '',
    injuries:        parsed.injuries        || [],
    risks:           parsed.risks           || [],
    recommendations: parsed.recommendations || [],
    transcript,
    raw: parsed,
  };
}
