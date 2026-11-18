import { Entity } from "./entity";
import { Camera } from "./camera";
import { Level } from "./level";
import { PLAYER } from "./constants";

export class Player extends Entity {
    private pages: number;
    private cam: Camera;

    constructor(
        x: number,
        y: number,
        w: number,
        h: number,
        private moveSpeed: number = PLAYER.MOVE_SPEED,
        private turnSpeed: number = PLAYER.TURN_SPEED,
    ) {
        super(x,y,w,h);
        this.pages = 0;
        this.cam = new Camera();
    }

    get camera(): Camera {
        return this.cam;
    }

    get dx(): number { return Math.cos(this.cam.a); }
    get dy(): number { return Math.sin(this.cam.a); }

    turn(da: number) {
        const na = this.cam.turn(da * this.turnSpeed);
    }

    setAngle(na: number) {
        this.cam.a = na;
    }

    move(level: Level, amnt: number) {
        this.tryMove(level, this.dx * this.moveSpeed * amnt, this.dy * this.moveSpeed * amnt);
    }

    strafe (level: Level, amnt: number) {
        const a = this.cam.a;
        const dx = -Math.sin(a), dy = Math.cos(a);
        this.tryMove(level, dx * this.moveSpeed * amnt, dy * this.moveSpeed * amnt);

    }

}

