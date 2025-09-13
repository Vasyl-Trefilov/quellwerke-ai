FROM node:20

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy app source
COPY . .

# Install netcat for entrypoint.sh
RUN apt-get update && apt-get install -y netcat-traditional && rm -rf /var/lib/apt/lists/*

EXPOSE 3000

CMD ["node", "index.js"]
