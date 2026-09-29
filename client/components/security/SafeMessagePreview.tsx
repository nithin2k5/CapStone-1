"use client";

interface SafeMessagePreviewProps {
  html?: string | null;
  text?: string | null;
  className?: string;
}

/**
 * Renders a message body without giving it the analyst's session.
 *
 * The body is hostile input by definition — this screen exists to look at mail
 * someone was suspicious enough to quarantine. Injecting it into the dashboard's
 * own document, as this preview previously did, hands any sender script
 * execution in the session of the person reviewing their attack.
 *
 * So the body goes into an iframe with an empty `sandbox`, which is the maximal
 * restriction: no scripts, no same-origin access, no forms, no popups, no
 * navigation of the parent. Script in the body is inert rather than filtered,
 * which is the stronger guarantee — a sanitiser is a list of what someone
 * thought of, and this file's whole subject is adversaries who write around
 * lists.
 *
 * A Content-Security-Policy inside the frame blocks every network fetch. That is
 * not belt-and-braces: remote images in mail are tracking pixels, and loading
 * one would tell the sender their message reached a human and was opened for
 * review. Data-URI images still render, so the layout mostly survives.
 *
 * Links render but do not navigate. The URLs worth acting on are listed
 * separately, already scored.
 */
export function SafeMessagePreview({
  html,
  text,
  className,
}: SafeMessagePreviewProps) {
  const looksLikeMarkup =
    !html && !!text?.trim().startsWith("<") && text.includes(">");
  const markup = html || (looksLikeMarkup ? text : null);

  if (!markup) {
    return (
      <pre className={`whitespace-pre-wrap font-sans text-sm ${className ?? ""}`}>
        {text || "No preview available for this email."}
      </pre>
    );
  }

  return (
    <iframe
      // An empty sandbox keeps every restriction on. Adding allow-scripts or
      // allow-same-origin to this frame would undo the isolation entirely.
      sandbox=""
      referrerPolicy="no-referrer"
      title="Message preview, isolated"
      className={`w-full h-[600px] border-0 bg-white ${className ?? ""}`}
      srcDoc={buildPreviewDocument(markup)}
    />
  );
}

function buildPreviewDocument(body: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; media-src data:; font-src data:; form-action 'none'; base-uri 'none'">
    <style>
      html, body {
        margin: 0;
        padding: 24px;
        background: #ffffff;
        color: #111111;
        font: 14px/1.6 ui-sans-serif, system-ui, -apple-system, sans-serif;
        overflow-wrap: break-word;
      }
      img { max-width: 100%; height: auto; }
      table { max-width: 100%; }
      /* Inert: a preview of a phishing message should not be one click from
         following it. */
      a { color: #1a4fd6; text-decoration: underline; pointer-events: none; }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}
