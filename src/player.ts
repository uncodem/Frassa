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

        this.dx = 1;
        this.dy = 0;
    }

    get camera(): Camera {
        return this.cam;
    }

    turn(da: number) {
        const na = this.cam.turn(da);
        this.dx = Math.cos(na);
        this.dy = Math.sin(na);
    }

}

