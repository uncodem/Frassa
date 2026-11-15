
export class Camera {
    private readonly TWO_PI = Math.PI * 2;

    public constructor(
        public readonly FOV: number = Math.PI / 2,
        public angle: number = 0,
    ) {}

    public turn(da: number): number {
        this.angle += da;

        if (this.angle < 0) this.angle += this.TWO_PI;
        else if (this.angle >= this.TWO_PI) this.angle -= this.TWO_PI;

        return this.angle;
    }
}

