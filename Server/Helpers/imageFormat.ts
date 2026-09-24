/**
 * The format image bytes actually are, whatever the provider called them.
 *
 * Providers disagree on what they return and some mislabel it, so the type is
 * read from the bytes and used for both the stored Content-Type and the file
 * extension.
 */
export function imageFormat(buffer: Buffer): 'jpeg' | 'png' | 'webp' {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buffer.length >= 12
    && buffer[0] === 0x52
    && buffer[1] === 0x49
    && buffer[2] === 0x46
    && buffer[3] === 0x46
  ) {
    return 'webp';
  }
  return 'png';
}

export function imageContentType(buffer: Buffer): string {
  return `image/${imageFormat(buffer)}`;
}

export function imageExtension(buffer: Buffer): string {
  const format = imageFormat(buffer);
  return format === 'jpeg' ? 'jpg' : format;
}
