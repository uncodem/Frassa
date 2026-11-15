export const asset = (p: string): string => `${import.meta.env.BASE_URL}assets/${p}`;

export const TextureId = {
    Wall: "wall",
} as const;
export type TextureId = (typeof TextureId)[keyof typeof TextureId];

const FILES: Record<TextureId, string> = {
    [TextureId.Wall]: "wall.png",
};

const loaded = new Map<TextureId, HTMLImageElement>();

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
    entries.forEach(([id], i) => loaded.set(id, imgs[i]!));
}

export function getTexture(id: TextureId): HTMLImageElement {
    const img = loaded.get(id);
    if (!img) throw new Error(`Texture ${id} not loaded`);
    return img;
}


