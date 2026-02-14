package com.example.renthousebackend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.example.renthousebackend.entity.House;

@Repository
public interface HouseRepository extends JpaRepository<House, Long> {
    List<House> findTop5ByStatusOrderByCreatedAtDesc(String status);

    List<House> findTop5ByStatusAndLocationContainingIgnoreCaseOrderByCreatedAtDesc(String status, String location);

    @Query("SELECT DISTINCT h.location FROM House h WHERE h.location IS NOT NULL")
    List<String> findDistinctLocations();

    List<House> findByStatus(String status);

    List<House> findByStatusAndLocationContainingIgnoreCase(String status, String location);

    List<House> findTop10ByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT r.house.id FROM Rent r GROUP BY r.house.id ORDER BY COUNT(r.id) DESC")
    List<Long> findMostRentedHouseIds();

}
