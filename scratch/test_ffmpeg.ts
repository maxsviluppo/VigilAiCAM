import { spawn } from "child_process";
import path from "path";

const FFMPEG_BIN = path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");
console.log("Testing FFmpeg at:", FFMPEG_BIN);

const ff = spawn(FFMPEG_BIN, ["-version"]);

ff.stdout.on("data", (data) => console.log("STDOUT:", data.toString()));
ff.stderr.on("data", (data) => console.log("STDERR:", data.toString()));
ff.on("close", (code) => console.log("Process closed with code:", code));
ff.on("error", (err) => console.error("Process error:", err));
