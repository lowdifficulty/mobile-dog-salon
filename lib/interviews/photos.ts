import "server-only";
import { randomUUID } from "crypto";
import type { GroomPhoto } from "./types";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTOS_PER_APPLICATION = 10;

const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_PHOTO_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

export function validateGroomPhoto(file: unknown): Omit<GroomPhoto, "id" | "uploadedAt"> {
  if (!file || typeof file !== "object") {
    throw new Error("Invalid photo payload.");
  }

  const { fileName, mimeType, dataBase64 } = file as Record<string, unknown>;
  if (
    typeof fileName !== "string" ||
    typeof mimeType !== "string" ||
    typeof dataBase64 !== "string"
  ) {
    throw new Error("Photo must include file name, type, and file data.");
  }

  const trimmedName = fileName.trim();
  if (!trimmedName || !ALLOWED_PHOTO_EXTENSIONS.test(trimmedName)) {
    throw new Error("Photos must be JPEG, PNG, or WebP.");
  }

  if (!ALLOWED_PHOTO_TYPES.has(mimeType)) {
    throw new Error("Photos must be JPEG, PNG, or WebP.");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(dataBase64, "base64");
  } catch {
    throw new Error("Could not read photo file.");
  }

  if (bytes.length === 0) {
    throw new Error("Photo file is empty.");
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    throw new Error("Each photo must be 5 MB or smaller.");
  }

  return {
    fileName: trimmedName,
    mimeType,
    dataBase64,
  };
}

export function validateGroomPhotoBatch(
  photos: unknown,
  existingCount: number
): Omit<GroomPhoto, "id" | "uploadedAt">[] {
  if (!Array.isArray(photos) || photos.length === 0) {
    throw new Error("Please upload at least one groom photo.");
  }

  if (existingCount + photos.length > MAX_PHOTOS_PER_APPLICATION) {
    throw new Error(`You can upload up to ${MAX_PHOTOS_PER_APPLICATION} photos total.`);
  }

  return photos.map((photo) => validateGroomPhoto(photo));
}

export function groomPhotosFromValidated(
  validated: Omit<GroomPhoto, "id" | "uploadedAt">[]
): GroomPhoto[] {
  const now = new Date().toISOString();
  return validated.map((photo) => ({
    ...photo,
    id: randomUUID(),
    uploadedAt: now,
  }));
}
