import { TextureId } from "./asset";
import { Sprite } from "./sprite";
import { Player } from "./player";
import { NavGrid } from "./nav";

import { TILE_CENTER, ENTITY } from "./constants";

export class Bot extends Sprite {
    constructor(
        x: number, y: number, w: number, h: number,
        color: string,
        public speed: number,
        texture?: TextureId,
        worldHeight: number = ENTITY.WORLD_HEIGHT,
    ) {
        super(x,y,w,h,texture,color,worldHeight);
    }

    update(dt: number, nav: NavGrid, player: Player) {
        const W = nav.width;
        const tx = Math.floor(this.x), ty = Math.floor(this.y);
        const here = nav.dist[ty * W + tx]!;

        let targetX: number, targetY: number;
        if (here === 0) {
            targetX = player.x; targetY = player.y;
        } else if (here === -1) {
            return;
        } else {
            let best = here, bx = tx, by = ty;
            for (const [nx, ny] of [[tx+1, ty], [tx-1,ty], [tx, ty+1], [tx, ty-1]] as const) {
                if (!nav.level.inBounds(nx,ny)) continue;
                const d = nav.dist[ny * W + nx]!;
                if (d !== -1 && d < best) { best = d; bx = nx; by = ny; }
            }
            targetX = bx + TILE_CENTER; targetY = by + TILE_CENTER;
        }

        const dx = targetX - this.x, dy = targetY - this.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) return;
        const step = Math.min(len, this.speed * dt);
        this.tryMove(nav.level, dx / len * step, dy / len * step);
    }
}

