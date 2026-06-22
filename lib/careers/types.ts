export interface JobApplicationResume {
  fileName: string;
  mimeType: string;
  dataBase64: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  resume?: JobApplicationResume;
  submittedAt: string;
}

export interface JobApplicationsData {
  applications: JobApplication[];
}

export interface JobApplicationInput {
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  resume?: JobApplicationResume;
}
