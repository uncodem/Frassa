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
const caster = new Raycaster(level, W);

function frame() {
    player.camera.angle += 0.01;   // slow spin so you can see it working

    ctx.fillStyle = "#334"; ctx.fillRect(0, 0, W, H / 2);
    ctx.fillStyle = "#554"; ctx.fillRect(0, H / 2, W, H / 2);

    const hits = caster.getFrame(player.x, player.y, player.camera);
    for (let i = 0; i < hits.length; i++) {
        const h = hits[i]!;
        const lineH = H / Math.max(h.dist, 0.0001);
        ctx.fillStyle = TILE_DATA[level.tileAt(h.tileX, h.tileY)].color;
        ctx.fillRect(i, H / 2 - lineH / 2, 1, lineH);
        if (h.side === 1) {                     // darken one axis for depth
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(i, H / 2 - lineH / 2, 1, lineH);
        }
    }
    requestAnimationFrame(frame);
}
frame();
