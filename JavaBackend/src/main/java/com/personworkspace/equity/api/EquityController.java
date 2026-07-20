package com.personworkspace.equity.api;

import com.personworkspace.equity.service.EquityDataService;
import com.personworkspace.equity.service.EquityDataService.HomeData;
import com.personworkspace.equity.service.EquityDataService.MarketData;
import com.personworkspace.equity.service.EquityDataService.ProfileData;
import com.personworkspace.equity.service.EquityDataService.ProjectsData;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*"})
public class EquityController {
    private final EquityDataService dataService;

    public EquityController(EquityDataService dataService) {
        this.dataService = dataService;
    }

    @GetMapping("/home")
    public ApiResponse<HomeData> home() {
        return ApiResponse.success(dataService.home());
    }

    @GetMapping("/market")
    public ApiResponse<MarketData> market(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String industry,
        @RequestParam(required = false) String region,
        @RequestParam(required = false) String companyLevel,
        @RequestParam(defaultValue = "LATEST_LISTING_DESC") String sort,
        @RequestParam(defaultValue = "1") @Min(1) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return ApiResponse.success(dataService.market(keyword, industry, region, companyLevel, page, size));
    }

    @GetMapping("/projects")
    public ApiResponse<ProjectsData> projects(
        @RequestParam(required = false) String keyword,
        @RequestParam(defaultValue = "ALL") String status,
        @RequestParam(required = false) String industry,
        @RequestParam(required = false) String region,
        @RequestParam(required = false) String financingScale,
        @RequestParam(defaultValue = "LATEST_PUBLISHED_DESC") String sort,
        @RequestParam(defaultValue = "1") @Min(1) int page,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size
    ) {
        return ApiResponse.success(dataService.projects(keyword, status, industry, region, financingScale, page, size));
    }

    @GetMapping("/profile")
    public ApiResponse<ProfileData> profile() {
        return ApiResponse.success(dataService.profile());
    }
}
