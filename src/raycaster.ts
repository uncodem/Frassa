
import { Camera } from "./camera";
import { Level, TileType } from "./level";

export interface RayHit {
    dist: number;
    side: 0 | 1;
    tileX: number;
    tileY: number;
    wallX: number;
}

export class Raycaster {
    // Class to just store raycaster settings
    constructor(private level: Level, private screenWidth: number) {}

    private cast(x: number, y: number, a: number): RayHit {
        const dx = Math.cos(a), dy = Math.sin(a);

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

        if ((side === 0 && dx > 0) || (side === 1 && dy < 0)) wallX = 1 - wallX;
        
        return {
            dist,
            side,
            tileX: mapX,
            tileY: mapY,
            wallX,
        };
    }

    public getFrame(x: number, y: number, camera: Camera): RayHit[] {
        for (let i = 0; i < this.screenWidth; i++) {
            const camX = (2 * i) / this.screenWidth;
            const rel = Math.atan(camX * Math.tan(camera.FOV / 2));
            const a = camera.angle + rel;

            this.cast(x, y, a);
        }
    }

}

