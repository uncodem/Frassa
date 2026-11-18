import { loadAssets, TextureId } from "./asset";
import { Level, TileType, TILE_DATA } from "./level";
import { parseMap, spawnWorld } from "./loader";
import { Game } from "./game";
import { RENDER, INPUT } from "./constants";

import type { World } from "./loader";

await loadAssets();

const canvas = document.getElementById("display") as HTMLCanvasElement;

canvas.width = RENDER.WIDTH;
canvas.height = RENDER.HEIGHT;

const MOUSE_SENS = INPUT.MOUSE_SENSE;

const testJson = `
{
  "width": 9,
  "height": 14,
  "tiles": [
    1,1,1,2,2,2,1,1,1,
    1,0,0,0,0,0,0,0,1,
    1,0,0,0,0,0,0,0,1,
    1,0,1,0,4,0,1,0,1,
    1,0,0,0,0,0,0,0,1,
    1,0,1,0,4,0,1,0,1,
    1,0,0,0,0,0,0,0,1,
    1,0,0,0,0,0,0,0,1,
    1,1,1,4,4,4,1,1,1,
    0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,
    2,2,2,2,2,2,2,2,2
  ],
  "commands": [
    {"type":"player","x":2,"y":2},
    {"type":"pickup","kind":"page","x":5,"y":4},
    {"type":"pickup","kind":"page","x":3,"y":4},
    {"type":"pickup","kind":"page","x":7,"y":7},
    {"type":"pickup","kind":"page","x":1,"y":7},
    {"type":"pickup","kind":"page","x":1,"y":1},
    {"type":"pickup","kind":"page","x":7,"y":1},
    {"type":"pickup","kind":"key","x":4,"y":7},
    {"type":"teleporter","x":0,"y":12,"tx":8.5,"ty":9.5,"floor":-1,"angle":1.54,"texture":"platypus"},
    {"type":"teleporter","x":8,"y":12,"tx":0.5,"ty":9.5,"floor":-1,"angle":1.57,"texture":"wall3"},
    {"type":"sprite","x":4,"y":4,"w":0.4,"h":0.4,"texture":"wall3","worldHeight":0.6},
    {"type":"bot","x":6,"y":2,"w":0.4,"h":0.4,"speed":0.2,"color":"magenta","worldHeight":1,"texture":"platypus"}
  ]
}
`;

const world = parseMap(testJson);

const {player, bots, sprites, pickups} = spawnWorld(world);
const keys = new Set<string>();

const game = new Game(world.level, player, bots, sprites, pickups, canvas, keys);
window.requestAnimationFrame(game.update);

window.addEventListener("keydown", (e: KeyboardEvent) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener("click", () => canvas.requestPointerLock());

document.addEventListener("mousemove", (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;
    if (Math.abs(e.movementX) >= INPUT.MOUSE_SPIKE_LIMIT) return;
    game.mouseTurn += e.movementX * MOUSE_SENS;
})

