import type { ApiResponse, HomeData, MarketData, ProfileData, ProjectsData, ProjectStatus } from "@/types/api";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080";

type QueryValue = string | number | undefined;

function request<T>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
  const queryString = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${apiBaseUrl}${path}${queryString ? `?${queryString}` : ""}`,
      method: "GET",
      success(response: UniNamespace.RequestSuccessCallbackResult) {
        const body = response.data as ApiResponse<T>;
        if (response.statusCode >= 200 && response.statusCode < 300 && body.code === 0) {
          resolve(body.data);
          return;
        }
        reject(new Error(body?.message || "请求失败"));
      },
      fail(error: UniNamespace.GeneralCallbackResult) {
        reject(new Error(error.errMsg || "网络连接失败"));
      }
    });
  });
}

export const getHome = () => request<HomeData>("/api/v1/home");

export const getMarket = (query: {
  keyword?: string;
  industry?: string;
  region?: string;
  companyLevel?: string;
  page?: number;
  size?: number;
}) => request<MarketData>("/api/v1/market", query);

export const getProjects = (query: {
  keyword?: string;
  status?: ProjectStatus;
  industry?: string;
  region?: string;
  financingScale?: string;
  page?: number;
  size?: number;
}) => request<ProjectsData>("/api/v1/projects", query);

export const getProfile = () => request<ProfileData>("/api/v1/profile");
