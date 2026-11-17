import type { TextureId } from "./asset";
import { Entity } from "./entity";
import { ENTITY, PICKUP } from "./constants";

export class Sprite extends Entity {
    constructor(
        x: number, y: number, w: number, h: number,
        public texture?: TextureId,
        public color: string = ENTITY.COLOR,
        public worldHeight: number = ENTITY.WORLD_HEIGHT,
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
    constructor (public readonly kind: PickupType, x: number, y: number, color: string, texture?: TextureId) {
        super (x, y, PICKUP.SIZE, PICKUP.SIZE, texture, color, PICKUP.HEIGHT);
    }
}

