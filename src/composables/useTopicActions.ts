import type { Context } from 'albatros';
import { fileStore, topicStore, uiStore } from '../store';
import * as bcfFileService from '../services/bcfFileService';
import { createNewTopicFolder, buildViewpointFromCamera } from '../bcf/writer';
import type { BcfTopic } from '../bcf/types';

export function markDirty(topicGuid: string): void {
    const topic = topicStore.topics.find(t => t.guid === topicGuid);
    if (topic) topic.modifiedDate = new Date().toISOString();
    fileStore.isDirty = true;
}

export async function deleteTopic(guid: string, ctx: Context): Promise<void> {
    try {
        await ctx.showMessage(
            ctx.tr('Удалить замечание? Это действие необратимо.'),
            'question',
            { destructive: true, resolveTitle: ctx.tr('Удалить'), rejectTitle: ctx.tr('Отмена') },
        );
    } catch {
        return;
    }
    bcfFileService.getZip()?.remove(`${guid}/`);
    topicStore.topics = topicStore.topics.filter(t => t.guid !== guid);
    if (topicStore.selectedTopicGuid === guid) {
        topicStore.selectedTopicGuid = topicStore.topics[0]?.guid ?? null;
    }
    fileStore.isDirty = true;
}

export async function editTopicFields(topic: BcfTopic, ctx: Context): Promise<void> {
    const hasSnapshot = !!topic.snapshotDataUrl;
    const snapshotLabel = hasSnapshot ? ctx.tr('Заменить изображение') : ctx.tr('Добавить изображение');

    const choice = await ctx.showQuickPick(
        [
            { label: ctx.tr('Редактировать заголовок'), description: topic.title },
            { label: ctx.tr('Редактировать описание'), description: topic.description || '—' },
            { label: snapshotLabel },
        ],
        { title: ctx.tr('Редактирование замечания'), placeHolder: ctx.tr('Выберите поле') },
    );

    const chosen = (choice as any)?.label;
    if (chosen === ctx.tr('Редактировать заголовок')) {
        const val = await ctx.showInputBox({
            title: ctx.tr('Заголовок'),
            value: topic.title,
            validateInput: (v: string) => v.trim() ? undefined : ctx.tr('Заголовок не может быть пустым'),
        });
        if (val?.trim()) { topic.title = val.trim(); markDirty(topic.guid); }
    } else if (chosen === ctx.tr('Редактировать описание')) {
        const val = await ctx.showInputBox({
            title: ctx.tr('Описание'),
            value: topic.description ?? '',
            placeHolder: ctx.tr('Подробное описание замечания'),
        });
        if (val !== undefined) { topic.description = val.trim() || undefined; markDirty(topic.guid); }
    } else if (chosen === snapshotLabel) {
        let ws;
        try {
            const opened = await ctx.openDialog({
                buttonLabel: ctx.tr('Выбрать'),
                filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg'] }],
            });
            ws = Array.isArray(opened) ? opened[0] : opened;
        } catch { return; }
        if (!ws) return;

        const data = await ws.root.get();
        const blob = new Blob([data], { type: ws.root.mimeType || 'image/png' });
        topic.snapshotDataUrl = await blobToDataUrl(blob);

        const zip = bcfFileService.getZip();
        if (zip) {
            let vp = topic.viewpoints[0];
            if (!vp) {
                vp = { guid: crypto.randomUUID(), viewpointFile: 'viewpoint.bcfv', snapshotFile: 'snapshot.png', components: [] };
                topic.viewpoints.push(vp);
            }
            if (!vp.snapshotFile) vp.snapshotFile = 'snapshot.png';
            zip.file(`${topic.guid}/${vp.snapshotFile}`, data);
        }
        markDirty(topic.guid);
    }
}

export async function createTopic(ctx: Context): Promise<void> {
    const zip = bcfFileService.getZip();
    if (!uiStore.newTopic.title.trim() || !zip) return;

    const guid = crypto.randomUUID();
    const now = new Date().toISOString();
    const author = uiStore.username || (ctx.manager as any)?.username || 'Unknown';

    const vpGuid = crypto.randomUUID();
    const viewpoint = buildViewpointFromCamera(
        vpGuid,
        uiStore.capturedCamera?.viewPoint ?? [0, 0, 0],
        uiStore.capturedCamera?.direction ?? [0, 0, -1],
        uiStore.capturedCamera?.upVector ?? [0, 1, 0],
        uiStore.capturedGuids,
        uiStore.capturedCamera?.platformData,
        uiStore.capturedSmdxUuids,
    );
    if (!uiStore.capturedCamera) viewpoint.camera = undefined;
    if (uiStore.newSnapshotBlob) viewpoint.snapshotFile = 'snapshot.png';

    const topic: BcfTopic = {
        guid,
        title: uiStore.newTopic.title.trim(),
        description: uiStore.newTopic.description.trim() || undefined,
        status: uiStore.newTopic.status,
        topicType: uiStore.newTopic.topicType || undefined,
        priority: uiStore.newTopic.priority || undefined,
        assignedTo: uiStore.newTopic.assignedTo.trim() || undefined,
        creationDate: now,
        creationAuthor: author,
        comments: [],
        viewpoints: [viewpoint],
        snapshotDataUrl: uiStore.newSnapshotBlob
            ? await blobToDataUrl(uiStore.newSnapshotBlob)
            : undefined,
    };

    createNewTopicFolder(zip, topic, uiStore.newSnapshotBlob ?? undefined);
    topicStore.topics.push(topic);
    fileStore.isDirty = true;
    topicStore.selectedTopicGuid = guid;
    uiStore.createFormVisible = false;
    ctx.showMessage(ctx.tr('Замечание создано'), 'info');
}

export function addComment(topic: BcfTopic, text: string, ctx: Context): void {
    topic.comments.push({
        guid: crypto.randomUUID(),
        date: new Date().toISOString(),
        author: uiStore.username || (ctx.manager as any)?.username || 'Unknown',
        comment: text,
    });
    markDirty(topic.guid);
}

export async function deleteComment(topic: BcfTopic, commentGuid: string, ctx: Context): Promise<void> {
    try {
        await ctx.showMessage(
            ctx.tr('Удалить комментарий?'),
            'question',
            { resolveTitle: ctx.tr('Удалить'), rejectTitle: ctx.tr('Отмена') },
        );
    } catch {
        return;
    }
    topic.comments = topic.comments.filter(c => c.guid !== commentGuid);
    markDirty(topic.guid);
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
