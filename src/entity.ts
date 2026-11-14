export class Entity {
    constructor(
        public x: number,
        public y: number,
        public w: number,
        public h: number
    ) {}

    public checkCollision(b: Entity): boolean {
        return (
            this.x < b.x + b.w &&
            this.x + this.w > b.x &&
            this.y < b.y + b.h &&
            this.y + this.h > b.y
        );
    }
}

