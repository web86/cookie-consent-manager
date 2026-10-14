FROM php:8.1-apache
RUN apt-get update && apt-get install -y --no-install-recommends libzip-dev libonig-dev libxml2-dev libpng-dev \
    && docker-php-ext-install pdo_mysql mysqli mbstring dom gd zip pcntl \
    && rm -rf /var/lib/apt/lists/*
RUN a2enmod rewrite && printf 'display_errors=Off\nlog_errors=On\nmemory_limit=256M\n' > /usr/local/etc/php/conf.d/cc3.ini
