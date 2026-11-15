import { Entity } from "./entity";
import { Camera } from "./camera";
import { Level } from "./level";

export class Player extends Entity {
    private pages: number;
    private cam: Camera;
    private dx: number;
    private dy: number;

    constructor(
        x: number,
        y: number,
        w: number,
        h: number,
        private speed: number = 0.5
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

    move(level: Level, amnt: number) {
        this.tryMove(level, this.dx * this.speed * amnt, this.dy * this.speed * amnt);
    }
}

