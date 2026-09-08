/**
 * Build full public media URLs (CloudFront / uploads) for API responses.
 */

const MEDIA_IMG_PATHS = {
    property: 'img/property',
    project: 'img/project',
    agent: 'img/agents',
    agency: 'img/agency',
    location: 'img/agents',
    award: 'img/award',
};

const getCloudfrontRoot = () => {
    const fromEnv =
        process.env.AWS_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL || '';
    if (fromEnv) return String(fromEnv).replace(/\/$/, '');
    return 'https://d1dp1oh0ra5b0z.cloudfront.net';
};

const getUploadsRoot = () =>
    String(
        process.env.PUBLIC_UPLOADS_URL ||
            process.env.UPLOADS_BASE_URL ||
            'http://localhost:5000/uploads',
    ).replace(/\/$/, '');

/**
 * @param {string|null|undefined} value - filename or partial path
 * @param {'property'|'project'|'agent'|'agency'|'location'|'award'} [mediaType]
 * @returns {string|null}
 */
const buildMediaImageUrl = (value, mediaType = 'property') => {
    if (value == null) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const normalized = trimmed.replace(/^\//, '');
    const segment = MEDIA_IMG_PATHS[mediaType] || MEDIA_IMG_PATHS.property;

    const useCloudfront =
        process.env.AWS_CLOUDFRONT_URL ||
        process.env.CLOUDFRONT_URL ||
        process.env.STORAGE_TYPE === 's3' ||
        !process.env.STORAGE_TYPE;

    if (useCloudfront) {
        const root = getCloudfrontRoot();
        if (normalized.startsWith('img/')) {
            return `${root}/${normalized}`;
        }
        return `${root}/${segment}/${normalized}`;
    }

    const uploadsRoot = getUploadsRoot();
    if (normalized.startsWith('img/')) {
        return `${uploadsRoot}/${normalized}`;
    }
    return `${uploadsRoot}/${segment}/${normalized}`;
};

module.exports = {
    buildMediaImageUrl,
    buildPropertyImageUrl: (value) => buildMediaImageUrl(value, 'property'),
    buildProjectImageUrl: (value) => buildMediaImageUrl(value, 'project'),
    buildAgentImageUrl: (value) => buildMediaImageUrl(value, 'agent'),
    buildLocationImageUrl: (value) => buildMediaImageUrl(value, 'location'),
    buildAwardImageUrl: (value) => buildMediaImageUrl(value, 'award'),
};
