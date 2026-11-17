import { TextureId } from "./asset";
import { Sprite } from "./sprite";
import { Player } from "./player";

export class Bot extends Sprite {
    constructor(
        private readonly player: Player,
        x: number, y: number, w: number, h: number,
        color: string,
        texture?: TextureId,
        worldHeight: number = 0.6,
    ) {
        super(x,y,w,h,texture,color,worldHeight);
    }

    update(dt: number) {
        if (this.x > this.player.x) this.x -= dt;
        else if (this.x < this.player.x) this.x += dt;

        if (this.y > this.player.y) this.y -= dt;
        else if (this.y < this.player.y) this.y += dt;
    }
}

