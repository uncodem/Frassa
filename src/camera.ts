
export class Camera {
    private readonly TWO_PI = Math.PI * 2;

    public constructor(
        public readonly FOV: number = Math.PI / 2,
        private angle: number = 0,
    ) {}

    get a(): number { return this.angle; }

    public turn(da: number): number {
        this.angle += da;

        if (this.angle < 0) this.angle += this.TWO_PI;
        else if (this.angle >= this.TWO_PI) this.angle -= this.TWO_PI;

        return this.angle;
    }
}

