package com.example.renthousebackend.repository;

import com.example.renthousebackend.entity.VisitRequest;
import com.example.renthousebackend.entity.House;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface VisitRequestRepository extends JpaRepository<VisitRequest, Long> {
    List<VisitRequest> findByHouse(House house);
    List<VisitRequest> findByHouseOwnerId(Long ownerId);
    boolean existsByHouseIdAndVisitDateAndVisitTime(Long houseId, LocalDate visitDate, LocalTime visitTime);

}
