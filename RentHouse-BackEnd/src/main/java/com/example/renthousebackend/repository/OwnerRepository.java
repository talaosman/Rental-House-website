package com.example.renthousebackend.repository;

import com.example.renthousebackend.entity.Owner;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OwnerRepository extends JpaRepository<Owner, Long> {
    List<Owner> findByEmail(String email);
}
