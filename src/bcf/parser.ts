import JSZip from 'jszip';
import type { BcfTopic, BcfProject, BcfComment, BcfViewpoint, BcfComponent, BcfCamera } from './types';

function parseXml(xml: string): Document {
    return new DOMParser().parseFromString(xml, 'application/xml');
}

function getText(el: Element | null, tag: string): string {
    if (!el) return '';
    const child = el.querySelector(tag);
    return child?.textContent?.trim() ?? '';
}

function parseViewpointXml(xml: string, viewpointGuid: string, snapshotFile?: string): BcfViewpoint {
    const doc = parseXml(xml);
    const root = doc.documentElement;

    const components: BcfComponent[] = [];
    doc.querySelectorAll('Selection > Component').forEach(c => {
        const ifcGuid = c.getAttribute('IfcGuid') ?? c.getAttribute('ifcGuid') ?? '';
        if (ifcGuid) {
            components.push({
                ifcGuid,
                originatingSystem: c.querySelector('OriginatingSystem')?.textContent?.trim(),
                authoringToolId: c.querySelector('AuthoringToolId')?.textContent?.trim(),
            });
        }
    });

    let camera: BcfCamera | undefined;

    const perspective = doc.querySelector('PerspectiveCamera');
    if (perspective) {
        const vp = perspective.querySelector('CameraViewPoint');
        const dir = perspective.querySelector('CameraDirection');
        const up = perspective.querySelector('CameraUpVector');
        if (vp && dir && up) {
            camera = {
                viewPoint: [
                    parseFloat(getText(vp, 'X') || '0'),
                    parseFloat(getText(vp, 'Y') || '0'),
                    parseFloat(getText(vp, 'Z') || '0'),
                ],
                direction: [
                    parseFloat(getText(dir, 'X') || '0'),
                    parseFloat(getText(dir, 'Y') || '0'),
                    parseFloat(getText(dir, 'Z') || '0'),
                ],
                upVector: [
                    parseFloat(getText(up, 'X') || '0'),
                    parseFloat(getText(up, 'Y') || '0'),
                    parseFloat(getText(up, 'Z') || '1'),
                ],
                fieldOfView: parseFloat(getText(perspective, 'FieldOfView') || '60'),
            };
        }
    }

    const ortho = doc.querySelector('OrthogonalCamera');
    if (!camera && ortho) {
        const vp = ortho.querySelector('CameraViewPoint');
        const dir = ortho.querySelector('CameraDirection');
        const up = ortho.querySelector('CameraUpVector');
        if (vp && dir && up) {
            camera = {
                viewPoint: [
                    parseFloat(getText(vp, 'X') || '0'),
                    parseFloat(getText(vp, 'Y') || '0'),
                    parseFloat(getText(vp, 'Z') || '0'),
                ],
                direction: [
                    parseFloat(getText(dir, 'X') || '0'),
                    parseFloat(getText(dir, 'Y') || '0'),
                    parseFloat(getText(dir, 'Z') || '0'),
                ],
                upVector: [
                    parseFloat(getText(up, 'X') || '0'),
                    parseFloat(getText(up, 'Y') || '0'),
                    parseFloat(getText(up, 'Z') || '1'),
                ],
            };
        }
    }

    const guidAttr = root.getAttribute('Guid') ?? viewpointGuid;

    return { guid: guidAttr, snapshotFile, viewpointFile: '', components, camera };
}

function parseMarkupXml(xml: string): Pick<BcfTopic, 'guid' | 'title' | 'description' | 'status' | 'topicType' | 'priority' | 'assignedTo' | 'creationDate' | 'creationAuthor' | 'modifiedDate' | 'modifiedAuthor' | 'dueDate' | 'index' | 'comments'> & { viewpointRefs: Array<{ guid: string; file: string; snapshotFile?: string }> } {
    const doc = parseXml(xml);

    const topicEl = doc.querySelector('Topic');
    const guid = topicEl?.getAttribute('Guid') ?? crypto.randomUUID();

    const comments: BcfComment[] = [];
    doc.querySelectorAll('Markup > Comment').forEach(c => {
        const comment = c.querySelector('Comment')?.textContent?.trim() ?? c.querySelector('Text')?.textContent?.trim() ?? '';
        comments.push({
            guid: c.querySelector('Guid')?.textContent?.trim() ?? c.getAttribute('Guid') ?? crypto.randomUUID(),
            date: c.querySelector('Date')?.textContent?.trim() ?? new Date().toISOString(),
            author: c.querySelector('Author')?.textContent?.trim() ?? '',
            comment,
            viewpointGuid: c.querySelector('Viewpoint')?.getAttribute('Guid') ?? undefined,
            modifiedDate: c.querySelector('ModifiedDate')?.textContent?.trim(),
            modifiedAuthor: c.querySelector('ModifiedAuthor')?.textContent?.trim(),
        });
    });

    const viewpointRefs: Array<{ guid: string; file: string; snapshotFile?: string }> = [];
    doc.querySelectorAll('Viewpoints').forEach(el => {
        if (el.hasAttribute('Guid')) {
            // BCF 2.1: <Viewpoints Guid="..."> — сам вьюпоинт
            const file = el.querySelector('Viewpoint')?.textContent?.trim() ?? '';
            const snapshot = el.querySelector('Snapshot')?.textContent?.trim();
            const vpGuid = el.getAttribute('Guid')!;
            if (file) viewpointRefs.push({ guid: vpGuid, file, snapshotFile: snapshot });
        } else {
            // Старый формат: <Viewpoints> — контейнер с <ViewPoint> детьми
            el.querySelectorAll('ViewPoint').forEach(vp => {
                const file = vp.querySelector('Viewpoint')?.textContent?.trim() ?? '';
                const snapshot = vp.querySelector('Snapshot')?.textContent?.trim();
                const vpGuid = vp.querySelector('Guid')?.textContent?.trim()
                    ?? vp.getAttribute('Guid') ?? crypto.randomUUID();
                if (file) viewpointRefs.push({ guid: vpGuid, file, snapshotFile: snapshot });
            });
        }
    });

    const indexText = getText(topicEl, 'Index');

    return {
        guid,
        title: getText(topicEl, 'Title'),
        description: getText(topicEl, 'Description') || undefined,
        status: topicEl?.getAttribute('TopicStatus') ?? getText(topicEl, 'TopicStatus') ?? 'Open',
        topicType: topicEl?.getAttribute('TopicType') ?? getText(topicEl, 'TopicType') ?? undefined,
        priority: getText(topicEl, 'Priority') || undefined,
        assignedTo: getText(topicEl, 'AssignedTo') || undefined,
        creationDate: getText(topicEl, 'CreationDate') ?? new Date().toISOString(),
        creationAuthor: getText(topicEl, 'CreationAuthor') ?? '',
        modifiedDate: getText(topicEl, 'ModifiedDate') || undefined,
        modifiedAuthor: getText(topicEl, 'ModifiedAuthor') || undefined,
        dueDate: getText(topicEl, 'DueDate') || undefined,
        index: indexText ? parseInt(indexText, 10) : undefined,
        comments,
        viewpointRefs,
    };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export interface ParsedBcf {
    project: BcfProject;
    topics: BcfTopic[];
    version: string;
    zip: JSZip;
    fileName: string;
}

export async function parseBcfFile(data: Uint8Array, fileName: string): Promise<ParsedBcf> {
    const zip = await JSZip.loadAsync(data);

    let version = '2.1';
    const versionFile = zip.file('bcf.version');
    if (versionFile) {
        const versionXml = await versionFile.async('string');
        const vDoc = parseXml(versionXml);
        version = vDoc.querySelector('Version')?.getAttribute('VersionId') ?? '2.1';
    }

    const project: BcfProject = {};
    const projectFile = zip.file('project.bcfp');
    if (projectFile) {
        const projXml = await projectFile.async('string');
        const pDoc = parseXml(projXml);
        project.projectId = pDoc.querySelector('Project')?.getAttribute('ProjectId') ?? undefined;
        project.name = pDoc.querySelector('Name')?.textContent?.trim() ?? undefined;
    }

    const topicFolders = new Set<string>();
    zip.forEach((relativePath) => {
        const parts = relativePath.split('/');
        if (parts.length >= 2 && parts[0].length > 0) {
            topicFolders.add(parts[0]);
        }
    });

    const topics: BcfTopic[] = [];

    for (const folder of topicFolders) {
        const markupFile = zip.file(`${folder}/markup.bcf`);
        if (!markupFile) continue;

        const markupXml = await markupFile.async('string');
        const parsed = parseMarkupXml(markupXml);
        const { viewpointRefs, ...topicData } = parsed;

        const folderFiles: string[] = [];
        zip.forEach((path) => { if (path.startsWith(`${folder}/`)) folderFiles.push(path); });

        const viewpoints: BcfViewpoint[] = [];

        for (const vpRef of viewpointRefs) {
            const vpFile = zip.file(`${folder}/${vpRef.file}`);
            if (!vpFile) continue;
            const vpXml = await vpFile.async('string');
            const vp = parseViewpointXml(vpXml, vpRef.guid, vpRef.snapshotFile);
            vp.viewpointFile = vpRef.file;

            const jsonName = vpRef.file.replace(/\.[^.]+$/, '.json');
            const jsonFile = zip.file(`${folder}/${jsonName}`);
            if (jsonFile && vp.camera) {
                try {
                    vp.camera.platformData = JSON.parse(await jsonFile.async('string'));
                } catch { /* ignore malformed sidecar */ }
            }

            viewpoints.push(vp);
        }

        let snapshotDataUrl: string | undefined;
        const firstVpWithSnapshot = viewpointRefs.find(v => v.snapshotFile);

        if (firstVpWithSnapshot?.snapshotFile) {
            const snapshotFile = zip.file(`${folder}/${firstVpWithSnapshot.snapshotFile}`);
            if (snapshotFile) {
                const blob = await snapshotFile.async('blob');
                snapshotDataUrl = await blobToDataUrl(blob);
            }
        } else {
            // Снимок не указан в viewpointRefs — ищем любой png/jpg в папке напрямую
            const imgPath = folderFiles.find(p => /\.(png|jpg|jpeg)$/i.test(p));
            if (imgPath) {
                const snapshotFile = zip.file(imgPath);
                if (snapshotFile) {
                    const blob = await snapshotFile.async('blob');
                    snapshotDataUrl = await blobToDataUrl(blob);
                }
            }
        }

        topics.push({ ...topicData, viewpoints, snapshotDataUrl });
    }

    topics.sort((a, b) => {
        if (a.index !== undefined && b.index !== undefined) return a.index - b.index;
        return a.creationDate.localeCompare(b.creationDate);
    });

    return { project, topics, version, zip, fileName };
}
