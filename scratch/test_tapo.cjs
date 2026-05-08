const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const FFMPEG_BIN = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");
const rtspUrl = "rtsp://Testcamera:12345678@192.168.1.17:554/stream1";

console.log("Testing Tapo C220 Connection...");
console.log("URL:", rtspUrl.replace(/:[^:@]+@/, ":****@")); // Hide password

const args = [
  '-loglevel', 'info',
  '-rtsp_transport', 'tcp',
  '-i', rtspUrl,
  '-frames:v', '1',
  '-f', 'image2',
  'test_capture.jpg'
];

const ff = spawn(FFMPEG_BIN, args);

ff.stderr.on('data', (data) => {
  console.log(`FFmpeg: ${data}`);
});

ff.on('close', (code) => {
  if (code === 0 && fs.existsSync('test_capture.jpg')) {
    console.log("SUCCESS! Captured a frame from Tapo C220.");
    console.log("Frame size:", fs.statSync('test_capture.jpg').size, "bytes");
  } else {
    console.log(`FAILED with exit code ${code}`);
  }
});
