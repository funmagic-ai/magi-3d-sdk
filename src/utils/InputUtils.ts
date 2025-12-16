/**
 * @module utils/InputUtils
 * @description Utilities for handling image input formats (URL or base64)
 */

/**
 * Enum representing the detected type of image input.
 *
 * @remarks
 * The SDK supports two input formats for image-to-3D generation:
 * - `URL` - HTTP/HTTPS URL pointing to an image
 * - `BASE64` - Base64-encoded image data (with or without data URI prefix)
 */
export enum InputType {
  /** HTTP/HTTPS URL (e.g., "https://example.com/image.jpg") */
  URL = 'URL',
  /** Base64-encoded image data */
  BASE64 = 'BASE64',
  /** Unknown or unsupported input type */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Utility for handling and validating image input formats.
 *
 * @remarks
 * The SDK accepts two input formats for image-to-3D generation:
 * - **URL**: A publicly accessible HTTP/HTTPS URL
 * - **Base64**: Base64-encoded image data (with or without `data:image/...;base64,` prefix)
 *
 * For file uploads, upload to cloud storage (e.g., S3, COS) first and use the URL.
 *
 * @example
 * ```typescript
 * // URL input
 * const type = InputUtils.detect('https://example.com/cat.jpg');
 * // Returns: InputType.URL
 *
 * // Base64 input (with data URI prefix)
 * const type = InputUtils.detect('data:image/png;base64,iVBORw0KGgo...');
 * // Returns: InputType.BASE64
 *
 * // Base64 input (raw)
 * const type = InputUtils.detect('iVBORw0KGgoAAAANSUhEUgAA...');
 * // Returns: InputType.BASE64
 * ```
 */
export const InputUtils = {
  /**
   * Detects the type of image input.
   *
   * @param input - The raw input string (URL or base64)
   * @returns The detected {@link InputType}
   *
   * @example
   * ```typescript
   * InputUtils.detect('https://example.com/image.jpg'); // InputType.URL
   * InputUtils.detect('data:image/png;base64,iVBOR...'); // InputType.BASE64
   * ```
   */
  detect(input: string): InputType {
    if (typeof input !== 'string' || input.length === 0) {
      return InputType.UNKNOWN;
    }

    // URL detection (HTTP/HTTPS)
    if (/^https?:\/\//i.test(input)) {
      return InputType.URL;
    }

    // Base64 with data URI prefix
    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(input)) {
      return InputType.BASE64;
    }

    // Raw base64 detection (valid base64 characters, reasonable length for an image)
    // Minimum ~100 chars for a tiny image, check for valid base64 pattern
    if (input.length >= 100 && /^[A-Za-z0-9+/]+=*$/.test(input)) {
      return InputType.BASE64;
    }

    return InputType.UNKNOWN;
  },

  /**
   * Checks if the input is a valid URL.
   *
   * @param input - The input string to check
   * @returns `true` if the input is a valid HTTP/HTTPS URL
   */
  isUrl(input: string): boolean {
    return this.detect(input) === InputType.URL;
  },

  /**
   * Checks if the input is base64-encoded data.
   *
   * @param input - The input string to check
   * @returns `true` if the input is base64-encoded
   */
  isBase64(input: string): boolean {
    return this.detect(input) === InputType.BASE64;
  },

  /**
   * Extracts the raw base64 data from a data URI.
   *
   * @param input - Base64 string (with or without data URI prefix)
   * @returns The raw base64 data without the `data:image/...;base64,` prefix
   *
   * @example
   * ```typescript
   * InputUtils.extractBase64('data:image/png;base64,iVBOR...');
   * // Returns: 'iVBOR...'
   *
   * InputUtils.extractBase64('iVBOR...');
   * // Returns: 'iVBOR...' (unchanged)
   * ```
   */
  extractBase64(input: string): string {
    return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '');
  },

  /**
   * Validates that the input is a supported format (URL or base64).
   *
   * @param input - The input to validate
   * @returns `true` if the input is a valid URL or base64 string
   * @throws Error if the input is not a supported format
   *
   * @example
   * ```typescript
   * InputUtils.validate('https://example.com/image.jpg'); // true
   * InputUtils.validate('invalid'); // throws Error
   * ```
   */
  validate(input: string): boolean {
    const type = this.detect(input);
    if (type === InputType.UNKNOWN) {
      throw new Error(
        'Invalid image input. Expected a URL (https://...) or base64-encoded image data. ' +
        'For file uploads, please upload to cloud storage first and provide the URL.'
      );
    }
    return true;
  }
};
