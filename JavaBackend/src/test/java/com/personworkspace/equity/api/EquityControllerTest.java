package com.personworkspace.equity.api;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.personworkspace.equity.service.EquityDataService;

@WebMvcTest(EquityController.class)
@AutoConfigureMockMvc
@Import(EquityDataService.class)
class EquityControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsHomeContract() throws Exception {
        mockMvc.perform(get("/api/v1/home"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(0))
            .andExpect(jsonPath("$.data.marketOverview.listedCompanyCount").value(128))
            .andExpect(jsonPath("$.data.featuredProjects", hasSize(2)));
    }

    @Test
    void filtersMarketByKeyword() throws Exception {
        mockMvc.perform(get("/api/v1/market").param("keyword", "Q000116"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(1))
            .andExpect(jsonPath("$.data.items[0].shortName").value("云链科技"));
    }

    @Test
    void filtersProjectsByStatus() throws Exception {
        mockMvc.perform(get("/api/v1/projects").param("status", "ROADSHOW"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(5))
            .andExpect(jsonPath("$.data.items", hasSize(2)))
            .andExpect(jsonPath("$.data.items[0].status").value("ROADSHOW"));
    }

    @Test
    void returnsProfileContract() throws Exception {
        mockMvc.perform(get("/api/v1/profile"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.user.displayName").value("张先生"))
            .andExpect(jsonPath("$.data.notificationUnread").value(true));
    }
}
