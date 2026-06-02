package com.example.renthousebackend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.Rent;
import com.example.renthousebackend.entity.User;

public interface RentRepository extends JpaRepository<Rent, Long> {

        List<Rent> findByHouse(House house);

        List<Rent> findByUser(User user);

        boolean existsByHouseAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        House house, LocalDate endDate, LocalDate startDate);

        Rent findTopByHouseIdOrderByEndDateDesc(Long houseId);

        int countByHouseId(Long houseId);

        List<Rent> findByUserId(Long userId);

        Optional<Rent> findFirstByHouseAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        House house, LocalDate start, LocalDate end);

        long countByEndDateGreaterThanEqualAndStartDateLessThanEqual(LocalDate end, LocalDate start);

        @Modifying
        @Transactional
        @Query("DELETE FROM Rent r WHERE r.house.id = :houseId")
        void deleteByHouseId(@Param("houseId") Long houseId);
}