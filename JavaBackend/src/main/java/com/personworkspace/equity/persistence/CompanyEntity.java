package com.personworkspace.equity.persistence;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "companies")
public class CompanyEntity {
    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "short_name", nullable = false, length = 128)
    private String shortName;

    @Column(name = "listing_code", nullable = false, unique = true, length = 64)
    private String listingCode;

    @Column(name = "listing_status", nullable = false, length = 32)
    private String listingStatus;

    @Column(nullable = false, length = 64)
    private String industry;

    @Column(nullable = false, length = 64)
    private String region;

    @Column(name = "company_level", nullable = false, length = 32)
    private String companyLevel;

    @Column(name = "latest_disclosure_date", nullable = false)
    private LocalDate latestDisclosureDate;

    protected CompanyEntity() {
    }

    public String getId() { return id; }
    public String getShortName() { return shortName; }
    public String getListingCode() { return listingCode; }
    public String getListingStatus() { return listingStatus; }
    public String getIndustry() { return industry; }
    public String getRegion() { return region; }
    public String getCompanyLevel() { return companyLevel; }
    public LocalDate getLatestDisclosureDate() { return latestDisclosureDate; }
}
