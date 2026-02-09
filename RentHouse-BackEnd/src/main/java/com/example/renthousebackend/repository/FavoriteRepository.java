package com.example.renthousebackend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import com.example.renthousebackend.entity.Favorite;
import com.example.renthousebackend.entity.House;
import com.example.renthousebackend.entity.User;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    
    Optional<Favorite> findByUserAndProperty(User user, House property);

    List<Favorite> findAllByUser(User user);

    int countByPropertyId(Long propertyId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Favorite f WHERE f.property.id = :houseId")
    void deleteByPropertyId(@Param("houseId") Long houseId);
}