
import { Level, TileType } from "./level";
import { Bot } from "./bot";
import { Sprite, Pickup, PickupType } from "./sprite";
import { Player } from "./player";
import { TextureId } from "./asset";

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
    | { type: "pickup"; kind: "page" | "key"; x: number; y: number }
    | { type: "sprite"; x: number; y: number; w: number; h: number; color?: string; texture?: string; worldHeight?: number }
    | { type: "stairs"; x: number; y: number; to: number };

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

    const player = new Player(pCmd.x+0.5, pCmd.y+0.5, 0.3, 0.3);
    if (pCmd.type === "player" && pCmd.angle) player.setAngle(pCmd.angle);

    const bots: Bot[] = [];
    const sprites: Sprite[] = [];

    // TODO: Allow textured pickups
    for (const cmd of world.spawnList) {
        switch (cmd.type) {
            case "player": continue;
            case "bot": 
                if (cmd.texture && !isTextureId(cmd.texture))
                    throw new Error("Bot spawn command contains invalid texture");
                bots.push(new Bot(player, cmd.x+0.5, cmd.y+0.5, cmd.w, cmd.h, "magenta", cmd.speed, cmd.texture as TextureId, cmd.worldHeight));
                break;
            case "sprite":
                if (cmd.texture && !isTextureId(cmd.texture))
                    throw new Error("Sprite spawn command contains invalid texture");
                sprites.push(new Sprite(cmd.x+0.5, cmd.y+0.5, cmd.w, cmd.h, cmd.texture as TextureId, cmd.color, cmd.worldHeight));
                break;
            case "pickup":
                
                break;
        }
    }
    return {
        player,
        bots,
        sprites,
    };
}

