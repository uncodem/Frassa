
export class Camera {
    private readonly TWO_PI = Math.PI * 2;

    public constructor(
        public readonly FOV: number = Math.PI / 2,
        private angle: number = 0,
    ) {}

    get a(): number { return this.angle; }

    public turn(da: number): number {
        this.angle = (((this.angle + da) % this.TWO_PI) + this.TWO_PI) % this.TWO_PI;
        return this.angle;
    }
}

