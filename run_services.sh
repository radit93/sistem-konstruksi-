#!/bin/bash
set -e

# Kill any existing on ports 3307 or 8001
fuser -k 3307/tcp 2>/dev/null || true
fuser -k 8001/tcp 2>/dev/null || true
sleep 1

rm -f /home/neixcyll/pcm-dashboard/mysql.sock

# Start MariaDB
echo "Starting MariaDB on port 3307..."
setsid /home/neixcyll/pcm-dashboard/mariadbd --defaults-file=/home/neixcyll/pcm-dashboard/my.cnf --skip-grant-tables >> /home/neixcyll/pcm-dashboard/mysql.log 2>&1 &

# Wait for MariaDB socket/port
for i in {1..30}; do
    if ss -tulpn | grep -q 3307; then
        echo "MariaDB is ready on port 3307!"
        break
    fi
    sleep 0.5
done

# Start Laravel serve
echo "Starting Laravel serve on port 8001..."
cd /home/neixcyll/pcm-dashboard/pcm-backend
setsid php artisan serve --host=127.0.0.1 --port=8001 >> /home/neixcyll/pcm-dashboard/laravel_serve.log 2>&1 &

# Wait for Laravel
for i in {1..30}; do
    if ss -tulpn | grep -q 8001; then
        echo "Laravel serve is ready on port 8001!"
        break
    fi
    sleep 0.5
done

echo "All services successfully started!"
