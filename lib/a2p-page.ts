export const A2P_VERIFICATION_PATH = "/pet-grooming-services/pet-bathing-washing";

export function isA2PVerificationPage(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return normalized === A2P_VERIFICATION_PATH;
}
