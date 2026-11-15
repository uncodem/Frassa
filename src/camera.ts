
export class Camera {
    public constructor(
        public readonly FOV: number = Math.PI / 2,
        public angle: number = 0,
    ) {}

    public turn(da: number): number {
        this.angle += da;
        return this.angle;
    }
}

