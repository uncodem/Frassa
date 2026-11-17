
import { Level, TileType } from "./level";
import { Bot } from "./bot";
import { Sprite } from "./sprite";
import { Player } from "./player";
import { TextureId } from "./asset";

export interface MapFile {
    version: 1;
}

export interface World {
    level: Level;
    spawnList: MapCommand[];
}

export type MapCommand = 
    | { type: "player"; x: number; y: number; angle?: number }
    | { type: "bot"; x: number; y: number; behavior?: string; speed?: number; texture?: string }
    | { type: "pickup"; kind: "page" | "key"; x: number; y: number }
    | { type: "sprite"; x: number; y: number; texture?: string; worldHeight?: number }
    | { type: "stairs"; x: number; y: number; to: number };

interface ParsedWorld {
    width: number;
    height: number;
    tiles: number[][];
    commands: MapCommand[];
};

function isTileType(value: unknown): value is TileType {
    return typeof value === 'number' && (Object.values(TileType) as number[]).includes(value);
}

function isTextureId(value: unknown): value is TextureId {
    return typeof value === 'string' && (Object.values(TextureId) as string[]).includes(value);
}

export function parseMap(worldString: string): World {
    const parsed = JSON.parse(worldString) as ParsedWorld;
    if (parsed.width !== parsed.tiles[0]!.length || parsed.height !== parsed.tiles.length) throw new Error("Malformed level string");

    if (!parsed.tiles.every(row => Array.isArray(row) && row.every(isTileType))) throw new Error("Level contains invalid data");

    const level = new Level(parsed.tiles as TileType[][]);

    return {
        level,
        spawnList: parsed.commands,
    }
}

