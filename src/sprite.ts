
import { Entity } from "./entity";

export class Sprite extends Entity {
    constructor(
        x: number, y: number, w: number, h: number,
        public texture?: TextureId,
        public color: string = "magenta",
        public worldHeight: number = 0.6,
    ) { super(x, y, w, h); }
}

export interface ProjectedSprite {
    sprite: Sprite;
    depth: number;
    screenX: number;
    width: number;
    scale: number;
}

