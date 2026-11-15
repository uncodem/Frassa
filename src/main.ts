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

function handleInput(): void {
    if (keys.has("w")) player.move(level, 0.5);
    else if (keys.has("s")) player.move(level, -0.5);
    
    if (keys.has("a")) player.turn(-0.5);
    else if (keys.has("d")) player.turn(0.5);
}

function update(timestamp: DOMHighResTimeStamp) {

    handleInput();

    const hits = raycaster.getFrame(player.x, player.y, player.camera);
    renderer.drawFrame(level, hits);

    window.requestAnimationFrame(update);
}

window.requestAnimationFrame(update);

window.addEventListener("keydown", (e: KeyboardEvent) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));
