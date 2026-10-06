
export const BUCKET = 'submission-photos';

/**
 * @type {Record<string, string>}
 */
export const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_FILES = 5;