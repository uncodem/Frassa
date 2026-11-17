
import type { RayHit } from "./raycaster";
import { EYE, MAX_DIST } from "./raycaster";
import { Level, TILE_DATA } from "./level";
import { getTexture, tryGetTexture, tryGetDarkTexture } from "./asset";
import { Player } from "./player";
import { Sprite } from "./sprite";
import type { ProjectedSprite } from "./sprite";

export class Renderer {
    public readonly ctx: CanvasRenderingContext2D;

    constructor(private readonly canvas: HTMLCanvasElement) {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2d <canvas> context.");
        this.ctx = ctx;
    } 

    private projectSprite(p: Player, W: number, H: number, fov: number, sprite: Sprite): ProjectedSprite | null {
        const rx = sprite.x - p.x, ry = sprite.y - p.y;
        const depth = rx * p.dirX + ry * p.dirY;
        const lateral = ry * p.dirX - rx * p.dirY;

        if (depth <= 0.1 || depth > MAX_DIST) return null;

        const screenX = W / 2 * (1 + lateral / (depth * Math.tan(fov/2)));
        const scale = H / depth;

        // TODO: Support non-square sprites
        const hScale = W / (2 * Math.tan(fov / 2)) / depth
        const width = sprite.worldHeight * hScale;

        if (screenX + width/2 < 0 || screenX - width/2 > W) return null;

        return {
            sprite,
            depth,
            screenX,
            scale,
            width,
        };
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
            const src: CanvasImageSource = h.side === 1 ? (tryGetDarkTexture(props.texture!) ?? tex) : tex;
            const texX = Math.min(tex.width - 1, Math.floor(h.wallX * tex.width));
            if (props.repeat) {
                for (let k = 0; k < Math.ceil(height); k++) {
                    const f = Math.min(1, height - k);
                    const dBottom = bottom - k * scale;
                    const dTop = dBottom - f * scale;
                    ctx.drawImage(
                        src,
                        texX, tex.height * (1 - f), 1, tex.height * f,
                        x, dTop, 1, dBottom - dTop,
                    );
                }
            } else {
                ctx.drawImage(src, texX, 0, 1, tex.height, x, top, 1, bottom - top);
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

    private drawSpriteSlice(p: ProjectedSprite, x: number, horizon: number) {
        const s = p.sprite, ctx = this.ctx;
        const bottom = horizon + EYE * p.scale;
        const top = bottom - s.worldHeight * p.scale;
        const left = p.screenX - p.width / 2;
        const tex = (s.texture && tryGetTexture(s.texture)) ? getTexture(s.texture) : undefined;

        if (tex) {
            const texX = Math.min(tex.width - 1, Math.floor(((x - left) / p.width)  * tex.width));
            ctx.drawImage(tex, texX, 0, 1, tex.height, x, top, 1, bottom - top);
        } else {
            ctx.fillStyle = s.color;
            ctx.fillRect(x, top, 1, bottom - top);
        }
    }

    drawFrame(p: Player, level: Level, sprites: Sprite[], columns: RayHit[][]) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const horizon = H / 2;

        this.ctx.fillStyle = "#334"; this.ctx.fillRect(0, 0, W, H / 2);
        this.ctx.fillStyle = "#554"; this.ctx.fillRect(0, H / 2, W, H / 2);

        const projected: ProjectedSprite[] = [];
        for (const s of sprites) {
            const r = this.projectSprite(p, W, H, p.camera.FOV, s);
            if (r) projected.push(r);
        }
        projected.sort((a, b) => b.depth - a.depth);

        const buckets: ProjectedSprite[][] = Array.from({ length: W }, () => []);
        for (const ps of projected) {
            const left = ps.screenX - ps.width / 2;
            const x0 = Math.max(0, Math.floor(left));
            const x1 = Math.min(W - 1, Math.floor(left + ps.width));
            for (let x = x0; x <= x1; x++) buckets[x]!.push(ps);
        }

        for (let x = 0; x < columns.length; x++) {
            const hits = columns[x]!;
            const sp = buckets[x]!;
            let h = hits.length - 1;
            let s = 0;

            while (h >= 0 || s < sp.length) {
                const wallDepth = h >= 0 ? hits[h]!.dist : -Infinity;
                const spriteDepth = s < sp.length ? sp[s]!.depth : -Infinity;
                if (wallDepth >= spriteDepth) this.drawWallSlice(level, hits[h--]!, x, horizon, H);
                else this.drawSpriteSlice(sp[s++]!, x, horizon);
            }
        }
    }
}
