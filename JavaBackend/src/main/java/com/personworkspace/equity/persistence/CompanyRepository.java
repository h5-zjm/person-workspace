package com.personworkspace.equity.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<CompanyEntity, String> {
    List<CompanyEntity> findAllByOrderByLatestDisclosureDateDesc();
}
