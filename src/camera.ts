
import { PLAYER, TWO_PI } from "./constants";

export class Camera {
    public constructor(
        public readonly FOV: number = PLAYER.FOV,
        public a: number = 0,
    ) {}

    public turn(da: number): number {
        this.a = (((this.a + da) % TWO_PI) + TWO_PI) % TWO_PI;
        return this.a;
    }
}

