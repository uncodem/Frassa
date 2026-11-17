import { Level, TileType, TILE_DATA } from "./level";
import { Player } from "./player";
import { Raycaster } from "./raycaster";
import { Renderer } from "./renderer";
import { loadAssets, TextureId } from "./asset";
import { Sprite } from "./sprite";
import { Bot } from "./bot";
import { NavGrid } from "./nav";
import { parseMap, spawnWorld } from "./loader";
import type { World } from "./loader";

await loadAssets();

const canvas = document.getElementById("display") as HTMLCanvasElement;
const W = canvas.width, H = canvas.height;

const MOUSE_SENS = 0.001;

const testJson = `
    {
      "width": 9,
      "height": 13,
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
        0,0,0,0,3,0,0,0,0
      ],
      "commands": [
        {"type":"player","x":2,"y":2},
        {"type":"sprite","x":4,"y":10,"w":0.4,"h":0.4,"worldHeight":4,"texture":"platypus"},
        {"type":"sprite","x":4,"y":4,"w":0.4,"h":0.4,"texture":"wall3","worldHeight":0.6},
        {"type":"bot","x":6,"y":2,"w":0.4,"h":0.4,"speed":2.2,"texture":"platypus","worldHeight":1}
      ]
    }
`;

const world = parseMap(testJson);

const level = world.level;
const {player, bots, sprites} = spawnWorld(world);

const raycaster = new Raycaster(level, W);
const renderer = new Renderer(canvas);
const nav = new NavGrid(level);

nav.compute(player.x, player.y);

const keys = new Set<string>();

function handleInput(dt: number): void {
    if (keys.has("w")) player.move(level, dt);
    else if (keys.has("s")) player.move(level, -dt);
    
    if (keys.has("a")) player.strafe(level, -dt);
    else if (keys.has("d")) player.strafe(level, dt);

    if (keys.has("arrowleft")) player.turn(-dt);
    else if (keys.has("arrowright")) player.turn(dt);
}

let last = 0;
let mouseTurn = 0;

function update(timestamp: DOMHighResTimeStamp) {
    const dt = Math.min((timestamp - last) / 1000, 0.05);
    last = timestamp;

    let ox = Math.floor(player.x), oy = Math.floor(player.y);

    handleInput(dt);

    if (Math.floor(player.x) !== ox || Math.floor(player.y) !== oy) nav.compute(Math.floor(player.x), Math.floor(player.y));

    if (mouseTurn !== 0) { 
        player.turn(mouseTurn); 
        mouseTurn = 0;
    }

    bots[0].update(dt, nav);

    const hits = raycaster.getFrame(player.x, player.y, player.camera);
    renderer.drawFrame(player, level, [...bots, ...sprites], hits);

    window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);

window.addEventListener("keydown", (e: KeyboardEvent) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener("click", () => canvas.requestPointerLock());

document.addEventListener("mousemove", (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;
    if (Math.abs(e.movementX) >= 200) return;
    mouseTurn += e.movementX * MOUSE_SENS;
})

