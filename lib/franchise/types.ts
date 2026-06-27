export interface FranchiseInquiryInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  desiredTerritory: string;
  isGroomer: string;
  groomPlan: string;
  ownsVan: string;
  investmentCapital: string;
  interestedInFinancing: string;
  candidateType: string;
  timeline: string;
  interestReason: string;
}

export interface FranchiseInquiry extends FranchiseInquiryInput {
  id: string;
  submittedAt: string;
}

export interface FranchiseInquiriesData {
  inquiries: FranchiseInquiry[];
}
