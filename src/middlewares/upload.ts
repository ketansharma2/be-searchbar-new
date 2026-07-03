import multer from 'multer';
import type { Request } from 'express';
import { ApiError } from '../utils/ApiError';

// Files are held in memory (Buffer) so we can push straight to S3 / parse
// spreadsheets without touching local disk.
const storage = multer.memoryStorage();

function fileFilter(allowed: RegExp, label: string) {
  return (
    _req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ): void => {
    if (allowed.test(file.originalname) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest(`Invalid file type. Expected ${label}.`));
    }
  };
}

/** Single PDF under field `resume` (manual candidate add), max 10 MB. */
export const uploadResume = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(/\.pdf$|application\/pdf/i, 'a PDF'),
}).single('resume');

/** Single spreadsheet under field `file` (bulk upload), max 20 MB. */
export const uploadSpreadsheet = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: fileFilter(
    /\.(xlsx|csv)$|spreadsheetml|text\/csv|application\/vnd\.ms-excel/i,
    'an .xlsx or .csv file'
  ),
}).single('file');
