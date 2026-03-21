FROM node:20-alpine

WORKDIR /app

# Copy package.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Install nodemon globally for dev
RUN npm install -g nodemon

# Copy source code
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]