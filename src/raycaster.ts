
import { Camera } from "./camera";
import { Level, TileType, TILE_DATA } from "./level";
import { RENDER } from "./constants";

export interface RayHit {
    dist: number;
    side: 0 | 1;
    tileX: number;
    tileY: number;
    wallX: number;
    height: number;
}

export class Raycaster {
    // Class to just store raycaster settings
    constructor(private level: Level, private screenWidth: number) {}

    private cast(x: number, y: number, a: number, cosRel: number): RayHit[] {
        const hits: RayHit[] = [];
        const dx = Math.cos(a), dy = Math.sin(a);

        let mapX = Math.floor(x), mapY = Math.floor(y);
        const deltaX = Math.abs(1 / dx), deltaY = Math.abs(1 / dy);
        const stepX = dx < 0 ? -1 : 1, stepY = dy < 0 ? -1 : 1;
        let sideX = dx < 0 ? (x - mapX) * deltaX : (mapX + 1 - x) * deltaX;
        let sideY = dy < 0 ? (y - mapY) * deltaY : (mapY + 1 - y) * deltaY;

        let highest = -Infinity;

        for (let n = 0; n < RENDER.MAX_STEPS && hits.length < RENDER.MAX_HITS; n++) {
            let side: 0 | 1;
            if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
            else               { sideY += deltaY; mapY += stepY; side = 1; }

            if (!this.level.inBounds(mapX, mapY)) break;

            const rawDist = side === 0 ? sideX - deltaX : sideY - deltaY;
            const dist = rawDist * cosRel;               // perpendicular distance
            if (dist > RENDER.MAX_DIST) break;

            const tile = this.level.tileAt(mapX, mapY);

            if (tile === TileType.Empty) continue;

            const props = TILE_DATA[tile];
            const height = props.height;
            const top = (height - RENDER.EYE) / dist;

            if (top > highest) {
                let wallX = side === 0 ? y + rawDist * dy : x + rawDist * dx;
                wallX -= Math.floor(wallX);
                if ((side === 0 && dx < 0) || (side === 1 && dy > 0)) wallX = 1 - wallX;

                hits.push({ dist, side, tileX: mapX, tileY: mapY, wallX, height });
                if(!props.transparent) highest = top;
            }

            if (!props.transparent && props.height >= this.level.maxHeight) break;
        }
        return hits;
    }

    public getFrame(x: number, y: number, camera: Camera): RayHit[][] {
        const ret: RayHit[][] = [];
        for (let i = 0; i < this.screenWidth; i++) {
            const camX = (2 * i) / this.screenWidth - 1;
            const rel = Math.atan(camX * Math.tan(camera.FOV / 2));
            const a = camera.a + rel;

            const hits = this.cast(x, y, a, Math.cos(rel));
            ret.push(hits);
        }
        return ret;
    }

}

