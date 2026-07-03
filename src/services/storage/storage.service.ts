/**
 * Storage abstraction. Keeps the ingestion code decoupled from the concrete
 * provider (S3 today) so it can be swapped/mocked without touching callers.
 */
export interface UploadParams {
  buffer: Buffer;
  contentType: string;
  /** Logical folder/prefix, e.g. "resumes". */
  keyPrefix: string;
  /** Original filename (used to derive extension + a readable key). */
  filename: string;
}

export interface UploadResult {
  key: string;
  url: string;
}

export interface StorageService {
  upload(params: UploadParams): Promise<UploadResult>;
}
