CREATE TABLE goal (
    id VARCHAR2(100) PRIMARY KEY NOT NULL,
    target_weight NUMBER(4, 1) NOT NULL,
    target_calories NUMBER(5) NOT NULL,
    FOREIGN KEY (id) REFERENCES customers(id) ON DELETE CASCADE
);
