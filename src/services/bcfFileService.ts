import JSZip from 'jszip';
import type { Context } from 'albatros';
import { parseBcfFile } from '../bcf/parser';
import { serializeBcf } from '../bcf/writer';
import { fileStore, topicStore } from '../store';

let _zip: JSZip | null = null;

export function getZip(): JSZip | null {
    return _zip;
}

export function createNew(): void {
    const zip = new JSZip();
    const projectId = crypto.randomUUID();
    zip.file(
        'bcf.version',
        '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<Version VersionId="2.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="version.xsd">\n' +
        '  <DetailedVersion>2.1</DetailedVersion>\n</Version>',
    );
    zip.file(
        'project.bcfp',
        '<?xml version="1.0" encoding="utf-8"?>\n' +
        '<ProjectExtension xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n' +
        `  <Project ProjectId="${projectId}">\n    <Name></Name>\n  </Project>\n</ProjectExtension>`,
    );
    _zip = zip;
    topicStore.topics = [];
    topicStore.project = { projectId };
    topicStore.selectedTopicGuid = null;
    fileStore.version = '2.1';
    fileStore.fileName = 'новый_файл.bcf';
    fileStore.isDirty = true;
}

export async function save(ctx: Context): Promise<boolean> {
    if (!_zip || !fileStore.fileName) return false;
    let ws;
    try {
        ws = await ctx.saveDialog({
            suggestedName: fileStore.fileName,
            filters: [{ name: 'BCF', extensions: ['bcf'] }],
            folder: false,
        });
    } catch {
        return false;
    }
    if (!ws) return false;
    const statusMsg = ctx.setStatusBarMessage(ctx.tr('Сохранение BCF...'));
    try {
        const blob = await serializeBcf(_zip, topicStore.topics, topicStore.project);
        const buf = await blob.arrayBuffer();
        await ws.root.put(new Uint8Array(buf));
        await ws.flush();
        fileStore.isDirty = false;
        ctx.showMessage(ctx.tr('Файл сохранён'), 'info');
        return true;
    } catch (e) {
        ctx.showMessage(ctx.tr('Ошибка сохранения: {0}', (e as Error).message), 'error');
        return false;
    } finally {
        statusMsg.dispose();
    }
}

export async function open(ctx: Context): Promise<void> {
    const isEmptyNew = fileStore.isDirty && topicStore.topics.length === 0 && fileStore.fileName === 'новый_файл.bcf';
    if (fileStore.isDirty && !isEmptyNew) {
        let wantSave: boolean;
        try {
            await ctx.showMessage(
                ctx.tr('Есть несохранённые изменения. Сохранить файл перед открытием?'),
                'question',
                { resolveTitle: ctx.tr('Сохранить'), rejectTitle: ctx.tr('Открыть без сохранения') },
            );
            wantSave = true;
        } catch {
            wantSave = false;
        }
        if (wantSave) {
            const saved = await save(ctx);
            if (!saved) return;
        }
    }

    let ws;
    try {
        const opened = await ctx.openDialog({
            buttonLabel: 'Открыть',
            filters: [{ name: 'BCF', extensions: ['bcf', 'bcfzip'] }],
        });
        ws = Array.isArray(opened) ? opened[0] : opened;
    } catch {
        return;
    }
    if (!ws) return;

    const statusMsg = ctx.setStatusBarMessage(ctx.tr('Загрузка BCF...'));
    try {
        const data = await ws.root.get();
        const parsed = await parseBcfFile(data, ws.root.title);
        _zip = parsed.zip;
        topicStore.topics = parsed.topics;
        topicStore.project = parsed.project;
        topicStore.selectedTopicGuid = parsed.topics[0]?.guid ?? null;
        fileStore.version = parsed.version;
        fileStore.fileName = parsed.fileName;
        fileStore.isDirty = false;
    } catch (e) {
        ctx.showMessage(ctx.tr('Ошибка загрузки: {0}', (e as Error).message), 'error');
    } finally {
        statusMsg.dispose();
    }
}

export async function close(ctx: Context): Promise<boolean> {
    const isEmptyNew = fileStore.isDirty && topicStore.topics.length === 0 && fileStore.fileName === 'новый_файл.bcf';
    if (fileStore.isDirty && !isEmptyNew) {
        let wantSave: boolean;
        try {
            await ctx.showMessage(
                ctx.tr('Есть несохранённые изменения. Сохранить файл перед закрытием?'),
                'question',
                { resolveTitle: ctx.tr('Сохранить'), rejectTitle: ctx.tr('Закрыть без сохранения') },
            );
            wantSave = true;
        } catch {
            wantSave = false;
        }
        if (wantSave) {
            const saved = await save(ctx);
            if (!saved) return false;
        }
    }
    reset();
    return true;
}

export function reset(): void {
    _zip = null;
    topicStore.topics = [];
    topicStore.project = {};
    topicStore.selectedTopicGuid = null;
    fileStore.version = '2.1';
    fileStore.fileName = null;
    fileStore.isDirty = false;
}
