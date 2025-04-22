-- Creates the database for all user info
CREATE DATABASE IF NOT EXISTS users;

-- Use this database
USE users;

CREATE TABLE home_owner IF NOT EXISTS home_owner (
    user_id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
);

-- Sample first names and last names
CREATE TEMPORARY TABLE first_names (name VARCHAR(50));
INSERT INTO first_names VALUES
('James'), ('Mary'), ('John'), ('Patricia'), ('Robert'), ('Jennifer'), ('Michael'), ('Linda'),
('William'), ('Elizabeth'), ('David'), ('Barbara'), ('Richard'), ('Susan'), ('Joseph'), ('Jessica'),
('Thomas'), ('Sarah'), ('Charles'), ('Karen'), ('Christopher'), ('Nancy'), ('Daniel'), ('Lisa'),
('Matthew'), ('Betty'), ('Anthony'), ('Margaret'), ('Mark'), ('Sandra'), ('Donald'), ('Ashley'),
('Steven'), ('Kimberly'), ('Paul'), ('Emily'), ('Andrew'), ('Donna'), ('Joshua'), ('Michelle'),
('Kenneth'), ('Dorothy'), ('Kevin'), ('Carol'), ('Brian'), ('Amanda'), ('George'), ('Melissa'),
('Edward'), ('Deborah'), ('Ronald'), ('Stephanie');

CREATE TEMPORARY TABLE last_names (name VARCHAR(50));
INSERT INTO last_names VALUES
('Smith'), ('Johnson'), ('Williams'), ('Brown'), ('Jones'), ('Garcia'), ('Miller'), ('Davis'),
('Rodriguez'), ('Martinez'), ('Hernandez'), ('Lopez'), ('Gonzalez'), ('Wilson'), ('Anderson'), ('Thomas'),
('Taylor'), ('Moore'), ('Jackson'), ('Martin'), ('Lee'), ('Perez'), ('Thompson'), ('White'),
('Harris'), ('Sanchez'), ('Clark'), ('Ramirez'), ('Lewis'), ('Robinson'), ('Walker'), ('Young'),
('Allen'), ('King'), ('Wright'), ('Scott'), ('Torres'), ('Nguyen'), ('Hill'), ('Flores'),
('Green'), ('Adams'), ('Nelson'), ('Baker'), ('Hall'), ('Rivera'), ('Campbell'), ('Mitchell'),
('Carter'), ('Roberts'), ('Gomez'), ('Phillips'), ('Evans'), ('Turner'), ('Diaz'), ('Parker');

-- Insert 50 records
DROP PROCEDURE IF EXISTS populate_home_owners;
DELIMITER //
CREATE PROCEDURE populate_home_owners()
BEGIN
    DECLARE i INT DEFAULT 1;

    -- Clear existing data if needed
    -- DELETE FROM home_owner;

    WHILE i <= 50 DO
        -- Format numbers with leading zeros for 01-09
        SET @user_num = LPAD(i, 2, '0');

        -- Get random names
        SET @first = (SELECT name FROM first_names ORDER BY RAND() LIMIT 1);
        SET @last = (SELECT name FROM last_names ORDER BY RAND() LIMIT 1);

        -- Insert the record
        INSERT INTO home_owner (user_id, email, password, first_name, last_name)
        VALUES (
            CONCAT('user', @user_num),
            CONCAT('email', @user_num, '@gmail.com'),
            CONCAT('password', @user_num),
            @first,
            @last
        );

        SET i = i + 1;
    END WHILE;

    -- Clean up temporary tables
    DROP TEMPORARY TABLE IF EXISTS first_names;
    DROP TEMPORARY TABLE IF EXISTS last_names;
END
DELIMITER ;

-- Run the procedure to populate the table
CALL populate_home_owners();

-- See the results
SELECT * FROM home_owner;