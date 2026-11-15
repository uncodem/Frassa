import { Entity } from "./entity";
import { Camera } from "./camera";

export class Player extends Entity {
    private pages: number;
    private cam: Camera;

    constructor(
        x: number,
        y: number,
        w: number,
        h: number
    ) {
        super(x,y,w,h);
        this.pages = 0;
        this.cam = new Camera();
    }

    get camera(): Camera {
        return this.cam;
    }

    turn(da: number) {
        this.cam.turn(da);
    }

}

