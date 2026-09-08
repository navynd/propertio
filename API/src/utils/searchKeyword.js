/**
 * Escape a string for safe use inside a MongoDB $regex (literal match of user text).
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function regexCond(escapedLiteral) {
  return { $regex: escapedLiteral, $options: 'i' };
}

/**
 * Property listing free-text search: title, description, slug, location fields.
 * @param {string} trimmed - non-empty trimmed user string
 * @returns {{ $or: object[] }|null}
 */
function buildPropertyKeywordOr(trimmed) {
  const esc = escapeRegex(trimmed);
  if (!esc) return null;
  const r = () => regexCond(esc);
  return {
    $or: [
      { title: r() },
      { description: r() },
      { slug: r() },
      { 'location.fullAddress': r() },
      { 'location.city': r() },
      { 'location.zone': r() },
      { 'location.building': r() },
    ],
  };
}

/**
 * Project free-text search: name, slug, copy, location fields.
 * @param {string} trimmed - non-empty trimmed user string
 * @returns {{ $or: object[] }|null}
 */
function buildProjectKeywordOr(trimmed) {
  const esc = escapeRegex(trimmed);
  if (!esc) return null;
  const r = () => regexCond(esc);
  return {
    $or: [
      { projectName: r() },
      { slug: r() },
      { description: r() },
      { aboutProject: r() },
      { 'location.address': r() },
      { 'location.city': r() },
      { 'location.zone': r() },
    ],
  };
}

module.exports = {
  escapeRegex,
  buildPropertyKeywordOr,
  buildProjectKeywordOr,
};
