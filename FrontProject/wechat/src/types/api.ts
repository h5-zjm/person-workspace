export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type NewsItem = { id: string; type: string; title: string; publishedAt: string };
export type HomeData = {
  marketOverview: {
    listedCompanyCount: number;
    monthlyNewCount: number;
    totalFinancingAmount: number;
    totalFinancingUnit: string;
    updatedAt: string;
  };
  featuredProjects: Array<{
    id: string;
    name: string;
    industry: string;
    badges: string[];
    financingAmount: number;
    financingUnit: string;
    region: string;
  }>;
  news: { announcements: NewsItem[]; disclosures: NewsItem[]; policies: NewsItem[] };
};

export type MarketData = {
  overview: { listedCompanyCount: number; weeklyNewCount: number; todayDisclosureCount: number; updatedAt: string };
  total: number;
  page: number;
  size: number;
  items: Array<{
    id: string;
    shortName: string;
    listingCode: string;
    listingStatus: string;
    industry: string;
    region: string;
    companyLevel: string;
    latestDisclosureDate: string;
  }>;
};

export type ProjectStatus = "ALL" | "FUNDRAISING" | "ROADSHOW" | "ENDED";
export type ProjectsData = {
  counts: { all: number; fundraising: number; roadshow: number; ended: number };
  featuredCampaign: { id: string; title: string; projectCount: number };
  total: number;
  page: number;
  size: number;
  items: Array<{
    id: string;
    title: string;
    status: Exclude<ProjectStatus, "ALL">;
    industry: string;
    region: string;
    financingAmount: number;
    financingUnit: string;
    tags: string[];
    intentCount: number | null;
    nextRoadshowAt: string | null;
  }>;
};

export type ProfileData = {
  user: { id: string; avatarUrl: string; displayName: string; maskedMobile: string; qualifiedInvestorStatus: string };
  counts: { followedCompanyCount: number; favoriteProjectCount: number; businessApplicationCount: number };
  accountStatuses: {
    realNameStatus: string;
    suitabilityValidUntil: string | null;
    listingApplicationStatus: string | null;
    financingDraftCount: number;
  };
  notificationUnread: boolean;
};
