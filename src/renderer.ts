
export class Renderer {
    private readonly context: CanvasRenderingContext2D;
    constructor(private readonly canvas: HTMLCanvasElement) {
        this.context = canvas.getContext("2d");
    }
}

