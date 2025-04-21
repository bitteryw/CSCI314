--creates the database for all user info
CREATE DATABASE IF NOT EXISTS users;

--use this database
USE users;

CREATE TABLE home_owner IF NOT EXISTS home_owner (
    user_id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
);

