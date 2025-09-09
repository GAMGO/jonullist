package com.example.health_care.controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.health_care.dto.FoodDTO;
import com.example.health_care.service.FoodService;

@RestController
public class FoodController {

    private final FoodService service;

    public FoodController(FoodService service) {
        this.service = service;
    }

    @GetMapping(value = "/api/food/public/search", produces = "application/json")
    public List<FoodDTO> search(
            @RequestParam("name") String name,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "perPage", defaultValue = "10") int perPage) {
        return service.searchSimple(name, page, perPage);
    }
}
