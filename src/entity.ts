export class Entity {
    constructor(
        public x: number, // Center x
        public y: number, // Center y
        public w: number, // tile units: 0.0 - 1.0 of tile width
        public h: number, // tile units: 0.0 - 1.0 of tile height 
    ) {}

    get tlx(): number { return this.x - this.w / 2; }
    get tly(): number { return this.y - this.h / 2; }

    public checkCollision(b: Entity): boolean {
        return (
            Math.abs(this.x - b.x) * 2 < this.w + b.w &&
            Math.abs(this.y - b.y) * 2 < this.h + b.h
        );
    }
}

