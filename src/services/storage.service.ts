import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export interface StorageUploadResult {
  uri: string;
  absolutePath: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

export interface IObjectStorageService {
  uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    subfolder?: string,
    tenantId?: string
  ): Promise<StorageUploadResult>;
  deleteFile(fileUri: string): Promise<boolean>;
  fileExists(fileUri: string): Promise<boolean>;
  getAbsolutePath(fileUri: string): string;
}

const ALLOWED_LOGO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Secure Object Storage Service with path traversal defense, MIME whitelisting,
 * collision-resistant unique key generation, and replacement cleanup.
 */
export class LocalObjectStorageService implements IObjectStorageService {
  private readonly rootDir: string;

  constructor(customRootDir?: string) {
    this.rootDir = path.resolve(
      customRootDir || process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
    );

    if (!fs.existsSync(this.rootDir)) {
      fs.mkdirSync(this.rootDir, { recursive: true });
    }
  }

  /**
   * Uploads and stores a file with strict security sanitization and directory confinement.
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    subfolder: string = 'logos',
    tenantId?: string
  ): Promise<StorageUploadResult> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw { status: 400, code: 'EMPTY_FILE', message: 'Uploaded file cannot be empty' };
    }

    if (fileBuffer.length > MAX_LOGO_SIZE_BYTES) {
      throw {
        status: 400,
        code: 'FILE_TOO_LARGE',
        message: `File exceeds maximum allowed size of ${MAX_LOGO_SIZE_BYTES / (1024 * 1024)}MB`,
      };
    }

    const normalizedMime = mimeType.toLowerCase().trim();
    if (!ALLOWED_LOGO_MIME_TYPES.has(normalizedMime)) {
      throw {
        status: 400,
        code: 'INVALID_MIME_TYPE',
        message: `Unsupported file type: ${mimeType}. Allowed types: JPEG, PNG, WebP, SVG, GIF`,
      };
    }

    // Sanitize subfolder to prevent directory traversal
    const cleanSubfolder = subfolder.replace(/[^a-zA-Z0-9_-]/g, '');
    const targetDir = path.join(this.rootDir, cleanSubfolder);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Determine safe extension
    const extRaw = path.extname(originalName).toLowerCase();
    const safeExt = extRaw.replace(/[^a-zA-Z0-9.]/g, '') || this.mimeToExtension(normalizedMime);

    // Collision-resistant filename: <prefix>-<tenantId>-<timestamp>-<randomHash><ext>
    const tenantPrefix = tenantId ? tenantId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36) : 'global';
    const randomHash = crypto.randomBytes(8).toString('hex');
    const fileName = `logo-${tenantPrefix}-${Date.now()}-${randomHash}${safeExt}`;

    const absolutePath = path.join(targetDir, fileName);

    // Strict boundary check: absolutePath MUST stay within targetDir
    const normalizedTargetDir = path.resolve(targetDir).toLowerCase();
    const normalizedAbsPath = path.resolve(absolutePath).toLowerCase();
    if (!normalizedAbsPath.startsWith(normalizedTargetDir)) {
      throw {
        status: 403,
        code: 'PATH_TRAVERSAL_DETECTED',
        message: 'Security violation: Out-of-bounds file storage target',
      };
    }

    await fs.promises.writeFile(absolutePath, fileBuffer);

    const uri = `/uploads/${cleanSubfolder}/${fileName}`;

    return {
      uri,
      absolutePath,
      fileName,
      fileSizeBytes: fileBuffer.length,
      mimeType: normalizedMime,
    };
  }

  /**
   * Safely deletes a file from object storage, enforcing directory confinement.
   */
  async deleteFile(fileUri: string): Promise<boolean> {
    if (!fileUri) return false;

    try {
      const absolutePath = this.getAbsolutePath(fileUri);
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether a file exists in object storage.
   */
  async fileExists(fileUri: string): Promise<boolean> {
    if (!fileUri) return false;
    try {
      const absolutePath = this.getAbsolutePath(fileUri);
      return fs.existsSync(absolutePath);
    } catch {
      return false;
    }
  }

  /**
   * Normalizes a public URI into an absolute disk path while defending against path traversal.
   */
  getAbsolutePath(fileUri: string): string {
    const rawUri = String(fileUri || '').trim();
    // Strip leading /uploads/ or /
    const relative = rawUri
      .replace(/^\/+/, '')
      .replace(/^uploads[\\\/]/i, '');

    const resolved = path.resolve(this.rootDir, relative);
    const normalizedRoot = this.rootDir.toLowerCase();
    const normalizedTarget = resolved.toLowerCase();

    if (!normalizedTarget.startsWith(normalizedRoot)) {
      throw {
        status: 403,
        code: 'PATH_TRAVERSAL_DETECTED',
        message: 'Security violation: Attempted access outside upload storage directory',
      };
    }

    return resolved;
  }

  private mimeToExtension(mime: string): string {
    switch (mime) {
      case 'image/png':
        return '.png';
      case 'image/jpeg':
        return '.jpg';
      case 'image/webp':
        return '.webp';
      case 'image/svg+xml':
        return '.svg';
      case 'image/gif':
        return '.gif';
      default:
        return '.bin';
    }
  }
}

export const objectStorageService = new LocalObjectStorageService();

