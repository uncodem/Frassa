
import { Level } from "./level";

export class Entity {
    constructor(
        public x: number, // Center x
        public y: number, // Center y
        public w: number, // tile units: 0.0 - 1.0 of tile width
        public h: number, // tile units: 0.0 - 1.0 of tile height 
    ) {}

    get tlx(): number { return this.x - this.w / 2; }
    get tly(): number { return this.y - this.h / 2; }

    public tryMove(level: Level, dx: number, dy: number): boolean {
        let ret = false;
        if (!level.boxHitsSolid(this.x + dx, this.y, this.w, this.h)) {ret = true; this.x += dx;}
        if (!level.boxHitsSolid(this.x, this.y + dy, this.w, this.h)) {ret = true; this.y += dy;}
        return ret;
    }

    public checkCollision(b: Entity): boolean {
        return (
            Math.abs(this.x - b.x) * 2 < this.w + b.w &&
            Math.abs(this.y - b.y) * 2 < this.h + b.h
        );
    }
}

