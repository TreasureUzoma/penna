/**
 * Appends a "Powered by Penna" footer to outgoing newsletter HTML.
 * Pro/enterprise projects can opt out via project settings (see
 * `canRemoveBranding` in services/projects.ts, which is the source of
 * truth gate — this function just does the wrapping).
 */
export const applyBranding = (html: string, removeBranding: boolean): string => {
  if (removeBranding) return html;

  const footer = `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-family:sans-serif;font-size:12px;color:#9ca3af;">
      Powered by <a href="https://penna.dev" style="color:#9ca3af;text-decoration:underline;">Penna</a>
    </div>
  `;

  return `${html}${footer}`;
};

/**
 * Appends a visible "Unsubscribe" link to outgoing newsletter HTML.
 * Unlike `applyBranding`, this one is never optional/removable — it's a
 * legal requirement (CAN-SPAM, GDPR) and the fallback for mail clients
 * that don't surface the `List-Unsubscribe` header as a native button
 * (see lib/list-unsubscribe.ts, which builds the matching header pair).
 */
export const appendUnsubscribeFooter = (
  html: string,
  unsubscribeUrl: string
): string => {
  const footer = `
    <div style="margin-top:12px;padding-top:12px;text-align:center;font-family:sans-serif;font-size:12px;color:#9ca3af;">
      <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
    </div>
  `;

  return `${html}${footer}`;
};
