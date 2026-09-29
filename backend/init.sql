-- WeatherGPT Database Initialization for MariaDB

-- Note: Tables are created by SQLAlchemy models on backend startup
-- This file is for any additional database setup

GRANT ALL PRIVILEGES ON weathergpt.* TO 'weathergpt'@'%';
FLUSH PRIVILEGES;