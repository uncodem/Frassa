import { Level, TileType, TILE_DATA } from "./level";
import { Player } from "./player";
import { Raycaster } from "./raycaster";
import { Renderer } from "./renderer";
import { loadAssets } from "./asset";

await loadAssets();

const canvas = document.getElementById("display") as HTMLCanvasElement;
const W = canvas.width, H = canvas.height;

const MOUSE_SENS = 0.001;

const _ = TileType.Empty, X = TileType.Wall;
const level = new Level([
    [1, 1, 1, 2, 2, 2, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 3, 0, 0, 0, 0],
]);

const player = new Player(1.5, 1.5, 0.3, 0.3);   // tile center
const raycaster = new Raycaster(level, W);
const renderer = new Renderer(canvas);

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

    handleInput(dt);

    if (mouseTurn !== 0) { 
        player.turn(mouseTurn); 
        mouseTurn = 0;
    }

    const hits = raycaster.getFrame(player.x, player.y, player.camera);
    renderer.drawFrame(level, hits);

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

