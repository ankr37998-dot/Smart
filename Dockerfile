FROM node:20-bullseye

# Install Python + build deps for face-recognition (dlib)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-dev \
    build-essential cmake pkg-config \
    libopenblas-dev liblapack-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies first for a predictable build.
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Face recognition worker (backend/ml/face_worker.py)
COPY backend/requirements.txt ./backend/requirements.txt
RUN python3 -m pip install --no-cache-dir -r backend/requirements.txt

# Shortage-risk predictor (ml/) — optional in the same container
COPY ml/requirements.txt ./ml/requirements.txt
RUN python3 -m pip install --no-cache-dir -r ml/requirements.txt

# Copy the actual app source tree.
COPY backend ./backend
COPY frontend ./frontend
COPY ml ./ml

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "backend/server.js"]

