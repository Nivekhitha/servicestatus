import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 8080;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const GEMINI_MODEL = 'gemini-4-hydrogen';
const GEMINI_FALLBACK_MODELS = ['gemini-4-hydrogen', 'gemini-3-flash-preview', 'gemini-2.5-flash'] as const;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; status?: string; code?: number } };
    if (parsed?.error?.status === 'UNAVAILABLE' || parsed?.error?.code === 503) {
      return 'The AI assistant is temporarily busy due to high demand. Please retry in a few seconds.';
    }
    if (parsed?.error?.status === 'RESOURCE_EXHAUSTED' || parsed?.error?.code === 429) {
      return 'The AI service reached a temporary rate limit. Please try again shortly.';
    }
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Not a raw JSON string; check substrings below
  }
  if (/UNAVAILABLE|503|high demand/i.test(raw)) {
    return 'The AI assistant is temporarily busy due to high demand. Please retry in a few seconds.';
  }
  if (/RESOURCE_EXHAUSTED|429|quota/i.test(raw)) {
    return 'The AI service reached a temporary rate limit. Please try again shortly.';
  }
  return raw.length > 220 ? `${raw.slice(0, 217)}...` : raw;
}

async function generateContentWithFallback(
  ai: GoogleGenAI,
  request: Omit<Parameters<GoogleGenAI['models']['generateContent']>[0], 'model'>
) {
  let lastError: unknown;
  for (const model of GEMINI_FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        ...request,
        model,
      });
      return { response, model };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err ?? '');
      const isRetryable = /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|NOT_FOUND|404|high demand/i.test(msg);
      if (!isRetryable) {
        throw err;
      }
    }
  }
  throw lastError;
}

function getLanguageName(code: string): string {
  if (code === 'ta') return 'Tamil (தமிழ்)';
  if (code === 'hi') return 'Hindi (हिन्दी)';
  return 'English';
}

function getTwilioStatus() {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim() || '';
  const token = process.env.TWILIO_AUTH_TOKEN?.trim() || '';
  const smsFrom = process.env.TWILIO_PHONE_NUMBER?.trim() || '';
  const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER?.trim() || '';
  return {
    smsConfigured: Boolean(sid && token && smsFrom),
    whatsappConfigured: Boolean(sid && token && whatsappFrom),
    accountConfigured: Boolean(sid && token),
  };
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

async function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Integration status (read-only boolean flags; never returns secret values)
  app.get('/api/integrations/status', (_req, res) => {
    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    const twilio = getTwilioStatus();
    const fcmConfigured = Boolean(process.env.VITE_FIREBASE_VAPID_KEY?.trim());
    res.json({
      gemini: {
        configured: geminiConfigured,
        model: GEMINI_MODEL,
      },
      twilio,
      fcm: {
        configured: fcmConfigured,
      },
      dms: {
        configured: false,
        note: 'External DMS webhook bridge is optional and not configured in this environment.',
      },
    });
  });

  // 1. Convert technical technician note into customer-friendly localized update
  app.post('/api/gemini/translate-update', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const technicalNote = sanitizeText(req.body?.technicalNote, 1500);
    const language = sanitizeText(req.body?.language, 8) || 'en';
    const stageLabel = sanitizeText(req.body?.stageLabel, 80);
    const vehicleLabel = sanitizeText(req.body?.vehicleLabel, 140);
    const estimatedCompletion = sanitizeText(req.body?.estimatedCompletion, 80);

    if (!technicalNote) {
      res.status(400).json({ error: 'technicalNote is required.' });
      return;
    }

    try {
      const targetLang = getLanguageName(language);
      const { response, model } = await generateContentWithFallback(ai, {
        contents: [
          `Vehicle: ${vehicleLabel || 'Not specified'}`,
          `Current Stage: ${stageLabel || 'Not specified'}`,
          `Estimated Completion: ${estimatedCompletion || 'Not specified'}`,
          `Technician Note: ${technicalNote}`,
          `Write a clear, calm, plain-language update for the vehicle owner in ${targetLang}.`,
        ].join('\n'),
        config: {
          systemInstruction:
            'You are an automotive service communication specialist for Service Status Companion. Translate technical dealership notes into plain, reassuring, customer-friendly updates in the requested language. Keep the response concise (2-4 sentences). STRICT RULE: Never invent repair costs, completion times, part prices, or vehicle conditions that are not explicitly given in the input. If a detail is not provided, omit it or state that the service advisor will confirm it.',
        },
      });

      const text = response.text?.trim();
      if (!text) {
        res.status(502).json({ error: 'Gemini returned an empty response.' });
        return;
      }

      res.json({
        customerUpdate: text,
        language,
        model,
      });
    } catch (err) {
      res.status(502).json({ error: formatGeminiError(err, 'Failed to generate customer update.') });
    }
  });

  // 2. Multilingual Customer AI Chat grounded strictly in the customer's repair order
  app.post('/api/gemini/chat', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const question = sanitizeText(req.body?.question, 1000);
    const language = sanitizeText(req.body?.language, 8) || 'en';
    const orderContext = req.body?.orderContext;
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];

    if (!question) {
      res.status(400).json({ error: 'question is required.' });
      return;
    }
    if (!orderContext || typeof orderContext !== 'object') {
      res.status(400).json({ error: 'orderContext is required to ground responses.' });
      return;
    }

    try {
      const targetLang = getLanguageName(language);
      const safeOrderJson = JSON.stringify(orderContext).slice(0, 12000);
      const historyLines = history
        .map((m: { role?: string; text?: string }) => {
          const role = m?.role === 'assistant' ? 'Assistant' : 'Customer';
          return `${role}: ${sanitizeText(m?.text, 500)}`;
        })
        .join('\n');

      const prompt = [
        'AUTHORITATIVE REPAIR ORDER DATA (ONLY SOURCE OF TRUTH):',
        safeOrderJson,
        historyLines ? `\nRECENT CONVERSATION:\n${historyLines}` : '',
        `\nCUSTOMER QUESTION: ${question}`,
        `\nRespond strictly in ${targetLang}.`,
      ].join('\n');

      const { response, model } = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction:
            'You are the Service Status Companion AI assistant helping a vehicle owner understand their active automotive repair order. Use ONLY the provided AUTHORITATIVE REPAIR ORDER DATA. STRICT GUARDRAILS: (1) Never invent or guess repair costs, completion times, technician diagnoses, warranty terms, or vehicle conditions not present in the JSON. (2) If the customer asks for information that is unavailable in the provided order data, clearly say that this information is not currently recorded on the repair order and recommend contacting their assigned Service Advisor. (3) Keep answers clear, polite, accurate, and concise in the requested language (English, Tamil, or Hindi).',
        },
      });

      const answer = response.text?.trim();
      if (!answer) {
        res.status(502).json({ error: 'Gemini returned an empty response.' });
        return;
      }

      res.json({
        answer,
        language,
        model,
      });
    } catch (err) {
      res.status(502).json({ error: formatGeminiError(err, 'Failed to answer question.') });
    }
  });

  // 3. Summarize inspection report and generate grounded maintenance recommendations
  app.post('/api/gemini/inspection-summary', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const orderContext = req.body?.orderContext;
    const language = sanitizeText(req.body?.language, 8) || 'en';
    if (!orderContext || typeof orderContext !== 'object') {
      res.status(400).json({ error: 'orderContext is required.' });
      return;
    }

    try {
      const targetLang = getLanguageName(language);
      const safeJson = JSON.stringify(orderContext).slice(0, 12000);
      const { response, model } = await generateContentWithFallback(ai, {
        contents: `Inspection & Repair Order Data:\n${safeJson}\n\nProduce a plain-language inspection summary and 3-5 grounded maintenance recommendations in ${targetLang}.`,
        config: {
          systemInstruction:
            'You summarize automotive dealership multi-point inspections for vehicle owners. Base your summary and maintenance recommendations strictly on the supplied inspection notes, checklist items, reported issues, and vehicle mileage. Never fabricate faults, prices, or completion dates not present in the data. If inspection notes are minimal, state what has been checked so far and what remains pending.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Plain-language summary of current inspection findings and repair status.',
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Actionable maintenance recommendations strictly grounded in the provided inspection data.',
              },
            },
            required: ['summary', 'recommendations'],
          },
        },
      });

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw) as { summary?: string; recommendations?: string[] };

      res.json({
        summary: parsed.summary || 'Inspection summary unavailable for the current data.',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 8) : [],
        language,
        model,
      });
    } catch (err) {
      res.status(502).json({ error: formatGeminiError(err, 'Failed to summarize inspection.') });
    }
  });

  // 4. SMS & WhatsApp notification delivery via Twilio (honest credential enforcement)
  app.post('/api/notifications/send', async (req, res) => {
    const channel = sanitizeText(req.body?.channel, 16);
    const to = sanitizeText(req.body?.to, 40);
    const message = sanitizeText(req.body?.message, 1200);

    if (!['sms', 'whatsapp', 'in_app'].includes(channel)) {
      res.status(400).json({ error: 'channel must be sms, whatsapp, or in_app.' });
      return;
    }
    if (!message) {
      res.status(400).json({ error: 'message is required.' });
      return;
    }

    if (channel === 'in_app') {
      res.json({
        configured: true,
        delivered: true,
        deliveryStatus: 'in_app_logged',
        providerMessage: 'Published to Customer Portal live timeline.',
      });
      return;
    }

    if (!to) {
      res.status(400).json({ error: 'Recipient phone number is required for SMS/WhatsApp.' });
      return;
    }

    const sid = process.env.TWILIO_ACCOUNT_SID?.trim() || '';
    const token = process.env.TWILIO_AUTH_TOKEN?.trim() || '';
    const fromNumber =
      channel === 'whatsapp'
        ? process.env.TWILIO_WHATSAPP_NUMBER?.trim() || ''
        : process.env.TWILIO_PHONE_NUMBER?.trim() || '';

    if (!sid || !token || !fromNumber) {
      res.json({
        configured: false,
        delivered: false,
        deliveryStatus: 'not_configured',
        providerMessage:
          channel === 'whatsapp'
            ? 'WhatsApp delivery is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in server environment variables.'
            : 'SMS delivery is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in server environment variables.',
      });
      return;
    }

    try {
      const formattedTo = channel === 'whatsapp' && !to.startsWith('whatsapp:') ? `whatsapp:${to}` : to;
      const formattedFrom =
        channel === 'whatsapp' && !fromNumber.startsWith('whatsapp:')
          ? `whatsapp:${fromNumber}`
          : fromNumber;

      const form = new URLSearchParams();
      form.append('To', formattedTo);
      form.append('From', formattedFrom);
      form.append('Body', message);

      const authHeader = Buffer.from(`${sid}:${token}`).toString('base64');
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;

      const twilioResp = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });

      const twilioData = (await twilioResp.json()) as { sid?: string; message?: string };

      if (!twilioResp.ok) {
        res.status(502).json({
          configured: true,
          delivered: false,
          deliveryStatus: 'failed',
          providerMessage: twilioData.message || `Twilio returned HTTP ${twilioResp.status}`,
        });
        return;
      }

      res.json({
        configured: true,
        delivered: true,
        deliveryStatus: 'delivered',
        providerMessage: `Delivered via Twilio (SID: ${twilioData.sid || 'confirmed'}).`,
      });
    } catch (err) {
      res.status(502).json({
        configured: true,
        delivered: false,
        deliveryStatus: 'failed',
        providerMessage: err instanceof Error ? err.message : 'Twilio request failed.',
      });
    }
  });

  if (IS_PRODUCTION) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Service Status Companion server listening on http://localhost:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
