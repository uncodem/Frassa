
import type { RayHit } from "./raycaster";
import { Level, TILE_DATA } from "./level";
import { getTexture } from "./asset";

export class Renderer {
    private readonly ctx: CanvasRenderingContext2D;

    constructor(private readonly canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2d <canvas> context.");
        this.ctx = ctx;
    }

    drawFrame(level: Level, hits: RayHit[]) {
        const W = this.canvas.width;
        const H = this.canvas.height;

        this.ctx.fillStyle = "#334"; this.ctx.fillRect(0, 0, W, H / 2);
        this.ctx.fillStyle = "#554"; this.ctx.fillRect(0, H / 2, W, H / 2);

        for (let i = 0; i < hits.length; i++) {
            const h = hits[i]!;
            const lineH = H / Math.max(h.dist, 0.0001);
            const top = H / 2 - lineH / 2;
            const props = TILE_DATA[level.tileAt(h.tileX, h.tileY)];

            if (props.texture) {
                const tex = getTexture(props.texture);
                const texX = Math.min(tex.width - 1, Math.floor(h.wallX * tex.width));
                this.ctx.drawImage(tex, texX, 0, 1, tex.height, i, top, 1, lineH);
            } else {
                this.ctx.fillStyle = props.color;
                this.ctx.fillRect(i, top, 1, lineH);
            }

            if (h.side === 1) {
                this.ctx.fillStyle = "rgba(0,0,0,0.35)";
                this.ctx.fillRect(i, top, 1, lineH);
            }
        }
    }
}

