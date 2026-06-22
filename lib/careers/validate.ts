import { JOB_OPENINGS } from "@/lib/page-content";
import type { JobApplicationInput, JobApplicationResume } from "./types";

const MAX_RESUME_BYTES = 3 * 1024 * 1024;
const ALLOWED_RESUME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_RESUME_EXTENSIONS = /\.(pdf|doc|docx)$/i;

export function isKnownJobId(jobId: string): boolean {
  return JOB_OPENINGS.some((job) => job.id === jobId);
}

export function jobTitleForId(jobId: string): string | null {
  return JOB_OPENINGS.find((job) => job.id === jobId)?.title ?? null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

export function validateResume(resume: unknown): JobApplicationResume | undefined {
  if (resume == null) return undefined;
  if (typeof resume !== "object") {
    throw new Error("Invalid resume payload.");
  }

  const { fileName, mimeType, dataBase64 } = resume as Record<string, unknown>;
  if (
    typeof fileName !== "string" ||
    typeof mimeType !== "string" ||
    typeof dataBase64 !== "string"
  ) {
    throw new Error("Resume must include file name, type, and file data.");
  }

  const trimmedName = fileName.trim();
  if (!trimmedName || !ALLOWED_RESUME_EXTENSIONS.test(trimmedName)) {
    throw new Error("Resume must be a PDF or Word document (.pdf, .doc, .docx).");
  }

  if (!ALLOWED_RESUME_TYPES.has(mimeType)) {
    throw new Error("Resume must be a PDF or Word document.");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(dataBase64, "base64");
  } catch {
    throw new Error("Could not read resume file.");
  }

  if (bytes.length === 0) {
    throw new Error("Resume file is empty.");
  }
  if (bytes.length > MAX_RESUME_BYTES) {
    throw new Error("Resume must be 3 MB or smaller.");
  }

  return {
    fileName: trimmedName,
    mimeType,
    dataBase64,
  };
}

export function validateJobApplicationInput(body: unknown): JobApplicationInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid application.");
  }

  const raw = body as Record<string, unknown>;
  const jobId = String(raw.jobId ?? "").trim();
  const jobTitle = String(raw.jobTitle ?? "").trim();
  const fullName = String(raw.fullName ?? "").trim();
  const email = String(raw.email ?? "").trim();
  const phone = String(raw.phone ?? "").trim();
  const message = String(raw.message ?? "").trim();

  if (!jobId || !isKnownJobId(jobId)) {
    throw new Error("Please select a valid position.");
  }

  const expectedTitle = jobTitleForId(jobId);
  if (!expectedTitle || jobTitle !== expectedTitle) {
    throw new Error("Position details do not match.");
  }

  if (fullName.length < 2) {
    throw new Error("Please enter your full name.");
  }
  if (!isValidEmail(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!isValidPhone(phone)) {
    throw new Error("Please enter a valid phone number.");
  }
  if (message.length < 20) {
    throw new Error("Please include a short introduction (at least 20 characters).");
  }

  const resume = validateResume(raw.resume);

  return {
    jobId,
    jobTitle: expectedTitle,
    fullName,
    email,
    phone,
    message,
    resume,
  };
}
