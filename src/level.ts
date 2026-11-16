
import { TextureId } from "./asset";

export const TileType = {
    Empty: 0,
    Wall: 1,
    Wall2: 2,
    Wall3: 3,
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export interface TileProperties {
    solid: boolean;
    color: string;
    height: number;
    texture?: TextureId;
    repeat?: boolean;
    transparent?: boolean;
}

export const TILE_DATA: Record<TileType, TileProperties> = {
    [TileType.Empty] : { solid: false, height: 1, color: "#000" },
    [TileType.Wall]: { solid: true, height: 1, color: "red", texture: TextureId.Wall },
    [TileType.Wall2]: { solid: true, height: 2, color: "blue", repeat: true, texture: TextureId.Wall2 },
    [TileType.Wall3]: { solid: true, height: 15, color: "yellow", texture: TextureId.Wall3 },
} satisfies Record<TileType, TileProperties>;

export class Level {
    readonly width: number;
    readonly height: number;

    readonly maxHeight: number = Math.max(...Object.values(TILE_DATA).filter(t => t.solid).map(t => t.height ?? 1));

    constructor(public readonly grid: TileType[][]) {
        if (grid.length === 0 || grid[0] === undefined) throw new Error("Malformed level");
        this.height = grid.length;
        this.width = grid[0].length;
    }

    tileAt(x: number, y: number): TileType {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return TileType.Wall;
        }
        return this.grid[y]?.[x] ?? TileType.Wall;
    }

    isSolid(x: number, y: number): boolean {
        return TILE_DATA[this.tileAt(x, y)].solid;
    }

    inBounds(mapX: number, mapY: number): boolean {
        return mapX < this.width && mapX >= 0 && mapY < this.height && mapY >= 0;
    }

    boxHitsSolid(cx: number, cy: number, w: number, h: number): boolean {
        const x0 = Math.floor(cx - w / 2), x1 = Math.floor(cx + w / 2);
        const y0 = Math.floor(cy - h / 2), y1 = Math.floor(cy + h / 2);
        for (let ty = y0; ty <= y1; ty++)
            for (let tx = x0; tx <= x1; tx++)
                if (this.isSolid(tx, ty)) return true;
        return false;
    }

}

