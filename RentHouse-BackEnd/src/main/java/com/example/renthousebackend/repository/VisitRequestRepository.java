package com.example.renthousebackend.repository;

import com.example.renthousebackend.entity.VisitRequest;
import com.example.renthousebackend.entity.House;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface VisitRequestRepository extends JpaRepository<VisitRequest, Long> {
    List<VisitRequest> findByHouse(House house);

    List<VisitRequest> findByHouseOwnerId(Long ownerId);

    boolean existsByHouseIdAndVisitDateAndVisitTime(Long houseId, LocalDate visitDate, LocalTime visitTime);

    // In VisitRequestRepository interface
    int countByHouseId(Long houseId);

    @Modifying
    @Transactional
    @Query("DELETE FROM VisitRequest v WHERE v.house.id = :houseId")
    void deleteByHouseId(@Param("houseId") Long houseId);

}
