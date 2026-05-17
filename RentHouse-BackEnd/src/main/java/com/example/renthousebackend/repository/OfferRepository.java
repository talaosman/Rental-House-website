package com.example.renthousebackend.repository;

import java.util.List;

import com.example.renthousebackend.entity.Offer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OfferRepository extends JpaRepository<Offer, Long> {

   List<Offer> findByUserIdAndUsedFalse(Long userId);

   List<Offer> findByHouseIdAndActiveTrue(Long houseId);

}