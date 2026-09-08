import { apiClient } from "./apiClient";

export type DashboardStatCard = {
  title: string;
  value: string;
  growth: string;
  growthUp: boolean;
  cardBg: string;
  iconBg: string;
};

export type DashboardChartSeries = {
  name: string;
  data: number[];
};

export type DashboardActionItem = {
  title: string;
  value: number;
  path: string;
};

export type DashboardRecentActivity = {
  id: string;
  action: string;
  actorType: string;
  resourceType: string;
  createdAt?: string;
};

export type DashboardOverview = {
  statCards: DashboardStatCard[];
  platformGrowth: {
    categories: string[];
    series: DashboardChartSeries[];
  };
  userDistribution: {
    labels: string[];
    series: number[];
  };
  listingsByType: {
    categories: string[];
    series: DashboardChartSeries[];
  };
  reportsMonthly: {
    categories: string[];
    series: DashboardChartSeries[];
  };
  cmsActivity: {
    labels: string[];
    series: number[];
  };
  actionQueue: DashboardActionItem[];
  inquiriesOverview: {
    categories: string[];
    series: DashboardChartSeries[];
  };
  recentActivity: DashboardRecentActivity[];
};

export const dashboardService = {
  getOverview(signal?: AbortSignal) {
    return apiClient.get<DashboardOverview>("/dashboard", { auth: true, signal });
  },
};
