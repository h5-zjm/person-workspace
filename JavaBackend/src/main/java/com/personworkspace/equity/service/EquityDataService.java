package com.personworkspace.equity.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.function.Predicate;

import com.personworkspace.equity.persistence.CompanyEntity;
import com.personworkspace.equity.persistence.CompanyRepository;
import com.personworkspace.equity.persistence.ProjectEntity;
import com.personworkspace.equity.persistence.ProjectRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
public class EquityDataService {
    private final CompanyRepository companyRepository;
    private final ProjectRepository projectRepository;

    public EquityDataService(CompanyRepository companyRepository, ProjectRepository projectRepository) {
        this.companyRepository = companyRepository;
        this.projectRepository = projectRepository;
    }

    @Transactional(readOnly = true)
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
            projectRepository.findAllByOrderByIdAsc().stream().limit(2).map(this::toFeaturedProject).toList(),
            news
        );
    }

    @Transactional(readOnly = true)
    public MarketData market(String keyword, String industry, String region, String companyLevel, int page, int size) {
        Predicate<Company> filter = company -> contains(company.shortName(), keyword) || contains(company.listingCode(), keyword);
        filter = optional(filter, industry, company -> company.industry().equals(industry));
        filter = optional(filter, region, company -> company.region().equals(region));
        filter = optional(filter, companyLevel, company -> company.companyLevel().equals(companyLevel));
        List<Company> matched = companyRepository.findAllByOrderByLatestDisclosureDateDesc().stream()
            .map(this::toCompany)
            .filter(filter)
            .toList();
        int total = isBlank(keyword) && isBlank(industry) && isBlank(region) && isBlank(companyLevel) ? 128 : matched.size();
        return new MarketData(new MarketOverview(128, 4, 6, "09:30"), total, page, size, page(matched, page, size));
    }

    @Transactional(readOnly = true)
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
        List<Project> matched = projectRepository.findAllByOrderByIdAsc().stream().map(this::toProject).filter(filter).toList();
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

    private FeaturedProject toFeaturedProject(ProjectEntity project) {
        return new FeaturedProject(
            project.getId(),
            project.getCompanyName(),
            project.getIndustry(),
            project.getTags(),
            project.getFinancingAmount(),
            project.getFinancingUnit(),
            project.getRegion()
        );
    }

    private Company toCompany(CompanyEntity company) {
        return new Company(
            company.getId(),
            company.getShortName(),
            company.getListingCode(),
            company.getListingStatus(),
            company.getIndustry(),
            company.getRegion(),
            company.getCompanyLevel(),
            company.getLatestDisclosureDate().toString()
        );
    }

    private Project toProject(ProjectEntity project) {
        return new Project(
            project.getId(),
            project.getTitle(),
            project.getStatus(),
            project.getIndustry(),
            project.getRegion(),
            project.getFinancingAmount(),
            project.getFinancingUnit(),
            project.getTags(),
            project.getIntentCount(),
            project.getNextRoadshowAt()
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
