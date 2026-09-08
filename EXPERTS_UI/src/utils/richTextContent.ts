const HTML_TAG_RE = /<\/?[a-z][\s\S]*?>/i;

/** True when content appears to contain HTML markup (e.g. from a rich-text editor). */
export function looksLikeHtml(value: string): boolean {
    return HTML_TAG_RE.test(value.trim());
}

/** Strip tags and entities to get visible text length. */
export function stripHtmlToText(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function isRichTextEmpty(value: string): boolean {
    return !stripHtmlToText(value);
}
