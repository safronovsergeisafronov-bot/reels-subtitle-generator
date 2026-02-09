FROM python:3.11-slim

# Install FFmpeg and common fonts for subtitle burning
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto-core \
    fonts-freefont-ttf \
    fonts-roboto \
    fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Register bundled project fonts with fontconfig for FFmpeg/libass
RUN if [ -d /app/fonts ]; then \
    mkdir -p /usr/local/share/fonts/project && \
    find /app/fonts -type f \( -name '*.ttf' -o -name '*.otf' \) -exec cp {} /usr/local/share/fonts/project/ \; && \
    fc-cache -fv; \
    fi

# Create uploads directory
RUN mkdir -p uploads

# Expose port (Railway sets PORT env var)
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
