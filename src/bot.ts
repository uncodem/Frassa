import { TextureId } from "./asset.ts";
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

    update() {
        if (this.x > this.player.x) this.x -= 0.1;
        else if (this.x < this.player.x) this.x += 0.1;

        if (this.y > this.player.y) this.y -= 0.1;
        else if (this.y < this.player.y) this.y += 0.1;
    }
}

