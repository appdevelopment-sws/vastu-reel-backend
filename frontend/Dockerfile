# Admin Panel Development Dockerfile (Vite.js)
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies if package.json exists
RUN if [ -f package.json ]; then npm install; fi

COPY . .

EXPOSE 5173

# Vite requires --host 0.0.0.0 to expose dev server outside container
CMD ["sh", "-c", "if [ -f package.json ]; then npm run dev -- --host 0.0.0.0; else echo 'Admin panel pending setup in web/admin folder...' && tail -f /dev/null; fi"]
