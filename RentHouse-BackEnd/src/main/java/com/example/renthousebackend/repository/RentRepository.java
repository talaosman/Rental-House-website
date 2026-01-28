package com.example.renthousebackend.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

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
    
}
