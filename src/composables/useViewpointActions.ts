import type { Context } from 'albatros';
import { toBlob as domToBlob } from 'html-to-image';
import { fileStore, uiStore } from '../store';
import * as bcfFileService from '../services/bcfFileService';
import { buildViewpointFromCamera } from '../bcf/writer';
import { markDirty } from './useTopicActions';
import type { BcfTopic, BcfViewpoint } from '../bcf/types';

export async function tryCanvasCapture(ctx: Context): Promise<Blob | null> {
    const cadview = ctx.cadview;

    // 1. Repaint + toDataURL synchronously — reads WebGL framebuffer before it's cleared.
    cadview?.repaint();
    const canvases = Array.from(document.querySelectorAll('canvas'));
    if (!canvases.length) return null;
    const glCanvas = canvases.reduce((a, b) =>
        a.width * a.height > b.width * b.height ? a : b
    );

    let webglDataUrl: string;
    try {
        webglDataUrl = glCanvas.toDataURL('image/png');
        if (webglDataUrl.length < 5000) return null;
    } catch { return null; }

    // 2. Find container holding annotation overlays as siblings of the canvas.
    let container: HTMLElement = glCanvas;
    for (let i = 0; i < 5; i++) {
        const p = container.parentElement;
        if (!p || p === document.body) break;
        container = p;
        if (Array.from(container.children).some(c => c.tagName !== 'CANVAS')) break;
    }

    const hasOverlays = Array.from(container.children).some(c => c.tagName !== 'CANVAS');
    if (!hasOverlays) {
        return fetch(webglDataUrl).then(r => r.blob()).catch(() => null);
    }

    // 3. Preload the captured WebGL frame.
    const webglImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = webglDataUrl;
    });

    // 4. html-to-image cannot read a WebGL canvas with preserveDrawingBuffer=false.
    //    Temporarily swap it with a plain 2D canvas containing the captured frame,
    //    let html-to-image render the composite, then restore the original.
    const parent = glCanvas.parentElement;
    if (!parent) return fetch(webglDataUrl).then(r => r.blob()).catch(() => null);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = glCanvas.width;
    tempCanvas.height = glCanvas.height;
    tempCanvas.className = glCanvas.className;
    tempCanvas.style.cssText = glCanvas.style.cssText;
    tempCanvas.getContext('2d')?.drawImage(webglImg, 0, 0);
    parent.replaceChild(tempCanvas, glCanvas);

    try {
        const blob = await domToBlob(container, { pixelRatio: 1 });
        return blob ?? null;
    } catch {
        return fetch(webglDataUrl).then(r => r.blob()).catch(() => null);
    } finally {
        parent.replaceChild(glCanvas, tempCanvas);
    }
}

export async function captureViewpoint(ctx: Context): Promise<void> {
    const cadview = ctx.cadview;
    if (!cadview) {
        ctx.showMessage(ctx.tr('Нет активного вида'), 'warning');
        return;
    }

    let stored: any;
    try {
        stored = cadview.storeView();
    } catch {
        ctx.showMessage(ctx.tr('Не удалось захватить вид'), 'error');
        return;
    }

    // Deep copy immediately — preserves id + pivot, avoids platform buffer mutation
    const snap = JSON.parse(JSON.stringify(stored));
    const pos: [number, number, number] = [snap.position[0], snap.position[1], snap.position[2]];
    const dir: [number, number, number] = [snap.dir[0], snap.dir[1], snap.dir[2]];
    const up:  [number, number, number] = [snap.up[0],  snap.up[1],  snap.up[2]];

    uiStore.capturedCamera = { viewPoint: pos, direction: dir, upVector: up, fieldOfView: 60, platformData: snap };

    const blob = await tryCanvasCapture(ctx);
    if (blob) {
        uiStore.newSnapshotBlob = blob;
        uiStore.newSnapshotName = 'snapshot.png';
    }

    // Automatically capture current selection (IFC or SMDX, silent — empty list is valid)
    const guids: string[] = [];
    const smdxUuids: string[] = [];
    const seen = new Set<string>();
    try {
        for (const obj of cadview.layer.selectedObjects()) {
            const layer = (obj as any)?.layer ?? obj;
            let ifcId: string | undefined;
            if (typeof layer?.typedValueExpanded === 'function') {
                try {
                    const v = layer.typedValueExpanded('ifc.id')?.$value;
                    if (v) ifcId = String(v);
                } catch { /* ignore */ }
            }
            if (ifcId) {
                if (!seen.has(ifcId)) { seen.add(ifcId); guids.push(ifcId); }
            } else {
                const uuid = (layer as any)?.UUID;
                if (uuid && typeof uuid === 'string' && !seen.has(uuid)) {
                    seen.add(uuid);
                    smdxUuids.push(uuid);
                }
            }
        }
    } catch { /* ignore */ }
    uiStore.capturedGuids = guids;
    uiStore.capturedSmdxUuids = smdxUuids;

    ctx.showMessage(ctx.tr('Вид захвачен'), 'info');
}

export async function navigateViewpoint(vp: BcfViewpoint, ctx: Context): Promise<void> {
    const cadview = ctx.cadview;
    if (!cadview) {
        ctx.showMessage(ctx.tr('Нет активного вида'), 'warning');
        return;
    }

    const cadLayer = cadview.layer as any;
    try { cadLayer.clearSelected(); } catch { /* ignore */ }

    const guidSet = new Set(vp.components.map(c => c.ifcGuid));
    if (guidSet.size > 0) {
        let matchCount = 0;
        try {
            cadLayer.selectObjects((obj: any) => {
                const layer = obj?.layer ?? obj;
                if (typeof layer?.typedValueExpanded !== 'function') return false;
                try {
                    const id = layer.typedValueExpanded('ifc.id')?.$value;
                    if (id && guidSet.has(String(id))) { matchCount++; return true; }
                } catch { /* ignore */ }
                return false;
            }, true);
        } catch { /* ignore */ }
        if (matchCount === 0) {
            ctx.showMessage(ctx.tr('IFC-компоненты не найдены в текущей модели'), 'warning');
        }
    }

    const uuidSet = new Set((vp.smdxComponents ?? []).map(c => c.uuid));
    if (uuidSet.size > 0) {
        let matchCount = 0;
        try {
            cadLayer.selectObjects((obj: any) => {
                const layer = obj?.layer ?? obj;
                const uuid = (layer as any)?.UUID;
                if (uuid && uuidSet.has(String(uuid))) { matchCount++; return true; }
                return false;
            }, true);
        } catch { /* ignore */ }
        if (matchCount === 0) {
            ctx.showMessage(ctx.tr('SMDX-элементы не найдены в текущей модели'), 'warning');
        }
    }

    if (vp.camera) {
        if (vp.camera.platformData) {
            const raw = JSON.parse(JSON.stringify(vp.camera.platformData));
            cadview.restoreView(raw);
        } else {
            const pos    = vp.camera.viewPoint as [number, number, number];
            const dir    = vp.camera.direction as [number, number, number];
            const up     = vp.camera.upVector  as [number, number, number];
            const target: [number, number, number] = [pos[0] + dir[0], pos[1] + dir[1], pos[2] + dir[2]];
            cadview.lookAt(pos, target, up, false);
        }
    }
}

function collectSelection(cadview: any): { guids: string[]; smdxUuids: string[] } {
    const guids: string[] = [];
    const smdxUuids: string[] = [];
    const seen = new Set<string>();
    try {
        for (const obj of cadview.layer.selectedObjects()) {
            const layer = (obj as any)?.layer ?? obj;
            let ifcId: string | undefined;
            if (typeof layer?.typedValueExpanded === 'function') {
                try {
                    const v = layer.typedValueExpanded('ifc.id')?.$value;
                    if (v) ifcId = String(v);
                } catch { /* ignore */ }
            }
            if (ifcId) {
                if (!seen.has(ifcId)) { seen.add(ifcId); guids.push(ifcId); }
            } else {
                const uuid = (layer as any)?.UUID;
                if (uuid && typeof uuid === 'string' && !seen.has(uuid)) {
                    seen.add(uuid);
                    smdxUuids.push(uuid);
                }
            }
        }
    } catch { /* ignore */ }
    return { guids, smdxUuids };
}

export async function addViewpoint(topic: BcfTopic, ctx: Context): Promise<void> {
    const cadview = ctx.cadview;
    if (!cadview) {
        ctx.showMessage(ctx.tr('Нет активного вида'), 'warning');
        return;
    }

    let stored: any;
    try {
        stored = cadview.storeView();
    } catch {
        ctx.showMessage(ctx.tr('Не удалось захватить вид'), 'error');
        return;
    }
    const snap = JSON.parse(JSON.stringify(stored));
    const { guids, smdxUuids } = collectSelection(cadview);

    const vpGuid = crypto.randomUUID();
    const viewpoint = buildViewpointFromCamera(
        vpGuid,
        [snap.position[0], snap.position[1], snap.position[2]],
        [snap.dir[0], snap.dir[1], snap.dir[2]],
        [snap.up[0], snap.up[1], snap.up[2]],
        guids,
        snap,
        smdxUuids,
    );

    const zip = bcfFileService.getZip();
    const snapshotBlob = await tryCanvasCapture(ctx);
    if (snapshotBlob && zip) {
        viewpoint.snapshotFile = 'snapshot.png';
        zip.file(`${topic.guid}/snapshot.png`, snapshotBlob);
        topic.snapshotDataUrl = await blobToDataUrl(snapshotBlob);
    }

    topic.viewpoints.push(viewpoint);
    markDirty(topic.guid);
    ctx.showMessage(ctx.tr('Вид добавлен'), 'info');
}

export async function replaceViewpoint(vp: BcfViewpoint, topic: BcfTopic, ctx: Context): Promise<void> {
    const cadview = ctx.cadview;
    if (!cadview) {
        ctx.showMessage(ctx.tr('Нет активного вида'), 'warning');
        return;
    }

    let stored: any;
    try {
        stored = cadview.storeView();
    } catch {
        ctx.showMessage(ctx.tr('Не удалось захватить вид'), 'error');
        return;
    }
    const snap = JSON.parse(JSON.stringify(stored));
    const { guids: newGuids, smdxUuids: newSmdxUuids } = collectSelection(cadview);

    // Resolve IFC components
    const existingGuids = new Set(vp.components.map(c => c.ifcGuid));
    const freshGuids = newGuids.filter(g => !existingGuids.has(g));
    let newComponents = vp.components;

    if (newGuids.length === 0) {
        if (vp.components.length > 0) {
            const choice = await ctx.showQuickPick(
                [
                    { label: ctx.tr('Оставить прежний список'), description: ctx.tr('Элементов: {0}', vp.components.length) },
                    { label: ctx.tr('Обнулить список элементов') },
                ],
                { title: ctx.tr('Выделенные IFC-элементы'), placeHolder: ctx.tr('Нет выделения в модели') },
            );
            if ((choice as any)?.label === ctx.tr('Обнулить список элементов')) newComponents = [];
        }
    } else {
        const isIdentical = freshGuids.length === 0 && newGuids.length === vp.components.length;
        if (!isIdentical) {
            const items: { label: string; description?: string }[] = [
                { label: ctx.tr('Заменить на выделенные'), description: ctx.tr('Элементов: {0}', newGuids.length) },
            ];
            if (freshGuids.length > 0) {
                items.push({ label: ctx.tr('Дополнить выделенными'), description: ctx.tr('+{0} новых, итого: {1}', freshGuids.length, vp.components.length + freshGuids.length) });
            }
            items.push({ label: ctx.tr('Оставить прежний список'), description: ctx.tr('Элементов: {0}', vp.components.length) });
            const choice = await ctx.showQuickPick(items, {
                title: ctx.tr('Выделенные IFC-элементы'),
                placeHolder: ctx.tr('Выделено в модели: {0}', newGuids.length),
            });
            const chosen = (choice as any)?.label;
            if (chosen === ctx.tr('Заменить на выделенные')) {
                newComponents = newGuids.map(g => ({ ifcGuid: g }));
            } else if (chosen === ctx.tr('Дополнить выделенными')) {
                newComponents = [...vp.components, ...freshGuids.map(g => ({ ifcGuid: g }))];
            }
        }
    }

    // Resolve SMDX components
    const existingSmdxUuids = new Set((vp.smdxComponents ?? []).map(c => c.uuid));
    const freshSmdxUuids = newSmdxUuids.filter(u => !existingSmdxUuids.has(u));
    const existingSmdxCount = vp.smdxComponents?.length ?? 0;
    let newSmdxComponents = vp.smdxComponents;

    if (newSmdxUuids.length === 0) {
        if (existingSmdxCount > 0) {
            const choice = await ctx.showQuickPick(
                [
                    { label: ctx.tr('Оставить прежний список'), description: ctx.tr('Элементов: {0}', existingSmdxCount) },
                    { label: ctx.tr('Обнулить список элементов') },
                ],
                { title: ctx.tr('Выделенные SMDX-элементы'), placeHolder: ctx.tr('Нет выделения в модели') },
            );
            if ((choice as any)?.label === ctx.tr('Обнулить список элементов')) newSmdxComponents = [];
        }
    } else {
        const isIdentical = freshSmdxUuids.length === 0 && newSmdxUuids.length === existingSmdxCount;
        if (!isIdentical) {
            const items: { label: string; description?: string }[] = [
                { label: ctx.tr('Заменить на выделенные'), description: ctx.tr('Элементов: {0}', newSmdxUuids.length) },
            ];
            if (freshSmdxUuids.length > 0) {
                items.push({ label: ctx.tr('Дополнить выделенными'), description: ctx.tr('+{0} новых, итого: {1}', freshSmdxUuids.length, existingSmdxCount + freshSmdxUuids.length) });
            }
            items.push({ label: ctx.tr('Оставить прежний список'), description: ctx.tr('Элементов: {0}', existingSmdxCount) });
            const choice = await ctx.showQuickPick(items, {
                title: ctx.tr('Выделенные SMDX-элементы'),
                placeHolder: ctx.tr('Выделено в модели: {0}', newSmdxUuids.length),
            });
            const chosen = (choice as any)?.label;
            if (chosen === ctx.tr('Заменить на выделенные')) {
                newSmdxComponents = newSmdxUuids.map(u => ({ uuid: u }));
            } else if (chosen === ctx.tr('Дополнить выделенными')) {
                newSmdxComponents = [...(vp.smdxComponents ?? []), ...freshSmdxUuids.map(u => ({ uuid: u }))];
            }
        }
    }

    vp.camera = {
        viewPoint: [snap.position[0], snap.position[1], snap.position[2]],
        direction: [snap.dir[0], snap.dir[1], snap.dir[2]],
        upVector:  [snap.up[0],  snap.up[1],  snap.up[2]],
        fieldOfView: 60,
        platformData: snap,
    };
    vp.components = newComponents;
    vp.smdxComponents = newSmdxComponents?.length ? newSmdxComponents : undefined;

    const zip = bcfFileService.getZip();
    const snapshotBlob = await tryCanvasCapture(ctx);
    if (snapshotBlob && zip) {
        if (!vp.snapshotFile) vp.snapshotFile = 'snapshot.png';
        zip.file(`${topic.guid}/${vp.snapshotFile}`, snapshotBlob);
        topic.snapshotDataUrl = await blobToDataUrl(snapshotBlob);
    }

    markDirty(topic.guid);
    ctx.showMessage(ctx.tr('Вид заменён'), 'info');
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
