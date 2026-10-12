FROM php:8.2-fpm
RUN docker-php-ext-install pdo_mysql mysqli pcntl
RUN printf 'display_errors=Off\nlog_errors=On\nmemory_limit=256M\n' > /usr/local/etc/php/conf.d/local.ini
