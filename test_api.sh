#!/bin/bash
# Generate dummy video
ffmpeg -y -f lavfi -i color=c=black:s=640x360:d=2 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -c:v libx264 -c:a aac -shortest test.mp4 > /dev/null 2>&1

echo "Uploading..."
UPLOAD_RES=$(curl -s -X POST -F "file=@test.mp4" http://localhost:8000/api/upload)
echo "Upload Result: $UPLOAD_RES"

FILENAME=$(echo $UPLOAD_RES | grep -o '"filename":"[^"]*' | cut -d'"' -f4)

if [ -z "$FILENAME" ]; then
    echo "Upload failed"
    exit 1
fi

echo "Processing $FILENAME..."
curl -v -X POST "http://localhost:8000/api/process?filename=$FILENAME"
