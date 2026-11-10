package com.kiungo.analytics;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClickRepository extends JpaRepository<Click, Long> {

    @EntityGraph(attributePaths = "link")
    Page<Click> findByUserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = "link")
    Page<Click> findByUserIdAndLinkId(Long userId, Long linkId, Pageable pageable);
}
