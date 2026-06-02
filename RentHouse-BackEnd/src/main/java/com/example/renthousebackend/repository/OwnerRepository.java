package com.example.renthousebackend.repository;

import com.example.renthousebackend.entity.Owner;
import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OwnerRepository extends JpaRepository<Owner, Long> {

    List<Owner> findByEmail(String email);

    Optional<Owner> findFirstByEmailIgnoreCase(String email);
}