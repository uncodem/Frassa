
import type { RayHit } from "./raycaster";
import { EYE } from "./raycaster";
import { Level, TILE_DATA } from "./level";
import { getTexture, tryGetTexture } from "./asset";

export class Renderer {
    private readonly ctx: CanvasRenderingContext2D;

    constructor(private readonly canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2d <canvas> context.");
        this.ctx = ctx;
    }

    private makeDark(img: HTMLImageElement): HTMLCanvasElement {
        const ret = document.createElement("canvas");
        ret.width = img.width; ret.height = img.height;
        const ctx = ret.getContext("2d");
        if (!ctx) throw new Error("makeDark: Could not get 2d canvas context.");
        ctx.drawImage(img, 0, 0);
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(0,0,ret.width, ret.height);
        return ret;
    }

    private drawWallSlice(level: Level, h: RayHit, x: number, horizon: number, H: number) {
        const ctx = this.ctx;
        const props = TILE_DATA[level.tileAt(h.tileX, h.tileY)];
        const height = props.height;

        const scale = H / Math.max(h.dist, 0.0001);
        const bottom = horizon + EYE * scale;
        const top = horizon - (height - EYE) * scale;
        const textured = props.texture && tryGetTexture(props.texture);

        if (textured) {
            const tex = getTexture(props.texture!);
            const texX = Math.min(tex.width - 1, Math.floor(h.wallX * tex.width));
            if (props.repeat) {
                for (let k = 0; k < Math.ceil(height); k++) {
                    const f = Math.min(1, height - k);
                    const dBottom = bottom - k * scale;
                    const dTop = dBottom - f * scale;
                    ctx.drawImage(
                        tex,
                        texX, tex.height * (1 - f), 1, tex.height * f,
                        x, dTop, 1, dBottom - dTop,
                    );
                }
            } else {
                ctx.drawImage(tex, texX, 0, 1, tex.height, x, top, 1, bottom - top);
            }
            if (h.side === 1) {
                // ctx.drawImage(this.makeDark(tex), texX, 0, 1, tex.height, x, top, 1, bottom - top);
            }
        } else {
            ctx.fillStyle = props.color;
            ctx.fillRect(x, top, 1, bottom - top);
            if (h.side === 1) {
                ctx.fillStyle = "rgba(0,0,0,0.35)";
                ctx.fillRect(x, top, 1, bottom - top);
            }
        }
    }

    drawFrame(level: Level, columns: RayHit[][]) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const horizon = H / 2;

        this.ctx.fillStyle = "#334"; this.ctx.fillRect(0, 0, W, H / 2);
        this.ctx.fillStyle = "#554"; this.ctx.fillRect(0, H / 2, W, H / 2);

        for (let i = 0; i < columns.length; i++) {
            const hits = columns[i]!;
            for (let j = hits.length - 1; j >= 0; j--) {
                this.drawWallSlice(level, hits[j]!, i, horizon, H);
            }
        }
    }
}

