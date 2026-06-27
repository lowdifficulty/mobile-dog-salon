import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function FranchiseIconChart(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 3 3 5-6" />
    </IconBase>
  );
}

export function FranchiseIconSavings(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </IconBase>
  );
}

export function FranchiseIconVan(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 18H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h10l4 4v8a2 2 0 0 1-2 2h-2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
      <path d="M14 6v4h4" />
    </IconBase>
  );
}

export function FranchiseIconTraining(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
    </IconBase>
  );
}

export function FranchiseIconMegaphone(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11 12v5a3 3 0 0 0 5.2 2.1" />
    </IconBase>
  );
}

export function FranchiseIconTech(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </IconBase>
  );
}

export function FranchiseIconBrand(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3l7 4v10l-7 4-7-4V7z" />
      <path d="M12 12 19 7M12 12v9M12 12 5 7" />
    </IconBase>
  );
}

export function FranchiseIconSearch(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function FranchiseIconCommunity(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function FranchiseIconRetention(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  );
}

export function FranchiseIconRouting(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="5" r="2" />
      <path d="M8 19h5a4 4 0 0 0 4-4V9" />
    </IconBase>
  );
}

export const FRANCHISE_ICON_MAP = {
  chart: FranchiseIconChart,
  savings: FranchiseIconSavings,
  van: FranchiseIconVan,
  training: FranchiseIconTraining,
  megaphone: FranchiseIconMegaphone,
  tech: FranchiseIconTech,
  brand: FranchiseIconBrand,
  search: FranchiseIconSearch,
  community: FranchiseIconCommunity,
  retention: FranchiseIconRetention,
  routing: FranchiseIconRouting,
} as const;

export type FranchiseIconName = keyof typeof FRANCHISE_ICON_MAP;
