
import { Level } from "./level";
import { Bot } from "./bot";
import { Sprite } from "./sprite";
import { Player } from "./player";

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

export function parseMap(worldString: string): World {
    const parsed = JSON.parse(worldString) as ParsedWorld;
}

