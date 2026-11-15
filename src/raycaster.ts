
import { Camera } from "./camera";
import { Level, TileType, TILE_DATA } from "./level";

export interface RayHit {
    dist: number;
    side: 0 | 1;
    tileX: number;
    tileY: number;
    wallX: number;
    height: number;
}

export const MAX_STEPS = 64;
export const MAX_DIST = 24;
export const MAX_HITS = 8;
export const EYE = 0.5;


export class Raycaster {
    // Class to just store raycaster settings
    constructor(private level: Level, private screenWidth: number) {}

    private cast(x: number, y: number, a: number): RayHit[] {
        const hits: RayHit[] = [];

        const dx = Math.cos(a), dy = Math.sin(a);
        let heighest = -Infinity;

        for (let n = 0; n < MAX_STEPS; n++) {

            let mapX = Math.floor(x), mapY = Math.floor(y);
            const deltaX = Math.abs(1 / dx);
            const deltaY = Math.abs(1 / dy);

            const stepX = dx < 0 ? -1 : 1;
            const stepY = dy < 0 ? -1 : 1;

            let sideX = dx < 0 ? (x - mapX) * deltaX : (mapX + 1 - x) * deltaX;
            let sideY = dy < 0 ? (y - mapY) * deltaY : (mapY + 1 - y) * deltaY;

            let side: 0 | 1 = 0;
            while (true) {
                if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
                else { sideY += deltaY; mapY += stepY; side = 1; }

                if (this.level.isSolid(mapX, mapY)) break;
            }

            const dist = side === 0 ? sideX - deltaX : sideY - deltaY;

            let wallX = side === 0 ? y + dist * dy : x + dist * dx;
            wallX -= Math.floor(wallX);

            if ((side === 0 && dx < 0) || (side === 1 && dy > 0)) wallX = 1 - wallX;

            if (dist > MAX_DIST) break;
            if (!this.level.inBounds(mapX, mapY)) break;
            if (!this.level.isSolid(mapX, mapY)) continue;

            const height = TILE_DATA[this.level.tileAt(mapX, mapY)].height;
            const top = (height - EYE) / dist;

            if (top > heighest) {
                hits.push({ dist, side, tileX: mapX, tileY: mapY, wallX, height });
                heighest = top;
            }
            if (height >= this.level.maxHeight) break;
        }

        return hits;
    }

    public getFrame(x: number, y: number, camera: Camera): RayHit[][] {
        const ret: RayHit[][] = [];
        for (let i = 0; i < this.screenWidth; i++) {
            const camX = (2 * i) / this.screenWidth - 1;
            const rel = Math.atan(camX * Math.tan(camera.FOV / 2));
            const a = camera.a + rel;

            const hits = this.cast(x, y, a);
            for (const hit of hits)
                hit.dist *= Math.cos(rel);
            ret.push(hits);
        }
        return ret;
    }

}

