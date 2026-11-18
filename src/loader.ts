
import { Level, TileType } from "./level";
import { Bot } from "./bot";
import { Sprite, Pickup, PickupType, Teleporter } from "./sprite";
import { Player } from "./player";
import { TextureId } from "./asset";

import { PLAYER, TILE_CENTER, PICKUP } from "./constants";

export interface MapFile {
    version: 1;
    floors: World[];
}

export interface World {
    level: Level;
    spawnList: MapCommand[];
}

export type MapCommand = 
    | { type: "player"; x: number; y: number; angle?: number }
    | { type: "bot"; x: number; y: number; w: number; h: number; speed: number; color: string, worldHeight: number, behavior?: string; texture?: string }
    | { type: "pickup"; kind: string; x: number; y: number; texture?: string }
    | { type: "teleporter"; x: number; y: number; tx: number; ty: number; floor: number; angle?: number; texture?: string }
    | { type: "sprite"; x: number; y: number; w: number; h: number; color?: string; texture?: string; worldHeight?: number }

interface ParsedWorld {
    width: number;
    height: number;
    tiles: number[];
    commands: MapCommand[];
};

function isTileType(value: unknown): value is TileType {
    return typeof value === 'number' && (Object.values(TileType) as number[]).includes(value);
}

function isTextureId(value: unknown): value is TextureId {
    return typeof value === 'string' && (Object.values(TextureId) as string[]).includes(value);
}

function isPickupType(value: unknown): value is PickupType {
    return typeof value === 'string' && (Object.values(PickupType) as string[]).includes(value);
}

export function parseMap(worldString: string): World {
    const parsed = JSON.parse(worldString) as ParsedWorld;
    /* TODO: Make loader accept 2d array instead of 1d
    if (parsed.width !== parsed.tiles[0]!.length || parsed.height !== parsed.tiles.length) {
        console.log(parsed.width, parsed.height, parsed.tiles.length);
        throw new Error("Malformed level string");
    }
    */
    if (parsed.tiles.length !== parsed.width * parsed.height) throw new Error("Level string does not conform to dimensions");
    if (!parsed.tiles.every(isTileType)) throw new Error("Level contains invalid tile data");

    const tiles = Array.from({length: Math.ceil(parsed.tiles.length / parsed.width)}, (_, i) => parsed.tiles.slice(i * parsed.width, i * parsed.width + parsed.width));

//    if (!parsed.tiles.every(row => Array.isArray(row) && row.every(isTileType))) throw new Error("Level contains invalid data");

    const level = new Level(tiles as TileType[][]);

    return {
        level,
        spawnList: parsed.commands,
    }
}

export function spawnWorld(world: World): {player: Player, bots: Bot[], sprites: Sprite[], pickups: Pickup[]} {
    const pCmd = world.spawnList.find(({type: t}) => t === "player");
    if (!pCmd) throw new Error("World contains no player spawner");

    const player = new Player(pCmd.x+TILE_CENTER, pCmd.y+TILE_CENTER, PLAYER.SIZE, PLAYER.SIZE);
    if (pCmd.type === "player" && pCmd.angle) player.setAngle(pCmd.angle);

    const bots: Bot[] = [];
    const sprites: Sprite[] = [];
    const pickups: Pickup[] = [];

    for (const cmd of world.spawnList) {
        switch (cmd.type) {
            case "player": continue;
            case "bot": 
                if (cmd.texture && !isTextureId(cmd.texture))
                    throw new Error("Bot spawn command contains invalid texture");
                bots.push(new Bot(player, cmd.x+TILE_CENTER, cmd.y+TILE_CENTER, cmd.w, cmd.h, cmd.color, cmd.speed, cmd.texture as TextureId, cmd.worldHeight));
                break;
            case "sprite":
                if (cmd.texture && !isTextureId(cmd.texture))
                    throw new Error("Sprite spawn command contains invalid texture");
                sprites.push(new Sprite(cmd.x+TILE_CENTER, cmd.y+TILE_CENTER, cmd.w, cmd.h, cmd.texture as TextureId, cmd.color, cmd.worldHeight));
                break;
            case "pickup":
                if (!isPickupType(cmd.kind) || cmd.kind === "teleporter")
                    throw new Error("Pickup spawn command contains invalid type");
                if (cmd.texture && !isTextureId(cmd.texture))
                    throw new Error("Pickup spawn command contains invalid texture");
                pickups.push(new Pickup(cmd.kind as PickupType, cmd.x+TILE_CENTER, cmd.y+TILE_CENTER, (cmd.kind === PickupType.Page) ? PICKUP.PAGE_COLOR : PICKUP.KEY_COLOR, cmd.texture as TextureId));
                break;
            case "teleporter":
                if (cmd.texture && !isTextureId(cmd.texture))
                    throw new Error("Teleporter spawn command contains invalid texture");
                pickups.push(new Teleporter(cmd.x + TILE_CENTER, cmd.y + TILE_CENTER, cmd.tx, cmd.ty, cmd.floor, cmd.angle, cmd.texture as TextureId));
                break;
        }
    }
    return {
        player,
        bots,
        sprites,
        pickups,
    };
}

