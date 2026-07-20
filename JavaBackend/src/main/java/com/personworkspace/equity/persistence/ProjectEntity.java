package com.personworkspace.equity.persistence;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "projects")
public class ProjectEntity {
    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "company_name", nullable = false, length = 128)
    private String companyName;

    @Column(nullable = false, length = 128)
    private String title;

    @Column(nullable = false, length = 32)
    private String status;

    @Column(nullable = false, length = 64)
    private String industry;

    @Column(nullable = false, length = 64)
    private String region;

    @Column(name = "financing_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal financingAmount;

    @Column(name = "financing_unit", nullable = false, length = 16)
    private String financingUnit;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_tags", joinColumns = @JoinColumn(name = "project_id"))
    @OrderColumn(name = "tag_order")
    @Column(name = "tag", nullable = false, length = 32)
    private List<String> tags = new ArrayList<>();

    @Column(name = "intent_count")
    private Integer intentCount;

    @Column(name = "next_roadshow_at", length = 32)
    private String nextRoadshowAt;

    protected ProjectEntity() {
    }

    public String getId() { return id; }
    public String getCompanyName() { return companyName; }
    public String getTitle() { return title; }
    public String getStatus() { return status; }
    public String getIndustry() { return industry; }
    public String getRegion() { return region; }
    public BigDecimal getFinancingAmount() { return financingAmount; }
    public String getFinancingUnit() { return financingUnit; }
    public List<String> getTags() { return List.copyOf(tags); }
    public Integer getIntentCount() { return intentCount; }
    public String getNextRoadshowAt() { return nextRoadshowAt; }
}
