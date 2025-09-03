CREATE SEQUENCE body_seq START WITH 1 INCREMENT BY 1;
CREATE TABLE body (
    idx NUMBER PRIMARY KEY,
    customer_id VARCHAR2(100) NOT NULL,
    target_weight NUMBER(4, 1),
    target_calories NUMBER(5),
    weight NUMBER(4, 1) NOT NULL,
    height NUMBER(3) NOT NULL,
    age NUMBER(3),
    gender CHAR(1),
    inbody NUMBER(5, 2),
    record_date DATE NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
