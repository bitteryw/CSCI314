-- Create the database for all user info
CREATE DATABASE IF NOT EXISTS users;

-- Use this database
USE users;

-- Create the user_accounts table (previously called home_owner)
CREATE TABLE IF NOT EXISTS user_accounts (
    user_id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(50) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    roles VARCHAR(20) DEFAULT 'home_owner'
    );



-- Alter table to make sure all rows are unique
ALTER TABLE user_accounts ADD CONSTRAINT uc_person UNIQUE(first_name,last_name);


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
DROP PROCEDURE IF EXISTS populate_user_accounts;
DELIMITER //
CREATE PROCEDURE populate_user_accounts()
BEGIN
    DECLARE i INT DEFAULT 1;
    -- Clear existing data if needed
    -- DELETE FROM user_accounts;
    WHILE i <= 50 DO
        -- Format numbers with leading zeros for 01-09
        SET @user_num = LPAD(i, 2, '0');
        -- Get random names
        SET @first = (SELECT name FROM first_names ORDER BY RAND() LIMIT 1);
        SET @last = (SELECT name FROM last_names ORDER BY RAND() LIMIT 1);
        -- Insert the record
INSERT INTO user_accounts (user_id, email, password, first_name, last_name)
VALUES (
           CONCAT('user', @user_num),
           CONCAT('email', @user_num, '@gmail.com'),
           CONCAT('password', @user_num),
           @first,
           @last
       );
SET i = i + 1;
END WHILE;

    -- Set the first 5 users to have admin roles
UPDATE user_accounts
SET roles = 'user_admin'
WHERE user_id IN ('user01', 'user02', 'user03', 'user04', 'user05');

-- Clean up temporary tables
DROP TEMPORARY TABLE IF EXISTS first_names;
    DROP TEMPORARY TABLE IF EXISTS last_names;
END //
DELIMITER ;

-- Run the procedure to populate the table
CALL populate_user_accounts();

-- See the results
SELECT * FROM user_accounts;