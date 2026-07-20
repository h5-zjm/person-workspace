package com.personworkspace.equity.persistence;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<ProjectEntity, String> {
    List<ProjectEntity> findAllByOrderByIdAsc();
}
