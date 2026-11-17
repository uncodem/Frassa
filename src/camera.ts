
import { PLAYER, TWO_PI } from "./constants";

export class Camera {
    public constructor(
        public readonly FOV: number = PLAYER.FOV,
        private angle: number = 0,
    ) {}

    get a(): number { return this.angle; }

    public turn(da: number): number {
        this.angle = (((this.angle + da) % TWO_PI) + TWO_PI) % TWO_PI;
        return this.angle;
    }
}

