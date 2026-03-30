import {access, mkdir, writeFile} from "fs/promises";
import path from "path";
import {fileURLToPath} from "url";

const IMAGE_EXTENSION_PATTERN = /\.(png|webp|jpe?g|gif|svg)$/i;
const IMAGES_OUTPUT_DIR = fileURLToPath(new URL("../../../../apps/web/public/images", import.meta.url));
const IMAGE_DOWNLOAD_MAX_ATTEMPTS = 4;
const IMAGE_DOWNLOAD_RETRY_DELAY_MS = 1500;

export interface ImageEntity {
  image: string;
}

/**
 * Normalize a wiki image URL to the direct asset URL.
 *
 * @param {string | undefined} imageUrl - Raw wiki image URL.
 * @returns {string | undefined} Direct image asset URL when one can be derived.
 */
export function normalizeWikiImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/images/")) {
    return imageUrl;
  }

  const url = new URL(imageUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  const thumbIndex = segments.indexOf("thumb");

  if (thumbIndex !== -1) {
    const directSegment = segments
      .slice(thumbIndex + 1)
      .find((segment) => IMAGE_EXTENSION_PATTERN.test(segment) && !/^\d+px-/i.test(segment));

    if (directSegment) {
      return `${url.origin}/images/${decodeURIComponent(directSegment)}`;
    }
  }

  const fileSegment = [...segments]
    .reverse()
    .find((segment) => IMAGE_EXTENSION_PATTERN.test(segment));
  if (!fileSegment) {
    return imageUrl;
  }

  const normalizedFileName = decodeURIComponent(fileSegment).replace(/^\d+px-/i, "");
  return `${url.origin}/images/${normalizedFileName}`;
}

/**
 * Convert a remote wiki image URL into a public app path for a given entity type.
 *
 * @param {string | undefined} imageUrl - Raw or normalized wiki image URL.
 * @param {string} type - Entity type folder name.
 * @returns {string | undefined} Public app image path for the entity type.
 */
export function toPublicImagePath(imageUrl: string | undefined, type: string): string | undefined {
  const normalizedImageUrl = normalizeWikiImageUrl(imageUrl);
  if (!normalizedImageUrl) {
    return normalizedImageUrl;
  }

  if (normalizedImageUrl.startsWith("/images/")) {
    const fileName = path.basename(normalizedImageUrl);
    return `/images/${type}/${fileName}`;
  }

  const fileName = path.basename(new URL(normalizedImageUrl).pathname);
  return `/images/${type}/${fileName}`;
}

/**
 * Download entity images into the public app folder and rewrite entity image paths.
 *
 * @param {T[]} entities - Scraped entities to localize.
 * @param {string} type - Entity type folder name.
 * @returns {Promise<void>} Resolves when entity images are written and paths updated.
 */
export async function localizeEntityImages<T extends ImageEntity>(entities: T[], type: string): Promise<void> {
  const outputDir = path.join(IMAGES_OUTPUT_DIR, type);
  await mkdir(outputDir, {recursive: true});

  for (const entity of entities) {
    const imageUrl = normalizeWikiImageUrl(entity.image);
    const publicImagePath = toPublicImagePath(imageUrl, type);
    if (!imageUrl || !publicImagePath) {
      continue;
    }

    if (!imageUrl.startsWith("/images/")) {
      const fileName = path.basename(new URL(imageUrl).pathname);
      const outputPath = path.join(outputDir, fileName);
      if (!(await fileExists(outputPath))) {
        const response = await fetchImageWithRetry(imageUrl);
        const buffer = Buffer.from(await response.arrayBuffer());
        await writeFile(outputPath, buffer);
      }
    }

    entity.image = publicImagePath;
  }
}

async function fetchImageWithRetry(imageUrl: string): Promise<Response> {
  for (let attempt = 1; attempt <= IMAGE_DOWNLOAD_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch(imageUrl);
    if (response.ok) {
      return response;
    }

    if (response.status !== 429 || attempt === IMAGE_DOWNLOAD_MAX_ATTEMPTS) {
      throw new Error(`Failed to download image: ${imageUrl} (${response.status})`);
    }

    await delay(IMAGE_DOWNLOAD_RETRY_DELAY_MS * attempt);
  }

  throw new Error(`Failed to download image: ${imageUrl}`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
