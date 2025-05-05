CREATE DATABASE users;
USE users;

CREATE TABLE user_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  email VARCHAR(100),
  roles VARCHAR(100)
);
INSERT INTO user_accounts (user_id, password, first_name, last_name, email, roles)
VALUES 
('admin', 'password123', 'Admin', 'User', 'admin@example.com', 'admin'),
('user1', 'password123', 'John', 'Doe', 'john@example.com', 'user'),
('user2', 'password123', 'Jane', 'Smith', 'jane@example.com', 'user');

GRANT ALL PRIVILEGES ON users.* TO 'root'@'localhost';
FLUSH PRIVILEGES;