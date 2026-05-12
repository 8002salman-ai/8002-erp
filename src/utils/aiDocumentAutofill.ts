type AutofillContext = 'sales' | 'purchases' | 'inventory';

type AutofillFieldValue = string | number | null | undefined;
type AutofillResult = Record<string, AutofillFieldValue>;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS = [
  'openrouter/auto',
  'meta-llama/llama-3.2-11b-vision-instruct:free',
  'qwen/qwen2.5-vl-32b-instruct:free',
];

const CONTEXT_SCHEMAS: Record<AutofillContext, string> = {
  sales: JSON.stringify(
    {
      date: 'YYYY-MM-DD',
      productName: 'string',
      orderNumber: 'string',
      customerName: 'string',
      customerAddress: 'string',
      trackingNumber: 'string',
      quantity: 'number',
      saleAmount: 'number',
      productCost: 'number',
      marketplaceFee: 'number',
      salesTax: 'number',
      shippingCost: 'number',
      notes: 'string',
    },
    null,
    2
  ),
  purchases: JSON.stringify(
    {
      date: 'YYYY-MM-DD',
      productName: 'string',
      supplier: 'string',
      invoiceNumber: 'string',
      quantity: 'number',
      unitCost: 'number',
      shippingCost: 'number',
      importFees: 'number',
      otherCharges: 'number',
      notes: 'string',
    },
    null,
    2
  ),
  inventory: JSON.stringify(
    {
      productName: 'string',
      sku: 'string',
      category: 'string',
      brand: 'string',
      supplier: 'string',
      color: 'string',
      size: 'string',
      weight: 'string',
      dimensions: 'string',
      upc: 'string',
      asin: 'string',
      costPerUnit: 'number',
      currentStock: 'number',
      notes: 'string',
    },
    null,
    2
  ),
};

function extractJsonObject(raw: string): AutofillResult | null {
  const normalized = raw.trim();
  const fenced = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : normalized;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonSlice = candidate.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(jsonSlice);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as AutofillResult;
  } catch {
    return null;
  }
}

function sanitizeFields(result: AutofillResult): AutofillResult {
  const sanitized: AutofillResult = {};
  for (const [key, value] of Object.entries(result)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue;
      sanitized[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;
      sanitized[key] = trimmed;
    }
  }
  return sanitized;
}

export async function extractAutofillFromDocument(file: File, context: AutofillContext): Promise<AutofillResult> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('AI autofill unavailable. Please add VITE_OPENROUTER_API_KEY and try again.');
  }
  const normalizedKey = apiKey.trim();
  if (!normalizedKey || /\s/.test(normalizedKey)) {
    throw new Error('OpenRouter key format invalid. Remove spaces and try again.');
  }

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');

  if (!isImage && !isPdf) {
    throw new Error('Only image or PDF files are supported.');
  }

  if (isPdf) {
    throw new Error('PDF auto-extraction is currently unavailable. Please enter data manually.');
  }

  const base64DataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read selected file.'));
    reader.readAsDataURL(file);
  });

  const systemPrompt =
    'You extract structured accounting form data from uploaded bills/invoices/receipts. ' +
    'Return JSON only. If data is missing or unclear, set value to null. Never hallucinate.';

  const userPrompt =
    `Extract fields for "${context}" form. Return ONLY a JSON object with this schema:\n` +
    `${CONTEXT_SCHEMAS[context]}\n\n` +
    'Rules:\n' +
    '- Keep numeric values as numbers (no currency symbols).\n' +
    '- Use YYYY-MM-DD for dates where possible.\n' +
    '- Keep unknown fields as null.\n' +
    '- No explanation text.';

  let lastError = 'AI service request failed. Please enter data manually.';
  const modelErrors: string[] = [];

  for (const model of OPENROUTER_MODELS) {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${normalizedKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Embani Accounting System',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: base64DataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      let errorText = '';
      try {
        const errorJson = (await response.json()) as { error?: { message?: string } };
        errorText = errorJson.error?.message || '';
      } catch {
        errorText = await response.text();
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('OpenRouter API key invalid or blocked. Please check key and credits.');
      }

      lastError = errorText
        ? `AI request failed (${response.status}): ${errorText}`
        : `AI request failed (${response.status}).`;
      modelErrors.push(`${model} -> ${lastError}`);
      continue;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    };

    const rawContent = payload.choices?.[0]?.message?.content;
    const textContent =
      typeof rawContent === 'string'
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent
              .filter((part) => part?.type === 'text' && typeof part.text === 'string')
              .map((part) => part.text as string)
              .join('\n')
          : '';

    const parsed = extractJsonObject(textContent);
    if (!parsed) {
      lastError = 'AI could not understand this file. Please enter data manually.';
      modelErrors.push(`${model} -> ${lastError}`);
      continue;
    }

    return sanitizeFields(parsed);
  }
  const unavailableFreeEndpoint = modelErrors.some((e) => e.toLowerCase().includes('no endpoints found'));
  if (unavailableFreeEndpoint) {
    throw new Error('Free AI endpoint temporarily unavailable on OpenRouter. Please try again in a few minutes or use another key.');
  }
  throw new Error(lastError);
}
