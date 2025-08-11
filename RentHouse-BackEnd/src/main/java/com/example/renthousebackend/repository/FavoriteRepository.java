package com.example.renthousebackend.repository;

import com.example.renthousebackend.entity.Favorite;
import com.example.renthousebackend.entity.User;
import com.example.renthousebackend.entity.House;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Optional<Favorite> findByUserAndProperty(User user, House property);
    List<Favorite> findAllByUser(User user);
    int countByPropertyId(Long propertyId);
}
