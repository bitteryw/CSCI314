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

-- create the table of listings
CREATE TABLE IF NOT EXISTS listings (
    listing_id VARCHAR(20) PRIMARY KEY,
    title VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2),
    image_path VARCHAR(255),
    user_id VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user_accounts(user_id)
    );

CREATE TABLE shortlisted_listings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  listing_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_shortlist (user_id, listing_id),
  FOREIGN KEY (user_id) REFERENCES user_accounts(user_id),
  FOREIGN KEY (listing_id) REFERENCES listings(listing_id)
);



-- Alter table to make sure all rows are unique
--ALTER TABLE user_accounts ADD CONSTRAINT uc_person UNIQUE(first_name,last_name);


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

-- Set the next 5 users to have home_cleaner roles
UPDATE user_accounts
SET roles = 'home_cleaner'
WHERE user_id IN ('user06', 'user07', 'user08', 'user09', 'user10');

-- Set the next 5 users to have platform_manager roles
UPDATE user_accounts
SET roles = 'platform_manager'
WHERE user_id IN ('user11', 'user12', 'user13', 'user14', 'user15');

-- Clean up temporary tables
DROP TEMPORARY TABLE IF EXISTS first_names;
    DROP TEMPORARY TABLE IF EXISTS last_names;
END //
DELIMITER ;

-- Run the procedure to populate the table
CALL populate_user_accounts();

-- See the results
SELECT * FROM user_accounts;


-- First, drop the foreign key constraint
ALTER TABLE listings
DROP FOREIGN KEY fk_category;

-- Then remove the category_code column
ALTER TABLE listings
DROP COLUMN category_code;

-- Add a new category_name column
ALTER TABLE listings
    ADD COLUMN category_name VARCHAR(50);

-- Add a foreign key constraint referencing the categories table's category_name
ALTER TABLE listings
    ADD CONSTRAINT fk_category_name
        FOREIGN KEY (category_name) REFERENCES categories(category_name)
            ON DELETE SET NULL;


CREATE TABLE IF NOT EXISTS categories (
    category_code VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

INSERT INTO categories (category_code, category_name, description)
VALUES
    ('CAT001', 'Home Cleaning', 'Professional cleaning services for residential properties'),
    ('CAT002', 'Office Cleaning', 'Commercial cleaning services for office spaces'),
    ('CAT003', 'Carpet Cleaning', 'Specialized cleaning for carpets and rugs'),
    ('CAT004', 'Window Cleaning', 'Professional window and glass cleaning services'),
    ('CAT005', 'Deep Cleaning', 'Thorough cleaning of all surfaces and hard-to-reach areas');

INSERT INTO listings (listing_id, category_code)
VALUES ('1', 'CAT001');

ALTER TABLE listings
    MODIFY listing_id INT AUTO_INCREMENT;

CREATE TABLE shortlisted_listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    listing_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_shortlist (user_id, listing_id),
    FOREIGN KEY (user_id) REFERENCES user_accounts(user_id),
    FOREIGN KEY (listing_id) REFERENCES listings(listing_id)
);