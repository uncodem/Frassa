import { Level, TileType, TILE_DATA } from "./level";
import { Player } from "./player";
import { Raycaster } from "./raycaster";
import { Renderer } from "./renderer";

const canvas = document.getElementById("display") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
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

function drawFrame(timestamp: DOMHighResTimeStamp) {
    player.turn(0.01);

    const hits = raycaster.getFrame(player.x, player.y, player.camera);
    renderer.drawFrame(level, hits);

    window.requestAnimationFrame(drawFrame);
}

window.requestAnimationFrame(drawFrame);

window.addEventListener("keyup", () => {
    player.move(4);
});

