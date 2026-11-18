import { loadAssets } from "./asset";
import { parseMap, spawnFloor, spawnWorld } from "./loader";
import { Game } from "./game";
import { RENDER, INPUT } from "./constants";

import floor0 from "./maps/floor0.json?raw";
import floor1 from "./maps/floor1.json?raw";

import type { FloorState } from "./game";
import type { World } from "./loader";

const FLOOR_FILES: string[] = [floor0, floor1];

await loadAssets();

const canvas = document.getElementById("display") as HTMLCanvasElement;

canvas.width = RENDER.WIDTH;
canvas.height = RENDER.HEIGHT;

const MOUSE_SENS = INPUT.MOUSE_SENSE;

function validateTeleporters(worlds: World[]) {
    worlds.forEach((w, i) => {
        for (const cmd of w.spawnList) {
            if (cmd.type !== "teleporter") continue;
            const at = `Floor ${i} teleporter at (${cmd.x}, ${cmd.y})`;

            if (!Number.isInteger(cmd.floor) || cmd.floor < -1 || cmd.floor >= worlds.length)
                throw new Error(`${at} targets invalid floor ${cmd.floor} (use -1 or 0..${worlds.length - 1})`);

            const destFloor = cmd.floor === -1 ? i : cmd.floor;
            const dest = worlds[destFloor]!.level;
            const tx = Math.floor(cmd.tx), ty = Math.floor(cmd.ty);
            if (!dest.inBounds(tx, ty) || dest.isSolid(tx, ty))
                throw new Error(`${at} lands at (${cmd.tx}, ${cmd.ty}), which is outside floor ${destFloor} or inside a wall`);
        }
    });
}

const worlds: World[] = FLOOR_FILES.map((json) => parseMap(json));
validateTeleporters(worlds);

const { player, ...lobby } = spawnWorld(worlds[0]!);

const floors: FloorState[] = [
    { level: worlds[0]!.level, ...lobby },
    ...worlds.slice(1).map((w) => ({ level: w.level, ...spawnFloor(w) })),
];

const keys = new Set<string>();
const game = new Game(floors, player, canvas, keys);
window.requestAnimationFrame(game.update);

window.addEventListener("keydown", (e: KeyboardEvent) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener("click", () => canvas.requestPointerLock());

document.addEventListener("mousemove", (e: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;
    if (Math.abs(e.movementX) >= INPUT.MOUSE_SPIKE_LIMIT) return;
    game.mouseTurn += e.movementX * MOUSE_SENS;
});
