import { Level, TileType, TILE_DATA } from "./level";
import { Player } from "./player";
import { Raycaster } from "./raycaster";
import { Renderer } from "./renderer";

const canvas = document.getElementById("display") as HTMLCanvasElement;
const W = canvas.width, H = canvas.height;

const _ = TileType.Empty, X = TileType.Wall;
const level = new Level([
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
]);

const player = new Player(1.5, 1.5, 0.3, 0.3);   // tile center
const raycaster = new Raycaster(level, W);
const renderer = new Renderer(canvas);

const keys = new Set<string>();

function handleInput(dt: number): void {
    if (keys.has("w")) player.move(level, dt);
    else if (keys.has("s")) player.move(level, -dt);
    
    if (keys.has("a")) player.turn(-dt);
    else if (keys.has("d")) player.turn(dt);
}

let last = 0;

function update(timestamp: DOMHighResTimeStamp) {
    const dt = Math.min((timestamp - last) / 1000, 0.05);
    last = timestamp;

    handleInput(dt);

    const hits = raycaster.getFrame(player.x, player.y, player.camera);
    renderer.drawFrame(level, hits);

    window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);

window.addEventListener("keydown", (e: KeyboardEvent) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));
