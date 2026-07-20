package com.personworkspace.equity.service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.function.Predicate;

import org.springframework.stereotype.Service;

@Service
public class EquityDataService {
    private static final List<Company> COMPANIES = List.of(
        new Company("company-128", "智造新材", "Q000128", "已挂牌", "先进制造", "杭州", "创新层", "2026-05-20"),
        new Company("company-116", "云链科技", "Q000116", "已挂牌", "企业服务", "宁波", "培育层", "2026-05-18"),
        new Company("company-098", "绿源生物", "Q000098", "已挂牌", "生物医药", "绍兴", "展示层", "2026-05-16"),
        new Company("company-087", "数智云科", "Q000087", "已挂牌", "数字经济", "杭州", "创新层", "2026-05-12"),
        new Company("company-076", "清能动力", "Q000076", "已挂牌", "绿色能源", "嘉兴", "培育层", "2026-05-09")
    );

    private static final List<Project> PROJECTS = List.of(
        new Project("project-001", "智造新材 A轮融资", "FUNDRAISING", "先进制造", "杭州", new BigDecimal("3000"), "万元", List.of("已认证", "材料已披露"), 12, null),
        new Project("project-002", "云链科技股权融资", "ROADSHOW", "企业服务", "宁波", new BigDecimal("1800"), "万元", List.of("材料已披露"), null, "2026-05-28 14:00"),
        new Project("project-003", "绿源生物战略融资", "FUNDRAISING", "生物医药", "绍兴", new BigDecimal("5000"), "万元", List.of("专精特新", "已认证"), 8, null),
        new Project("project-004", "数智云科天使轮融资", "ENDED", "数字经济", "杭州", new BigDecimal("1200"), "万元", List.of("材料已披露"), 15, null),
        new Project("project-005", "清能动力产业融资", "ROADSHOW", "绿色能源", "嘉兴", new BigDecimal("4200"), "万元", List.of("已认证"), null, "2026-06-02 10:00")
    );

    public HomeData home() {
        var news = new NewsGroups(
            List.of(
                new NewsItem("notice-001", "公告", "关于新增挂牌企业名单的公告", "2026-05-20"),
                new NewsItem("notice-002", "报告", "2026年第二季度市场运行报告", "2026-05-15"),
                new NewsItem("notice-003", "指南", "企业挂牌业务办理指引更新", "2026-05-10")
            ),
            List.of(
                new NewsItem("disclosure-001", "披露", "智造新材股份变动信息披露", "2026-05-20"),
                new NewsItem("disclosure-002", "披露", "云链科技年度报告摘要", "2026-05-18")
            ),
            List.of(
                new NewsItem("policy-001", "政策", "区域性股权市场创新发展指引", "2026-05-12"),
                new NewsItem("policy-002", "政策", "专精特新企业融资支持政策解读", "2026-05-08")
            )
        );
        return new HomeData(
            new HomeOverview(128, 12, new BigDecimal("36.8"), "亿元", "09:30"),
            List.of(
                new FeaturedProject("project-001", "智造新材", "先进制造", List.of("已认证"), new BigDecimal("3000"), "万元", "杭州"),
                new FeaturedProject("project-002", "云链科技", "企业服务", List.of("材料已披露"), new BigDecimal("1800"), "万元", "宁波")
            ),
            news
        );
    }

    public MarketData market(String keyword, String industry, String region, String companyLevel, int page, int size) {
        Predicate<Company> filter = company -> contains(company.shortName(), keyword) || contains(company.listingCode(), keyword);
        filter = optional(filter, industry, company -> company.industry().equals(industry));
        filter = optional(filter, region, company -> company.region().equals(region));
        filter = optional(filter, companyLevel, company -> company.companyLevel().equals(companyLevel));
        List<Company> matched = COMPANIES.stream()
            .filter(filter)
            .sorted(Comparator.comparing(Company::latestDisclosureDate).reversed())
            .toList();
        int total = isBlank(keyword) && isBlank(industry) && isBlank(region) && isBlank(companyLevel) ? 128 : matched.size();
        return new MarketData(new MarketOverview(128, 4, 6, "09:30"), total, page, size, page(matched, page, size));
    }

    public ProjectsData projects(String keyword, String status, String industry, String region, String financingScale, int page, int size) {
        Predicate<Project> filter = project -> contains(project.title(), keyword);
        if (!isBlank(status) && !"ALL".equalsIgnoreCase(status)) {
            filter = filter.and(project -> project.status().equalsIgnoreCase(status));
        }
        filter = optional(filter, industry, project -> project.industry().equals(industry));
        filter = optional(filter, region, project -> project.region().equals(region));
        if (!isBlank(financingScale)) {
            filter = filter.and(project -> inScale(project.financingAmount(), financingScale));
        }
        List<Project> matched = PROJECTS.stream().filter(filter).toList();
        int total = aggregateProjectTotal(keyword, status, industry, region, financingScale, matched.size());
        return new ProjectsData(
            new ProjectCounts(26, 18, 5, 3),
            new FeaturedCampaign("campaign-001", "专精特新企业融资专场", 6),
            total,
            page,
            size,
            page(matched, page, size)
        );
    }

    public ProfileData profile() {
        return new ProfileData(
            new ProfileUser("user-001", "", "张先生", "138****6628", "COMPLETED"),
            new ProfileCounts(5, 3, 2),
            new AccountStatuses("COMPLETED", "2027-05-20", "REVIEWING", 1),
            true
        );
    }

    private static int aggregateProjectTotal(String keyword, String status, String industry, String region, String scale, int fallback) {
        if (!isBlank(keyword) || !isBlank(industry) || !isBlank(region) || !isBlank(scale)) return fallback;
        if (isBlank(status) || "ALL".equalsIgnoreCase(status)) return 26;
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "FUNDRAISING" -> 18;
            case "ROADSHOW" -> 5;
            case "ENDED" -> 3;
            default -> fallback;
        };
    }

    private static boolean inScale(BigDecimal amount, String scale) {
        return switch (scale) {
            case "BELOW_2000" -> amount.compareTo(new BigDecimal("2000")) < 0;
            case "2000_TO_5000" -> amount.compareTo(new BigDecimal("2000")) >= 0 && amount.compareTo(new BigDecimal("5000")) <= 0;
            case "ABOVE_5000" -> amount.compareTo(new BigDecimal("5000")) > 0;
            default -> true;
        };
    }

    private static boolean contains(String source, String keyword) {
        return isBlank(keyword) || source.toLowerCase(Locale.ROOT).contains(keyword.trim().toLowerCase(Locale.ROOT));
    }

    private static <T> Predicate<T> optional(Predicate<T> base, String value, Predicate<T> extra) {
        return isBlank(value) ? base : base.and(extra);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static <T> List<T> page(List<T> values, int page, int size) {
        int from = Math.min((page - 1) * size, values.size());
        int to = Math.min(from + size, values.size());
        return values.subList(from, to);
    }

    public record HomeOverview(int listedCompanyCount, int monthlyNewCount, BigDecimal totalFinancingAmount, String totalFinancingUnit, String updatedAt) {}
    public record FeaturedProject(String id, String name, String industry, List<String> badges, BigDecimal financingAmount, String financingUnit, String region) {}
    public record NewsItem(String id, String type, String title, String publishedAt) {}
    public record NewsGroups(List<NewsItem> announcements, List<NewsItem> disclosures, List<NewsItem> policies) {}
    public record HomeData(HomeOverview marketOverview, List<FeaturedProject> featuredProjects, NewsGroups news) {}
    public record MarketOverview(int listedCompanyCount, int weeklyNewCount, int todayDisclosureCount, String updatedAt) {}
    public record Company(String id, String shortName, String listingCode, String listingStatus, String industry, String region, String companyLevel, String latestDisclosureDate) {}
    public record MarketData(MarketOverview overview, int total, int page, int size, List<Company> items) {}
    public record ProjectCounts(int all, int fundraising, int roadshow, int ended) {}
    public record FeaturedCampaign(String id, String title, int projectCount) {}
    public record Project(String id, String title, String status, String industry, String region, BigDecimal financingAmount, String financingUnit, List<String> tags, Integer intentCount, String nextRoadshowAt) {}
    public record ProjectsData(ProjectCounts counts, FeaturedCampaign featuredCampaign, int total, int page, int size, List<Project> items) {}
    public record ProfileUser(String id, String avatarUrl, String displayName, String maskedMobile, String qualifiedInvestorStatus) {}
    public record ProfileCounts(int followedCompanyCount, int favoriteProjectCount, int businessApplicationCount) {}
    public record AccountStatuses(String realNameStatus, String suitabilityValidUntil, String listingApplicationStatus, int financingDraftCount) {}
    public record ProfileData(ProfileUser user, ProfileCounts counts, AccountStatuses accountStatuses, boolean notificationUnread) {}
}
