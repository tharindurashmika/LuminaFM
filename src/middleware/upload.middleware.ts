import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'logos');

// Ensure destination folder exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const orgId = req.tenantContext?.organizationId || 'org';
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `logo-${orgId}-${uniqueSuffix}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

export const uploadLogo = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, SVG, GIF`));
    }
  },
});

const ATTACHMENTS_DIR = path.resolve(process.cwd(), 'uploads', 'attachments');

if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

const attachmentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ATTACHMENTS_DIR);
  },
  filename: (req, file, cb) => {
    const orgId = req.tenantContext?.organizationId || 'org';
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `evidence-${orgId}-${safeBase}-${uniqueSuffix}${ext}`);
  },
});

const allowedAttachmentMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
]);

export const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for maintenance evidence photos & docs
  },
  fileFilter: (_req, file, cb) => {
    if (allowedAttachmentMimeTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported evidence file type: ${file.mimetype}. Allowed: Images (JPEG, PNG, WebP, GIF, SVG), PDF, TXT, CSV, JSON`
        )
      );
    }
  },
});


