export const TILE_CENTER = 0.5;

const MAX_DIST = 24;
export const TWO_PI = Math.PI * 2;

export const RENDER = {
    WIDTH: 480, HEIGHT: 270,
    EYE: 0.5,
    MAX_DIST,
    MAX_STEPS: MAX_DIST * 2 + 16,
    MAX_HITS: 8,
    NEAR_CLIP: 0.1,
    SIDE_SHADE: 0.35,
    SKY: "#334", FLOOR: "#554",
} as const;

export const PLAYER = { SIZE: 0.3, MOVE_SPEED: 3, TURN_SPEED: 2.5, FOV: Math.PI / 2 } as const
export const INPUT = { MOUSE_SENSE: 0.001, MOUSE_SPIKE_LIMIT: 200, MAX_DT: 0.05 } as const
export const GAME = { CATCH_RADIUS: 0.45, PICKUP_RADIUS: 0.5 } as const;
export const PICKUP = { SIZE: 0.3, HEIGHT: 0.4, PAGE_COLOR: "red", KEY_COLOR: "gold" }
export const ENTITY = { WORLD_HEIGHT: 0.6, COLOR: "magenta" }
