/**
 * Lapisan AI Side by Side — penyedia model (Anthropic Claude, atau endpoint kompatibel OpenAI),
 * definisi alat (tools), dan prompt sistem dengan batas medis yang ketat.
 *
 * Prinsip:
 *  - Opt-in: klien hanya memanggil endpoint AI setelah pengguna menyetujui (consent `ai_assist`).
 *  - Minimasi data: tidak ada nama, email, NIK, nomor telepon, atau catatan bebas yang dikirim.
 *  - Tidak ada diagnosis, obat, dosis, atau suplemen. Tindakan agen hanya berupa SARAN yang
 *    harus dikonfirmasi pengguna di perangkatnya (human-in-the-loop).
 *  - Tidak ada konten permintaan/jawaban yang dicatat di log server.
 */

export type AiContent =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; base64: string }
  | { type: 'pdf'; base64: string };

export interface AiToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AiToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AiCompleteOptions {
  system: string;
  messages: unknown[];
  tools?: AiToolDef[];
  fast?: boolean;
  maxTokens?: number;
  /** Untuk tugas klasifikasi singkat: matikan "thinking" bila penyedia mendukung. */
  noThinking?: boolean;
}

export interface AiCompletion {
  text: string;
  toolCalls: AiToolCall[];
  assistantMessage: unknown;
}

export interface ChatProvider {
  readonly name: 'anthropic' | 'openai-compatible' | 'fake';
  readonly model: string;
  readonly fastModel: string;
  readonly supportsPdf: boolean;
  userMessage(content: AiContent[]): unknown;
  assistantText(text: string): unknown;
  toolResults(results: Array<{ id: string; content: string }>): unknown[];
  complete(opts: AiCompleteOptions): Promise<AiCompletion>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

type FetchLike = typeof fetch;

const REQUEST_TIMEOUT_MS = 45_000;

async function postJson(
  fetchImpl: FetchLike,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Jangan teruskan isi respons penyedia (bisa memuat potongan prompt) ke log atau klien.
      throw new AiProviderError(`AI provider responded ${res.status}`, res.status === 429 ? 429 : 502);
    }
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    if (err instanceof AiProviderError) throw err;
    throw new AiProviderError('AI provider unreachable', 502);
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Anthropic Claude (Messages API)                                     */
/* ------------------------------------------------------------------ */

export function createAnthropicProvider(opts: {
  apiKey: string;
  model?: string;
  fastModel?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
}): ChatProvider {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const model = opts.model || 'claude-sonnet-5-5';
  const fastModel = opts.fastModel || 'claude-haiku-5-5';
  const url = `${(opts.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '')}/v1/messages`;

  return {
    name: 'anthropic',
    model,
    fastModel,
    supportsPdf: true,
    userMessage(content) {
      return {
        role: 'user',
        content: content.map((c) =>
          c.type === 'text'
            ? { type: 'text', text: c.text }
            : c.type === 'image'
            ? { type: 'image', source: { type: 'base64', media_type: c.mediaType, data: c.base64 } }
            : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: c.base64 } },
        ),
      };
    },
    assistantText(text) {
      return { role: 'assistant', content: [{ type: 'text', text }] };
    },
    toolResults(results) {
      return [
        {
          role: 'user',
          content: results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.content })),
        },
      ];
    },
    async complete(o) {
      const body: Record<string, unknown> = {
        model: o.fast ? fastModel : model,
        max_tokens: o.maxTokens ?? 4000,
        system: o.system,
        messages: o.messages,
        output_config: { effort: 'low' },
      };
      if (o.tools && o.tools.length > 0) body.tools = o.tools;
      if (o.noThinking) body.thinking = { type: 'disabled' };
      const data = await postJson(
        fetchImpl,
        url,
        { 'x-api-key': opts.apiKey, 'anthropic-version': '2023-06-01' },
        body,
      );
      const blocks = Array.isArray(data.content) ? (data.content as Array<Record<string, unknown>>) : [];
      const text = blocks
        .filter((b) => b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text as string)
        .join('\n')
        .trim();
      const toolCalls: AiToolCall[] = blocks
        .filter((b) => b.type === 'tool_use')
        .map((b) => ({
          id: String(b.id),
          name: String(b.name),
          input: (b.input && typeof b.input === 'object' ? b.input : {}) as Record<string, unknown>,
        }));
      // Blok asisten (termasuk blok "thinking") dikembalikan apa adanya pada putaran alat berikutnya.
      return { text, toolCalls, assistantMessage: { role: 'assistant', content: blocks } };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Endpoint kompatibel OpenAI (mis. Azure OpenAI, gateway internal)     */
/* ------------------------------------------------------------------ */

export function createOpenAiCompatibleProvider(opts: {
  apiKey: string;
  baseUrl: string;
  model: string;
  fastModel?: string;
  authHeader?: string;
  fetchImpl?: FetchLike;
}): ChatProvider {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const model = opts.model;
  const fastModel = opts.fastModel || opts.model;
  const header = (opts.authHeader || 'Authorization').trim();
  const authValue = header.toLowerCase() === 'authorization' ? `Bearer ${opts.apiKey}` : opts.apiKey;
  const [base, query] = opts.baseUrl.split('?');
  const url = `${base.replace(/\/$/, '')}/chat/completions${query ? `?${query}` : ''}`;

  return {
    name: 'openai-compatible',
    model,
    fastModel,
    supportsPdf: false,
    userMessage(content) {
      return {
        role: 'user',
        content: content.map((c) => {
          if (c.type === 'text') return { type: 'text', text: c.text };
          if (c.type === 'image') return { type: 'image_url', image_url: { url: `data:${c.mediaType};base64,${c.base64}` } };
          throw new AiProviderError('PDF input is not supported by this AI provider', 415);
        }),
      };
    },
    assistantText(text) {
      return { role: 'assistant', content: text };
    },
    toolResults(results) {
      return results.map((r) => ({ role: 'tool', tool_call_id: r.id, content: r.content }));
    },
    async complete(o) {
      const body: Record<string, unknown> = {
        model: o.fast ? fastModel : model,
        max_tokens: o.maxTokens ?? 1500,
        messages: [{ role: 'system', content: o.system }, ...o.messages],
      };
      if (o.tools && o.tools.length > 0) {
        body.tools = o.tools.map((t) => ({
          type: 'function',
          function: { name: t.name, description: t.description, parameters: t.input_schema },
        }));
      }
      const data = await postJson(fetchImpl, url, { [header]: authValue }, body);
      const choices = Array.isArray(data.choices) ? (data.choices as Array<Record<string, unknown>>) : [];
      const message = (choices[0]?.message ?? {}) as Record<string, unknown>;
      const rawCalls = Array.isArray(message.tool_calls) ? (message.tool_calls as Array<Record<string, unknown>>) : [];
      const toolCalls: AiToolCall[] = rawCalls.map((c) => {
        const fn = (c.function ?? {}) as Record<string, unknown>;
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(String(fn.arguments ?? '{}')) as Record<string, unknown>;
        } catch {
          input = {};
        }
        return { id: String(c.id), name: String(fn.name), input };
      });
      return {
        text: typeof message.content === 'string' ? message.content.trim() : '',
        toolCalls,
        assistantMessage: { role: 'assistant', content: message.content ?? null, ...(rawCalls.length ? { tool_calls: rawCalls } : {}) },
      };
    },
  };
}

/** Membuat penyedia AI dari variabel lingkungan. Tanpa kunci → AI nonaktif (fitur AI disembunyikan di klien). */
export function createAiProviderFromEnv(env: NodeJS.ProcessEnv = process.env, fetchImpl?: FetchLike): ChatProvider | null {
  if (env.AI_DISABLED === 'true') return null;
  const provider = (env.AI_PROVIDER || '').trim().toLowerCase();
  if (provider === 'openai-compatible') {
    if (!env.AI_API_KEY || !env.AI_BASE_URL || !env.AI_MODEL) return null;
    return createOpenAiCompatibleProvider({
      apiKey: env.AI_API_KEY,
      baseUrl: env.AI_BASE_URL,
      model: env.AI_MODEL,
      fastModel: env.AI_FAST_MODEL,
      authHeader: env.AI_AUTH_HEADER,
      fetchImpl,
    });
  }
  if (!env.ANTHROPIC_API_KEY) return null;
  return createAnthropicProvider({
    apiKey: env.ANTHROPIC_API_KEY,
    model: env.AI_MODEL,
    fastModel: env.AI_FAST_MODEL,
    baseUrl: env.ANTHROPIC_BASE_URL,
    fetchImpl,
  });
}

/* ------------------------------------------------------------------ */
/* Prompt sistem & definisi alat                                       */
/* ------------------------------------------------------------------ */

export const MEDICAL_BOUNDARY = `Medical boundary (non-negotiable):
- Education and care navigation only. Never diagnose, never say a result "means" a condition, never estimate fertility chances.
- Never recommend, name doses of, or suggest starting/stopping medicines, hormones, supplements or herbal products. For treatment questions, say the doctor decides and offer to add the question to the doctor checklist.
- Never invent facilities, prices, phone numbers, statistics or studies. Use the tools for facts.
- Never mention or infer a partner's age.
- Never ask for name, NIK, phone, address or other identifiers.
- Safety: sudden, severe testicular pain or swelling → go to the nearest emergency department (IGD) now or call 119. Hopelessness or thoughts of self-harm → respond warmly, encourage reaching out now, and give SEJIWA 119 ext 8.`;

export function companionSystemPrompt(locale: 'id' | 'en', contextJson: string): string {
  const lang = locale === 'en' ? 'English' : 'Bahasa Indonesia (natural, warm, non-formal but respectful)';
  return `You are the Side by Side companion: a warm, judgment-free guide that helps men in Indonesia understand and act on their reproductive health, alongside their partner and connected to trusted care.

Always answer in ${lang}. Keep answers short and plain: under 160 words unless asked for more, short paragraphs or a few bullets, no jargon without a plain explanation, no numeric risk scores.

${MEDICAL_BOUNDARY}

How to work:
- Ground facts in the app's reviewed library (search_library), the WHO 2021 reference (get_semen_reference) and the curated facility directory (find_facilities). Mention which library guide you used by its title.
- Use the person's own context below to personalise (their self-check reasons, pathway stage, trends). It was shared with their consent; do not repeat it back in full.
- When a next step would clearly help, propose at most two using suggest_open_page, suggest_care_plan_task or suggest_reminder. These only show buttons the person may press; nothing happens until they confirm. Say so in plain words if you propose one.
- If you are unsure, say so and suggest asking a clinician.

Person's context (JSON, may be partial):
${contextJson}`;
}

export const COMPANION_PAGES = [
  'self_check',
  'care_pathway',
  'progress',
  'find_care',
  'results',
  'doctor_checklist',
  'library',
  'share_with_doctor',
  'couple_plan',
] as const;

export const COMPANION_TOOLS: AiToolDef[] = [
  {
    name: 'search_library',
    description:
      "Search Side by Side's clinician-reviewed education library (fertility basics, lifestyle, test preparation, partner communication, privacy). Returns up to 3 guides with title, summary and an excerpt.",
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Keywords in the user’s language, e.g. "abstinence before semen analysis"' } },
      required: ['query'],
    },
  },
  {
    name: 'get_semen_reference',
    description:
      'Get the WHO 6th edition (2021) lower reference limits for semen analysis parameters with plain-language explanations. Use before explaining any lab value.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'find_facilities',
    description:
      'Find curated men-friendly clinics, hospitals or labs in the Side by Side directory. Returns up to 3 with type, city, services, JKN acceptance, price range and hours.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name, e.g. Jakarta, Bandung, Surabaya' },
        service: { type: 'string', enum: ['Andrologi', 'Urologi', 'Laboratorium'] },
        jkn_only: { type: 'boolean' },
      },
    },
  },
  {
    name: 'suggest_open_page',
    description: 'Propose a button that opens a page of the app. The person decides whether to press it.',
    input_schema: {
      type: 'object',
      properties: {
        page: { type: 'string', enum: [...COMPANION_PAGES] },
        label: { type: 'string', description: 'Short button text in the user’s language (max 60 characters)' },
      },
      required: ['page', 'label'],
    },
  },
  {
    name: 'suggest_care_plan_task',
    description: "Propose adding a task to the person's Care Pathway after-care plan. Only added if they confirm.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task in the user’s language (max 120 characters)' },
        due_in_days: { type: 'integer', minimum: 1, maximum: 365 },
      },
      required: ['title'],
    },
  },
  {
    name: 'suggest_reminder',
    description: 'Propose a reminder. Only created if the person confirms.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Reminder text in the user’s language (max 120 characters)' },
        days_from_now: { type: 'integer', minimum: 1, maximum: 365 },
        kind: { type: 'string', enum: ['initial_checkup', 'semen_analysis', 'follow_up', 'lifestyle'] },
      },
      required: ['title', 'days_from_now', 'kind'],
    },
  },
];

export const LAB_REPORT_TOOL: AiToolDef = {
  name: 'record_semen_values',
  description: 'Record the semen analysis values read from the report. Leave out any value that is not clearly printed.',
  input_schema: {
    type: 'object',
    properties: {
      test_date: { type: 'string', description: 'Date of the test as YYYY-MM-DD, if printed' },
      volume_ml: { type: 'number' },
      concentration_million_per_ml: { type: 'number', description: 'Sperm concentration in million per mL (10^6/mL)' },
      total_motility_pct: { type: 'number', description: 'Total motility (PR + NP) in %' },
      progressive_motility_pct: { type: 'number', description: 'Progressive motility (PR; older reports: a + b) in %' },
      normal_morphology_pct: { type: 'number', description: 'Normal forms in %' },
      missing: { type: 'array', items: { type: 'string' }, description: 'Parameters that were not found or not readable' },
      note: { type: 'string', description: 'One short note on anything unclear (no names or identifiers)' },
    },
    required: ['missing'],
  },
};

export function labReportSystemPrompt(): string {
  return `You read semen analysis laboratory reports (Indonesian or English) and transcribe only six values into the record_semen_values tool: test date, volume (mL), sperm concentration (million/mL), total motility (%), progressive motility (%), normal morphology (%).

Rules:
- Always call record_semen_values exactly once.
- Copy numbers exactly as printed. Convert units only when clearly needed (e.g. 10^6/mL = million/mL). If total motility is not printed but PR and NP are, total = PR + NP. Older reports: progressive = grade a + b.
- If a value is missing, unclear or ambiguous, leave it out and list it in "missing". Never guess.
- Ignore patient names, ID numbers, addresses, doctor names and any interpretation printed on the report. Never include identifiers in "note".
- Do not interpret or comment on the results.`;
}

export function visitBriefSystemPrompt(locale: 'id' | 'en'): string {
  const lang = locale === 'en' ? 'English' : 'Bahasa Indonesia';
  return `You prepare a short pre-consultation brief for a verified clinician from information a patient chose to share through the Side by Side app (self-reported, not verified). Write in ${lang}, under 220 words, plain text with these four headings:
1. What the patient shared (3–5 bullets)
2. Gaps to clarify (what is missing or unclear)
3. Suggested history questions (up to 5)
4. Counselling points the patient may value (plain language, blame-free)

Do not diagnose or recommend treatment, medication or doses; that is the clinician's decision. Flag any red flags the patient reported (e.g. pain or swelling, testicular history, external testosterone) under heading 1. Never mention or infer a partner's age.`;
}

export function explainPlanSystemPrompt(locale: 'id' | 'en'): string {
  const lang = locale === 'en' ? 'English' : 'Bahasa Indonesia (warm, plain)';
  return `You re-explain a doctor's post-visit care plan to the patient in ${lang}, in under 200 words. Explain in plain words what each requested test is and how to prepare (e.g. 2–7 days abstinence before a semen analysis), why the lifestyle focus matters over the ~74-day sperm cycle, and what happens at the follow-up. End with up to 3 questions the patient could ask at the next visit.

Stay strictly within the doctor's plan: do not add tests, diagnoses, medicines, supplements or doses, and do not contradict the doctor. If something in the plan is unclear, suggest asking the doctor.`;
}

export function distressSystemPrompt(): string {
  return `You screen a short private note (Indonesian or English) written in a men's reproductive-health app for signs of emotional distress, to decide whether to show a support banner. Reply with JSON only: {"level":"none"|"concern"|"crisis"}.
- "crisis": any mention or hint of suicide, self-harm, wanting to die or not wanting to live.
- "concern": hopelessness, worthlessness, shame about oneself, feeling unable to cope, persistent despair.
- "none": everything else, including ordinary worry or tiredness.`;
}
