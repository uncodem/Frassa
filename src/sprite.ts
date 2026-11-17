import type { TextureId } from "./asset";
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

export const PickupType = {
    Key: "key",
    Page: "page"
} as const;

export type PickupType = (typeof PickupType)[keyof typeof PickupType];

export class Pickup extends Sprite {
    constructor (public readonly kind: PickupType, x: number, y: number, texture?: TextureId, color: string = "gold") {
        super (x, y, 0.3, 0.3, texture, color, 0.4);
    }
}

