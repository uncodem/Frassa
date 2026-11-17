import { Level, TileType, TILE_DATA } from "./level";
import { Player } from "./player";
import { Raycaster } from "./raycaster";
import { Renderer } from "./renderer";
import { loadAssets, TextureId } from "./asset";
import { Sprite } from "./sprite";
import { Bot } from "./bot";
import { NavGrid } from "./nav";

await loadAssets();

const canvas = document.getElementById("display") as HTMLCanvasElement;
const W = canvas.width, H = canvas.height;

const MOUSE_SENS = 0.001;

const _ = TileType.Empty, X = TileType.Wall;
const level = new Level([
    [1, 1, 1, 2, 2, 2, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 4, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 4, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 4, 4, 4, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 3, 0, 0, 0, 0],
]);

const player = new Player(2, 2, 0.3, 0.3);   // tile center
const raycaster = new Raycaster(level, W);
const renderer = new Renderer(canvas);
const bot = new Bot(player,3.5,2.5,0.5,0.5,"magenta",2.75,TextureId.Platypus,1);
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

    bot.update(dt, nav);

    const hits = raycaster.getFrame(player.x, player.y, player.camera);
    renderer.drawFrame(player, level, [bot], hits);

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

