
import { Player } from "./player.ts";

const canvas = document.getElementById("display") as HTMLCanvasElement;
const ctx = canvas.getContext("2d");

if (!ctx) throw new Error("2D canvas not supported");

const W = canvas.width;
const H = canvas.height;

ctx.fillStyle = "#334";
ctx.fillRect(0, 0, W, H / 2);
ctx.fillStyle = "#554";
ctx.fillRect(0, H / 2, W, H / 2);

ctx.fillStyle = "#a33";
ctx.fillRect(W / 2 - 20, H / 2 - 60, 40, 120);

ctx.fillStyle = "#fff";
ctx.font = "12px monospace";
ctx.fillText("canvas ok", 8, 16);

const P = new Player(0,0,8,8);
console.log(P);

