import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

export interface NewsletterTemplateContext {
  subscriber?: {
    email?: string | null;
    name?: string | null;
    first_name?: string | null;
  };
  newsletter?: {
    id?: string;
    name?: string | null;
    slug?: string | null;
  };
  email?: {
    subject?: string | null;
    publish_date?: string | Date | null;
  };
  unsubscribe_url?: string | null;
}

const markdown = new Marked({ gfm: true, breaks: true });
markdown.use({
  walkTokens(token) {
    if (token.type === "text") {
      token.text = token.text
        .replace(/\.\.\./g, "…")
        .replace(/---/g, "—")
        .replace(/--/g, "–")
        .replace(/\b([\p{L}\p{N}]+)'([\p{L}\p{N}]+)\b/gu, "$1’$2");
    }
  },
});

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr",
  "strong", "b", "em", "i", "u", "s", "del", "sub", "sup",
  "ul", "ol", "li", "blockquote", "pre", "code", "a", "img",
  "table", "thead", "tbody", "tr", "th", "td", "div", "figure",
  "figcaption", "section", "span",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "target", "rel", "id"],
  img: ["src", "alt", "title", "width", "height"],
  "*": ["class", "id", "style"],
};

const SAFE_CSS_COLOR = /^(?!expression$|url$|inherit$|initial$|unset$|revert$)(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([\d.%\s,+-]+\)|[a-z]{1,24})$/i;
const SAFE_CSS_LENGTH = /^(?:0|\d{1,3}(?:\.\d{1,2})?(?:px|pt|em|rem|%))$/i;
const SAFE_CSS_SPACING = /^(?:0|\d{1,3}(?:\.\d{1,2})?(?:px|pt|em|rem|%))(?:\s+(?:0|\d{1,3}(?:\.\d{1,2})?(?:px|pt|em|rem|%))){0,3}$/i;
const SAFE_CSS_BORDER = /^(?:0|\d{1,3}(?:\.\d{1,2})?(?:px|pt))\s+(?:none|solid|dashed|dotted|double)\s+(?:#[\da-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([\d.%\s,+-]+\)|[a-z]{1,24})$/i;
const ALLOWED_STYLES: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": {
    color: [SAFE_CSS_COLOR],
    "background-color": [SAFE_CSS_COLOR],
    "font-size": [/^\d{1,3}(?:\.\d{1,2})?(?:px|pt|em|rem|%)$/i],
    "font-weight": [/^(?:normal|bold|[1-9]00)$/i],
    "font-style": [/^(?:normal|italic|oblique)$/i],
    "text-decoration": [/^(?:none|underline|overline|line-through)$/i],
    "text-align": [/^(?:left|right|center|justify|start|end)$/i],
    "line-height": [/^(?:normal|\d+(?:\.\d+)?(?:px|%|em|rem)?)$/i],
    display: [/^(?:inline|inline-block|block)$/i],
    padding: [SAFE_CSS_SPACING],
    "padding-top": [SAFE_CSS_LENGTH],
    "padding-right": [SAFE_CSS_LENGTH],
    "padding-bottom": [SAFE_CSS_LENGTH],
    "padding-left": [SAFE_CSS_LENGTH],
    "border-radius": [SAFE_CSS_SPACING],
    border: [SAFE_CSS_BORDER],
    "border-color": [SAFE_CSS_COLOR],
    "border-width": [SAFE_CSS_SPACING],
    "border-style": [/^(?:none|solid|dashed|dotted|double)$/i],
  },
};
function getValue(context: NewsletterTemplateContext, path: string): unknown {
  const parts = path.trim().split(".");
  let value: unknown = context;
  for (const part of parts) {
    if (!part || part === "__proto__" || part === "constructor") return undefined;
    if (!value || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

function resolveExpression(expression: string, context: NewsletterTemplateContext): unknown {
  const [path, ...filters] = expression.split("|").map((part) => part.trim());
  let value = getValue(context, path ?? "");

  for (const filter of filters) {
    const defaultMatch = filter.match(/^default\s*:\s*["']([\s\S]*)["']$/);
    if (defaultMatch) {
      if (value === undefined || value === null || value === "") value = defaultMatch[1];
      continue;
    }
    if (value === undefined || value === null) continue;
    const text = String(value);
    if (filter === "upper") value = text.toUpperCase();
    else if (filter === "lower") value = text.toLowerCase();
    else if (filter === "capfirst") value = text ? text[0]!.toUpperCase() + text.slice(1) : text;
    else if (filter === "urlencode") value = encodeURIComponent(text);
  }

  return value;
}

function evaluateCondition(condition: string, context: NewsletterTemplateContext): boolean {
  const comparison = condition.match(/^([\w.]+)\s*(==|!=)\s*["']([\s\S]*)["']$/);
  if (comparison) {
    const value = resolveExpression(comparison[1]!, context);
    const matches = String(value ?? "") === comparison[3];
    return comparison[2] === "==" ? matches : !matches;
  }

  const negated = condition.match(/^not\s+([\w.]+)$/);
  const value = resolveExpression(negated?.[1] ?? condition, context);
  const truthy = value !== undefined && value !== null && value !== "" && value !== false;
  return negated ? !truthy : truthy;
}

function renderTemplateConditionals(source: string, context: NewsletterTemplateContext): string {
  let rendered = source;
  const conditional = /\{%\s*if\s+([^%]+?)\s*%\}([\s\S]*?)(?:\{%\s*else\s*%\}([\s\S]*?))?\{%\s*endif\s*%\}/g;

  // Repeated passes resolve nested if/else blocks from the inside out.
  for (let pass = 0; pass < 12; pass++) {
    const next = rendered.replace(conditional, (_match, condition: string, truthy: string, falsy = "") =>
      evaluateCondition(condition.trim(), context) ? truthy : falsy,
    );
    if (next === rendered) break;
    rendered = next;
  }
  return rendered;
}

/** Render the deliberately small, safe Django-style subset used in newsletters. */
export function renderNewsletterTemplate(
  source: string,
  context: NewsletterTemplateContext = {},
): string {
  return renderTemplateConditionals(source, context).replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (match, expression: string) => {
      const value = resolveExpression(expression, context);
      return value === undefined || value === null ? match : String(value);
    },
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskCode(source: string) {
  const blocks: string[] = [];
  const masked = source.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\n]*`+)/g, (code) => {
    const token = `PENNAMARKDOWNCODE${blocks.length}TOKEN`;
    blocks.push(code);
    return token;
  });
  return {
    source: masked,
    restore: (text: string) => text.replace(/PENNAMARKDOWNCODE(\d+)TOKEN/g, (_match, index: string) => blocks[Number(index)] ?? ""),
  };
}

function extractFootnotes(source: string) {
  const lines = source.split("\n");
  const definitions = new Map<string, string>();
  const body: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const match = lines[index]!.match(/^\[\^([\w-]+)\]:\s*(.*)$/);
    if (!match) {
      body.push(lines[index]!);
      continue;
    }

    const chunks = [match[2]!];
    while (index + 1 < lines.length && /^(?: {2,}|\t)\S/.test(lines[index + 1]!)) {
      chunks.push(lines[++index]!.trim());
    }
    definitions.set(match[1]!, chunks.join(" "));
  }

  const order = [...definitions.keys()];
  const references = new Map<string, number>();
  const markdownBody = body.join("\n").replace(/\[\^([\w-]+)\]/g, (match, key: string) => {
    const noteIndex = order.indexOf(key);
    if (noteIndex < 0) return match;
    const reference = (references.get(key) ?? 0) + 1;
    references.set(key, reference);
    const id = `footnote-ref-${noteIndex + 1}-${reference}`;
    return `<sup id="${id}"><a href="#footnote-${noteIndex + 1}">${noteIndex + 1}</a></sup>`;
  });

  const footnotes = order.map((key, index) => {
    const note = markdown.parse(definitions.get(key) ?? "", { async: false }) as string;
    const backrefs = Array.from({ length: references.get(key) ?? 0 }, (_, refIndex) =>
      `<a href="#footnote-ref-${index + 1}-${refIndex + 1}" aria-label="Back to reference">↩</a>`,
    ).join(" ");
    return `<li id="footnote-${index + 1}">${note}${backrefs}</li>`;
  });

  return {
    body: markdownBody,
    html: footnotes.length
      ? `<section class="markdown-footnotes"><hr><ol>${footnotes.join("")}</ol></section>`
      : "",
  };
}

function transformSuperAndSubscript(source: string): string {
  return source
    .replace(/(^|[^~])~([^~\s](?:[^~]*?[^~\s])?)~(?!~)/g, "$1<sub>$2</sub>")
    .replace(/\^([^\s^](?:[^\s^]*?[^\s^])?)\^/g, "<sup>$1</sup>");
}

function extractEmbeds(source: string) {
  const embeds: string[] = [];
  const body = source.replace(/^\s*(https?:\/\/\S+)\s*$/gm, (line, rawUrl: string) => {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return line;
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const supported = ["youtube.com", "youtu.be", "vimeo.com", "spotify.com", "soundcloud.com", "bandcamp.com", "giphy.com", "x.com", "twitter.com", "instagram.com", "gist.github.com"];
    if (!supported.some((provider) => host === provider || host.endsWith(`.${provider}`))) return line;

    const safeUrl = escapeHtml(url.toString());
    const provider = host.includes("youtube") || host === "youtu.be" ? "YouTube"
      : host.includes("vimeo") ? "Vimeo"
      : host.includes("spotify") ? "Spotify"
      : host.includes("soundcloud") ? "SoundCloud"
      : host.includes("bandcamp") ? "Bandcamp"
      : host.includes("giphy") ? "GIPHY"
      : host.includes("instagram") ? "Instagram"
      : host.includes("gist.github") ? "GitHub Gist"
      : "X";
    const videoId = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") ?? url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/)?.[1];
    const thumbnail = videoId && provider === "YouTube" ? `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : null;
    const preview = thumbnail
      ? `<img src="${thumbnail}" alt="Video preview" style="max-width:100%;height:auto">`
      : "";
    const token = `PENNAEMBED${embeds.length}TOKEN`;
    embeds.push(`<figure class="markdown-embed"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${preview}<br>Open on ${provider}</a></figure>`);
    return token;
  });
  return { body, embeds };
}

/**
 * Render Markdown for a newsletter email or archive. Includes GitHub-flavored
 * Markdown, footnotes, sub/superscript, safe media link cards, and template
 * variable interpolation. Raw HTML is kept behind a strict sanitizer.
 */
export function renderNewsletterMarkdown(
  content: string,
  context: NewsletterTemplateContext = {},
): string {
  const code = maskCode(content);
  const templateValues: string[] = [];
  const conditioned = renderTemplateConditionals(code.source, context);
  const templated = conditioned.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, expression: string) => {
    const value = resolveExpression(expression, context);
    const token = `PENNATEMPLATEVALUE${templateValues.length}TOKEN`;
    templateValues.push(value === undefined || value === null ? match : String(value));
    return token;
  });
  const footnoteSource = extractFootnotes(templated);
  const superscripted = transformSuperAndSubscript(footnoteSource.body);
  const embedResult = extractEmbeds(superscripted);
  const sourceWithCode = code.restore(embedResult.body);
  const parsedBody = markdown.parse(sourceWithCode, { async: false }) as string;
  const rawBody = parsedBody.replace(/<input\b(?=[^>]*type="checkbox")[^>]*>/gi, (input) =>
    /\bchecked\b/i.test(input) ? "☑ " : "☐ ",
  );
  const rawFootnotes = code.restore(footnoteSource.html);
  let html = sanitizeHtml(`${rawBody}${rawFootnotes}`, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });

  embedResult.embeds.forEach((embed, index) => {
    html = html.replace(`PENNAEMBED${index}TOKEN`, embed);
  });
  html = html.replace(/PENNATEMPLATEVALUE(\d+)TOKEN/g, (_match, index: string) =>
    escapeHtml(templateValues[Number(index)] ?? ""),
  );

  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedStyles: ALLOWED_STYLES,
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}