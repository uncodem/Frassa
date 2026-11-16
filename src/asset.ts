export const asset = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;

export const TextureId = {
    Wall: "wall",
    Wall2: "wall2",
    Wall3: "wall3",
    Glass: "glass",
    Platypus: "platypus"
} as const;
export type TextureId = (typeof TextureId)[keyof typeof TextureId];

const FILES: Record<TextureId, string> = {
    [TextureId.Wall]: "wall.png",
    [TextureId.Wall2]: "wall2.png",
    [TextureId.Wall3]: "wall3.png",
    [TextureId.Glass]: "glass.png",
    [TextureId.Platypus]: "platypus.png",
};

const loaded = new Map<TextureId, HTMLImageElement>();
const loadedDark = new Map<TextureId, HTMLCanvasElement>();

function makeDark(img: HTMLImageElement): HTMLCanvasElement {
    const ret = document.createElement("canvas");
    ret.width = img.width; ret.height = img.height;
    const ctx = ret.getContext("2d");
    if (!ctx) throw new Error("makeDark: Could not get 2d canvas context.");
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0,0,ret.width, ret.height);
    return ret;
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });
}

export async function loadAssets(): Promise<void> {
    const entries = Object.entries(FILES) as [TextureId, string][];
    const imgs = await Promise.all(entries.map(([, f]) => loadImage(asset(f))));
    entries.forEach(([id], i) => {
        loaded.set(id, imgs[i]!);
        loadedDark.set(id, makeDark(imgs[i]!));
    })
}

export function getTexture(id: TextureId): HTMLImageElement {
    const img = loaded.get(id);
    if (!img) throw new Error(`Texture ${id} not loaded`);
    return img;
}

export function tryGetTexture(id: TextureId): boolean {
    const img = loaded.get(id);
    if (!img) return false;
    return true;
}

export function tryGetDarkTexture(id: TextureId): HTMLCanvasElement | undefined {
    return loadedDark.get(id);
}

