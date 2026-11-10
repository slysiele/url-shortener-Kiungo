package com.kiungo.link;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface LinkRepository extends JpaRepository<Link, Long> {

    Optional<Link> findBySlug(String slug);

    boolean existsBySlugIgnoreCase(String slug);

    Optional<Link> findByIdAndUserId(Long id, Long userId);

    Optional<Link> findBySlugAndUserId(String slug, Long userId);

    Page<Link> findByUserId(Long userId, Pageable pageable);

    List<Link> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    /** `pattern` must already be lower-case and wrapped in % (e.g. "%promo%"). */
    @Query("""
        select l from Link l where l.user.id = :userId and (
            lower(l.slug) like :pattern or lower(l.originalUrl) like :pattern
            or lower(coalesce(l.title, '')) like :pattern or lower(coalesce(l.tags, '')) like :pattern)
        """)
    Page<Link> search(@Param("userId") Long userId, @Param("pattern") String pattern, Pageable pageable);

    long countByUserId(Long userId);

    long countByUserIdAndCreatedAtAfter(Long userId, Instant after);

    @Query("select coalesce(sum(l.clickCount), 0) from Link l where l.user.id = :userId")
    long sumClicksByUserId(@Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query("update Link l set l.clickCount = l.clickCount + 1 where l.id = :id")
    void incrementClicks(@Param("id") Long id);

    @Modifying
    @Transactional
    @Query("update Link l set l.clickCount = l.clickCount + :n where l.id = :id")
    void addClicks(@Param("id") Long id, @Param("n") long n);
}
