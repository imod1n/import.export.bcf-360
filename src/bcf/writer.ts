import JSZip from 'jszip';
import type { BcfTopic, BcfProject, BcfViewpoint, BcfComment } from './types';

function xmlEscape(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function serializeMarkup(topic: BcfTopic): string {
    const comments = topic.comments.map(c => `  <Comment Guid="${xmlEscape(c.guid)}">
    <Date>${xmlEscape(c.date)}</Date>
    <Author>${xmlEscape(c.author)}</Author>
    <Comment>${xmlEscape(c.comment)}</Comment>${c.viewpointGuid ? `\n    <Viewpoint Guid="${xmlEscape(c.viewpointGuid)}"/>` : ''}${c.modifiedDate ? `\n    <ModifiedDate>${xmlEscape(c.modifiedDate)}</ModifiedDate>` : ''}${c.modifiedAuthor ? `\n    <ModifiedAuthor>${xmlEscape(c.modifiedAuthor)}</ModifiedAuthor>` : ''}
  </Comment>`).join('\n');

    const viewpoints = topic.viewpoints.map(vp => `  <Viewpoints Guid="${xmlEscape(vp.guid)}">
    <Viewpoint>${xmlEscape(vp.viewpointFile)}</Viewpoint>${vp.snapshotFile ? `\n    <Snapshot>${xmlEscape(vp.snapshotFile)}</Snapshot>` : ''}
  </Viewpoints>`).join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<Markup xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Topic Guid="${xmlEscape(topic.guid)}" TopicStatus="${xmlEscape(topic.status)}"${topic.topicType ? ` TopicType="${xmlEscape(topic.topicType)}"` : ''}>
    <Title>${xmlEscape(topic.title)}</Title>${topic.description ? `\n    <Description>${xmlEscape(topic.description)}</Description>` : ''}${topic.priority ? `\n    <Priority>${xmlEscape(topic.priority)}</Priority>` : ''}${topic.assignedTo ? `\n    <AssignedTo>${xmlEscape(topic.assignedTo)}</AssignedTo>` : ''}
    <CreationDate>${xmlEscape(topic.creationDate)}</CreationDate>
    <CreationAuthor>${xmlEscape(topic.creationAuthor)}</CreationAuthor>${topic.modifiedDate ? `\n    <ModifiedDate>${xmlEscape(topic.modifiedDate)}</ModifiedDate>` : ''}${topic.modifiedAuthor ? `\n    <ModifiedAuthor>${xmlEscape(topic.modifiedAuthor)}</ModifiedAuthor>` : ''}${topic.dueDate ? `\n    <DueDate>${xmlEscape(topic.dueDate)}</DueDate>` : ''}${topic.index !== undefined ? `\n    <Index>${topic.index}</Index>` : ''}
  </Topic>
${comments}
${viewpoints}
</Markup>`;
}

function serializeViewpoint(vp: BcfViewpoint): string {
    const components = vp.components.map(c =>
        `      <Component IfcGuid="${xmlEscape(c.ifcGuid)}">${c.originatingSystem ? `\n        <OriginatingSystem>${xmlEscape(c.originatingSystem)}</OriginatingSystem>` : ''}${c.authoringToolId ? `\n        <AuthoringToolId>${xmlEscape(c.authoringToolId)}</AuthoringToolId>` : ''}
      </Component>`
    ).join('\n');

    let cameraXml = '';
    if (vp.camera) {
        const { viewPoint, direction, upVector, fieldOfView } = vp.camera;
        cameraXml = `  <PerspectiveCamera>
    <CameraViewPoint>
      <X>${viewPoint[0]}</X><Y>${viewPoint[1]}</Y><Z>${viewPoint[2]}</Z>
    </CameraViewPoint>
    <CameraDirection>
      <X>${direction[0]}</X><Y>${direction[1]}</Y><Z>${direction[2]}</Z>
    </CameraDirection>
    <CameraUpVector>
      <X>${upVector[0]}</X><Y>${upVector[1]}</Y><Z>${upVector[2]}</Z>
    </CameraUpVector>
    <FieldOfView>${fieldOfView ?? 60}</FieldOfView>
  </PerspectiveCamera>`;
    }

    const componentsXml = vp.components.length > 0
        ? `  <Components>\n    <Selection>\n${components}\n    </Selection>\n  </Components>\n`
        : '';

    return `<?xml version="1.0" encoding="utf-8"?>
<VisualizationInfo Guid="${xmlEscape(vp.guid)}">
${componentsXml}${cameraXml}
</VisualizationInfo>`;
}

function platformJsonName(viewpointFile: string): string {
    return viewpointFile.replace(/\.[^.]+$/, '.json');
}

export async function serializeBcf(
    zip: JSZip,
    topics: BcfTopic[],
    project: BcfProject,
): Promise<Blob> {
    for (const topic of topics) {
        const folder = `${topic.guid}/`;
        zip.file(`${folder}markup.bcf`, serializeMarkup(topic));

        for (const vp of topic.viewpoints) {
            if (vp.viewpointFile) {
                zip.file(`${folder}${vp.viewpointFile}`, serializeViewpoint(vp));
                if (vp.camera?.platformData) {
                    zip.file(`${folder}${platformJsonName(vp.viewpointFile)}`, JSON.stringify(vp.camera.platformData));
                }
            }
        }
    }

    return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

export function createNewTopicFolder(
    zip: JSZip,
    topic: BcfTopic,
    snapshotBlob?: Blob,
): void {
    const folder = `${topic.guid}/`;
    zip.file(`${folder}markup.bcf`, serializeMarkup(topic));

    for (const vp of topic.viewpoints) {
        if (vp.viewpointFile) {
            zip.file(`${folder}${vp.viewpointFile}`, serializeViewpoint(vp));
            if (vp.camera?.platformData) {
                zip.file(`${folder}${platformJsonName(vp.viewpointFile)}`, JSON.stringify(vp.camera.platformData));
            }
        }
        if (snapshotBlob && vp.snapshotFile) {
            zip.file(`${folder}${vp.snapshotFile}`, snapshotBlob);
        }
    }
}

export function buildViewpointFromCamera(
    vpGuid: string,
    position: [number, number, number],
    direction: [number, number, number],
    up: [number, number, number],
    ifcGuids: string[],
    platformData?: any,
): BcfViewpoint {
    return {
        guid: vpGuid,
        viewpointFile: 'viewpoint.bcfv',
        components: ifcGuids.map(g => ({ ifcGuid: g })),
        camera: {
            viewPoint: position,
            direction,
            upVector: up,
            fieldOfView: 60,
            platformData,
        },
    };
}
