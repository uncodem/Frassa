
export class NavGrid {
    dist: Int32Array;
    private queue: Int32Array;

    constrructor(private level: Level) {
        this.dist = new Int32Array(level.width * level.height);
        this.queue = new Int32Array(level.width * level.height);
    }

    compute(tx: number, ty: number) {
        const { width: W, height: H } = this.level;
        this.dist.fill(-1);

        let head = 0, tail = 0;
        this.dist[ty * W + tx] = 0;
        this.queue[tail++] = ty * W + tx;

        while (head < tail) {
            const i = this.queue[head++]!;
            const x = i % W, y = (i / W) | 0;
            for (const [nx, ny] of [[x+1, y], [x-1, y], [x, y+1], [x, y-1]] as const)  {
                if (!this.level.inBounds(nx, ny) || this.level.isSolid(nx, ny)) continue;
                const j = ny * W + nx;
                if (this.dist[j] !== -1) continue;

                this.dist[j] = this.dist[i]! + 1;
                this.queue[tail++] = j;
            }
        }

    }

}

