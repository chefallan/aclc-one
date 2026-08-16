import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { v2 as cloudinary } from "cloudinary";

export type ImageVariant = "thumb" | "full";

export interface StoredObject {
  /** Provider-side identifier. This is what belongs in the database. */
  key: string;
}

export interface FetchedObject {
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  upload(buffer: Buffer, filename: string, mimeType: string): Promise<StoredObject>;
  /**
   * Reads the object back through the server.
   *
   * Photo delivery deliberately streams through our own authenticated route
   * rather than handing a provider URL to the browser: a signed URL is a bearer
   * token, and these are photographs of students. Keeping the bytes behind our
   * session check means there is no link to leak in the first place.
   */
  fetch(key: string, variant?: ImageVariant): Promise<FetchedObject>;
  delete(key: string): Promise<void>;
}

const THUMB_WIDTH = 400;

/** Local disk. Development only — see getStorageProvider(). */
class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), "uploads");
  }

  private pathFor(key: string): string {
    // Keys are generated UUIDs, but this is defence in depth against a key that
    // ever reaches here from user input and tries to climb out of the directory.
    const safe = path.basename(key);
    return path.join(this.basePath, safe);
  }

  async upload(buffer: Buffer, filename: string, mimeType: string): Promise<StoredObject> {
    const ext = path.extname(filename) || mimeExtension(mimeType);
    const key = `${uuidv4()}${ext}`;

    if (!existsSync(this.basePath)) {
      await mkdir(this.basePath, { recursive: true });
    }

    await writeFile(this.pathFor(key), buffer);
    return { key };
  }

  async fetch(key: string): Promise<FetchedObject> {
    const body = await readFile(this.pathFor(key));
    return { body, contentType: mimeFromExtension(path.extname(key)) };
  }

  async delete(key: string): Promise<void> {
    const target = this.pathFor(key);
    if (existsSync(target)) await unlink(target);
  }
}

class CloudinaryStorageProvider implements StorageProvider {
  private folder: string;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET"
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.folder = process.env.CLOUDINARY_FOLDER || "aclc-one/evidence";
  }

  async upload(buffer: Buffer, filename: string, mimeType: string): Promise<StoredObject> {
    const result = await new Promise<{ public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: this.folder,
          // `authenticated` is the whole point. The default (`upload`) puts the
          // asset on a permanent public URL, which is exactly what we must not
          // do with photographs of students.
          type: "authenticated",
          resource_type: mimeType.startsWith("image/") ? "image" : "raw",
          // Keep EXIF on the asset. We also read it server-side before upload,
          // because Cloudinary strips metadata on some transformations.
          image_metadata: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error ?? new Error("Cloudinary upload returned no result"));
            return;
          }
          resolve(uploaded as { public_id: string });
        }
      );
      stream.end(buffer);
    });

    return { key: result.public_id };
  }

  async fetch(key: string, variant: ImageVariant = "full"): Promise<FetchedObject> {
    const url = cloudinary.url(key, {
      type: "authenticated",
      sign_url: true,
      secure: true,
      // q_auto/f_auto do the compression the brief asks for without a sharp
      // pipeline; the thumb variant is what list views request.
      transformation:
        variant === "thumb"
          ? [{ width: THUMB_WIDTH, crop: "fill", quality: "auto", fetch_format: "auto" }]
          : [{ quality: "auto", fetch_format: "auto" }],
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Cloudinary fetch failed for ${key}: ${response.status}`);
    }

    const body = Buffer.from(await response.arrayBuffer());
    return {
      body,
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key, { type: "authenticated", invalidate: true });
  }
}

function mimeExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
  };
  return map[mimeType] ?? ".bin";
}

function mimeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

let cached: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;

  const provider = process.env.STORAGE_PROVIDER || "local";

  switch (provider) {
    case "cloudinary":
      cached = new CloudinaryStorageProvider();
      break;
    case "local":
      // Local disk is not durable across container restarts and has no
      // redundancy. Refusing it in production is deliberate: the previous
      // implementation silently accepted an unconfigured provider and dropped
      // uploads on the floor.
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "STORAGE_PROVIDER=local is not permitted in production. Configure Cloudinary."
        );
      }
      cached = new LocalStorageProvider();
      break;
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER "${provider}". Supported providers: cloudinary, local.`
      );
  }

  return cached;
}
