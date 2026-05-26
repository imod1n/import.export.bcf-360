<template>
  <div class="bcf-panel">

    <!-- Toolbar -->
    <div class="bcf-toolbar">
      <span class="bcf-filename" :title="store.fileName ?? ''">
        {{ store.fileName ?? $tr('Файл не открыт') }}
      </span>
      <div class="bcf-toolbar-actions">
        <button class="bcf-tbtn" @click="openFile" :title="$tr('Открыть BCF-файл')">
          Открыть
        </button>
        <button class="bcf-tbtn" @click="saveFile" :disabled="!store.isDirty || !store.zip" :title="$tr('Сохранить')">
          Сохранить
        </button>
        <button class="bcf-tbtn bcf-tbtn--primary" @click="showCreateForm" :disabled="!store.zip" :title="$tr('Создать топик')">
          + Создать
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!store.zip" class="bcf-empty">
      <div class="bcf-empty-icon">📋</div>
      <p>{{ $tr('Откройте BCF-файл для просмотра замечаний') }}</p>
      <button class="bcf-btn-primary" @click="openFile">{{ $tr('Открыть BCF') }}</button>
    </div>

    <!-- Main workspace -->
    <div v-else class="bcf-workspace">

      <!-- Left: topic list -->
      <div class="bcf-list">
        <div v-if="store.topics.length === 0" class="bcf-list-empty">
          {{ $tr('Замечания отсутствуют') }}
        </div>
        <div
          v-for="topic in store.topics"
          :key="topic.guid"
          class="bcf-item"
          :class="{ 'bcf-item--selected': store.selectedTopicGuid === topic.guid }"
          @click="selectTopic(topic.guid)"
        >
          <div
            class="bcf-item-thumb"
            :class="{ 'bcf-item-thumb--clickable': !!topic.snapshotDataUrl }"
            @click.stop="onThumbClick(topic)"
          >
            <img v-if="topic.snapshotDataUrl" :src="topic.snapshotDataUrl" alt="" />
            <div v-else class="bcf-item-thumb-empty"></div>
          </div>
          <div class="bcf-item-body">
            <div class="bcf-item-title">{{ topic.title }}</div>
            <div class="bcf-item-meta">
              <span class="bcf-badge" :class="statusClass(topic.status)">{{ topic.status }}</span>
              <span v-if="topic.priority" class="bcf-item-priority">{{ topic.priority }}</span>
            </div>
            <div v-if="topic.assignedTo" class="bcf-item-assignee">{{ topic.assignedTo }}</div>
          </div>
        </div>
      </div>

      <!-- Right: create form -->
      <div v-if="createFormVisible" class="bcf-detail bcf-create">

        <div class="d-flex w-100 view-header align-center">
          <span class="font-weight-bold">{{ $tr('Новое замечание') }}</span>
          <button class="bcf-close-btn" style="margin-left:auto" @click="createFormVisible = false">✕</button>
        </div>

        <div class="bcf-section" style="flex:1;overflow-y:auto">
          <div class="bcf-prop-row">
            <label>{{ $tr('Заголовок') }} *</label>
            <input v-model="newTopic.title" class="bcf-input" type="text" autofocus />
          </div>
          <div class="bcf-prop-row bcf-prop-row--top">
            <label>{{ $tr('Описание') }}</label>
            <textarea v-model="newTopic.description" class="bcf-textarea" rows="3"></textarea>
          </div>
          <div class="bcf-prop-row">
            <label>{{ $tr('Статус') }}</label>
            <select v-model="newTopic.status" class="bcf-select">
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="bcf-prop-row">
            <label>{{ $tr('Приоритет') }}</label>
            <select v-model="newTopic.priority" class="bcf-select">
              <option value="">—</option>
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div class="bcf-prop-row">
            <label>{{ $tr('Ответственный') }}</label>
            <input v-model="newTopic.assignedTo" class="bcf-input" type="text" />
          </div>
          <div class="bcf-prop-row">
            <label>{{ $tr('Снимок (PNG/JPG)') }}</label>
            <button class="bcf-outline-btn" @click="pickSnapshot">
              {{ newSnapshotName ?? $tr('Выбрать файл') }}
            </button>
          </div>
          <div class="bcf-prop-row">
            <label>{{ $tr('Камера из вида') }}</label>
            <button class="bcf-outline-btn" @click="captureViewpoint" :title="$tr('Захватить текущую позицию камеры')">
              {{ capturedCamera ? $tr('Захвачено') : $tr('Захватить вид') }}
            </button>
          </div>
          <div class="bcf-prop-row">
            <label>{{ $tr('IFC-компоненты') }}</label>
            <button class="bcf-outline-btn" @click="captureSelection" :title="$tr('Добавить выделенные IFC-объекты')">
              {{ capturedGuids.length > 0 ? $tr('{0} объектов', capturedGuids.length) : $tr('Из выделения') }}
            </button>
          </div>
        </div>

        <div class="bcf-create-foot">
          <button class="bcf-outline-btn" @click="createFormVisible = false">{{ $tr('Отмена') }}</button>
          <button class="bcf-btn-primary" :disabled="!newTopic.title.trim()" @click="createTopic">
            {{ $tr('Создать') }}
          </button>
        </div>

      </div>

      <!-- Right: detail -->
      <div class="bcf-detail" v-else-if="selectedTopic">

        <!-- Header -->
        <div class="bcf-detail-head">
          <h3 class="bcf-detail-title">{{ selectedTopic.title }}</h3>
          <time class="bcf-detail-date">{{ formatDate(selectedTopic.creationDate) }}</time>
          <button class="bcf-close-btn" @click="deleteTopic(selectedTopic.guid)" :title="$tr('Удалить замечание')">🗑</button>
        </div>

        <p v-if="selectedTopic.description" class="bcf-detail-desc">{{ selectedTopic.description }}</p>

        <!-- Properties -->
        <div class="bcf-section">
          <div class="bcf-section-label">Свойства</div>
          <div class="bcf-prop-row">
            <label>{{ $tr('Статус') }}</label>
            <select v-model="editStatus" @change="updateStatus" class="bcf-select">
              <option v-if="!statuses.includes(editStatus as any)" :value="editStatus">{{ editStatus }}</option>
              <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="bcf-prop-row">
            <label>{{ $tr('Приоритет') }}</label>
            <select v-model="editPriority" @change="updatePriority" class="bcf-select">
              <option value="">—</option>
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div class="bcf-prop-row">
            <label>{{ $tr('Ответственный') }}</label>
            <input v-model="editAssignedTo" @change="updateAssignedTo" class="bcf-input" type="text" />
          </div>
        </div>

        <!-- Snapshot -->
        <img
          v-if="selectedTopic.snapshotDataUrl"
          :src="selectedTopic.snapshotDataUrl"
          class="bcf-snapshot bcf-snapshot--clickable"
          alt="snapshot"
          title="Открыть в новой вкладке"
          @click="onThumbClick(selectedTopic)"
        />

        <!-- Viewpoints -->
        <div v-if="selectedTopic.viewpoints.length" class="bcf-section">
          <div class="bcf-section-label">{{ $tr('Точки зрения') }}</div>
          <div class="bcf-vp-list">
            <button
              v-for="(vp, i) in selectedTopic.viewpoints"
              :key="vp.guid"
              class="bcf-vp-btn"
              @click="navigateViewpoint(vp)"
            >
              ▶ {{ $tr('Перейти') }} {{ selectedTopic.viewpoints.length > 1 ? i + 1 : '' }}
            </button>
          </div>
        </div>

        <!-- Comments -->
        <div class="bcf-section">
          <div class="bcf-section-label">{{ $tr('Комментарии') }} ({{ selectedTopic.comments.length }})</div>

          <div v-for="c in selectedTopic.comments" :key="c.guid" class="bcf-comment">
            <div class="bcf-comment-header">
              <b>{{ c.author }}</b>
              <time>{{ formatDate(c.date) }}</time>
              <button class="bcf-comment-del" @click="deleteComment(c.guid)" :title="$tr('Удалить комментарий')">✕</button>
            </div>
            <div class="bcf-comment-body">{{ c.comment }}</div>
          </div>

          <div v-if="selectedTopic.comments.length === 0" class="bcf-comment-empty">
            Нет комментариев
          </div>

          <div class="bcf-add-comment">
            <textarea
              v-model="newComment"
              class="bcf-textarea"
              :placeholder="$tr('Введите комментарий...')"
              rows="2"
            ></textarea>
            <div class="bcf-add-comment-footer">
              <button class="bcf-btn-primary" :disabled="!newComment.trim()" @click="addComment">
                {{ $tr('Добавить') }}
              </button>
            </div>
          </div>
        </div>

      </div>

      <div v-else class="bcf-detail bcf-detail--empty">
        <p>Выберите замечание из списка</p>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { store } from '../store';
import { parseBcfFile } from '../bcf/parser';
import { serializeBcf, createNewTopicFolder, buildViewpointFromCamera } from '../bcf/writer';
import { BCF_STATUSES, BCF_PRIORITIES } from '../bcf/types';
import type { BcfViewpoint, BcfCamera } from '../bcf/types';

export default defineComponent({
    name: 'BcfPanel',
    data() {
        return {
            store,
            statuses: [...BCF_STATUSES],
            priorities: BCF_PRIORITIES.filter(p => p !== '') as string[],

            editStatus: '',
            editPriority: '',
            editAssignedTo: '',
            newComment: '',

            createFormVisible: false,
            newTopic: {
                title: '',
                description: '',
                status: 'Open',
                priority: '',
                assignedTo: '',
            },
            newSnapshotBlob: null as Blob | null,
            newSnapshotName: null as string | null,
            capturedCamera: null as BcfCamera | null,
            capturedGuids: [] as string[],
            snapshotWindows: {} as Record<string, any>,
        };
    },
    computed: {
        selectedTopic() {
            if (!store.selectedTopicGuid) return null;
            return store.topics.find(t => t.guid === store.selectedTopicGuid) ?? null;
        },
    },
    watch: {
        'store.selectedTopicGuid'(guid: string | null) {
            const topic = guid ? store.topics.find(t => t.guid === guid) : null;
            this.editStatus = topic?.status ?? 'Open';
            this.editPriority = topic?.priority ?? '';
            this.editAssignedTo = topic?.assignedTo ?? '';
            this.newComment = '';
        },
    },
    methods: {
        async openFile() {
            const ctx = this.$ctx();
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
            const statusMsg = ctx.setStatusBarMessage(this.$tr('Загрузка BCF...'));
            try {
                const data = await ws.root.get();
                const parsed = await parseBcfFile(data, ws.root.title);
                store.topics = parsed.topics;
                store.project = parsed.project;
                store.version = parsed.version;
                store.fileName = parsed.fileName;
                store.zip = parsed.zip;
                store.isDirty = false;
                store.selectedTopicGuid = parsed.topics[0]?.guid ?? null;
            } catch (e) {
                ctx.showMessage(this.$tr('Ошибка загрузки: {0}', (e as Error).message), 'error');
            } finally {
                statusMsg.dispose();
            }
        },

        async saveFile() {
            if (!store.zip || !store.fileName) return;
            const ctx = this.$ctx();
            let ws;
            try {
                ws = await ctx.saveDialog({
                    suggestedName: store.fileName,
                    filters: [{ name: 'BCF', extensions: ['bcf'] }],
                    folder: false,
                });
            } catch {
                return;
            }
            if (!ws) return;
            const statusMsg = ctx.setStatusBarMessage(this.$tr('Сохранение BCF...'));
            try {
                const blob = await serializeBcf(store.zip, store.topics, store.project);
                const buf = await blob.arrayBuffer();
                await ws.root.put(new Uint8Array(buf));
                await ws.flush();
                store.isDirty = false;
                ctx.showMessage(this.$tr('Файл сохранён'), 'info');
            } catch (e) {
                ctx.showMessage(this.$tr('Ошибка сохранения: {0}', (e as Error).message), 'error');
            } finally {
                statusMsg.dispose();
            }
        },

        selectTopic(guid: string) {
            store.selectedTopicGuid = guid;
        },

        statusClass(status: string): string {
            const map: Record<string, string> = {
                'Open':        'bcf-badge--open',
                'Active':      'bcf-badge--active',
                'In Progress': 'bcf-badge--progress',
                'Resolved':    'bcf-badge--resolved',
                'Closed':      'bcf-badge--closed',
                'ReOpened':    'bcf-badge--reopened',
            };
            return map[status] ?? 'bcf-badge--default';
        },

        formatDate(iso: string): string {
            try {
                return new Date(iso).toLocaleDateString('ru-RU');
            } catch {
                return iso;
            }
        },

        markDirty(topicGuid: string) {
            const topic = store.topics.find(t => t.guid === topicGuid);
            if (topic) topic.modifiedDate = new Date().toISOString();
            store.isDirty = true;
        },

        updateStatus() {
            const t = this.selectedTopic;
            if (!t) return;
            t.status = this.editStatus;
            this.markDirty(t.guid);
        },

        updatePriority() {
            const t = this.selectedTopic;
            if (!t) return;
            t.priority = this.editPriority || undefined;
            this.markDirty(t.guid);
        },

        updateAssignedTo() {
            const t = this.selectedTopic;
            if (!t) return;
            t.assignedTo = this.editAssignedTo || undefined;
            this.markDirty(t.guid);
        },

        deleteTopic(guid: string) {
            if (store.zip) {
                store.zip.remove(`${guid}/`);
            }
            store.topics = store.topics.filter(t => t.guid !== guid);
            if (store.selectedTopicGuid === guid) {
                store.selectedTopicGuid = store.topics[0]?.guid ?? null;
            }
            store.isDirty = true;
        },

        deleteComment(commentGuid: string) {
            const t = this.selectedTopic;
            if (!t) return;
            t.comments = t.comments.filter(c => c.guid !== commentGuid);
            this.markDirty(t.guid);
        },

        addComment() {
            const t = this.selectedTopic;
            if (!t || !this.newComment.trim()) return;
            const ctx = this.$ctx();
            t.comments.push({
                guid: crypto.randomUUID(),
                date: new Date().toISOString(),
                author: (ctx.manager as any)?.username ?? 'Unknown',
                comment: this.newComment.trim(),
            });
            this.newComment = '';
            this.markDirty(t.guid);
        },

        async navigateViewpoint(vp: BcfViewpoint) {
            const ctx = this.$ctx();
            const cadview = ctx.cadview;

            if (!cadview) {
                ctx.showMessage(this.$tr('Нет активного вида'), 'warning');
                return;
            }

            const cadLayer = cadview.layer as any;

            // Clear any existing selection
            try { cadLayer.clearSelected(); } catch { /* ignore */ }

            // Select saved IFC components (true = add to selection)
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
                    ctx.showMessage(this.$tr('IFC-компоненты не найдены в текущей модели'), 'warning');
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
        },

        showCreateForm() {
            this.newTopic = { title: '', description: '', status: 'Open', priority: '', assignedTo: '' };
            this.newSnapshotBlob = null;
            this.newSnapshotName = null;
            this.capturedCamera = null;
            this.capturedGuids = [];
            this.createFormVisible = true;
        },

        async pickSnapshot() {
            const ctx = this.$ctx();
            let ws;
            try {
                const opened = await ctx.openDialog({
                    buttonLabel: 'Выбрать',
                    filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg'] }],
                });
                ws = Array.isArray(opened) ? opened[0] : opened;
            } catch {
                return;
            }
            if (!ws) return;
            const data = await ws.root.get();
            this.newSnapshotBlob = new Blob([data], { type: ws.root.mimeType || 'image/png' });
            this.newSnapshotName = ws.root.title;
        },

        captureViewpoint() {
            const ctx = this.$ctx();
            const cadview = ctx.cadview;

            if (!cadview) {
                ctx.showMessage(this.$tr('Нет активного вида'), 'warning');
                return;
            }

            let stored: any;
            try {
                stored = cadview.storeView();
            } catch {
                ctx.showMessage(this.$tr('Не удалось захватить вид'), 'error');
                return;
            }

            // Deep copy immediately — preserves id + pivot, avoids platform buffer mutation
            const snap = JSON.parse(JSON.stringify(stored));
            const pos: [number, number, number] = [snap.position[0], snap.position[1], snap.position[2]];
            const dir: [number, number, number] = [snap.dir[0], snap.dir[1], snap.dir[2]];
            const up:  [number, number, number] = [snap.up[0],  snap.up[1],  snap.up[2]];

            this.capturedCamera = {
                viewPoint: pos,
                direction: dir,
                upVector:  up,
                fieldOfView: 60,
                platformData: snap,   // full snapshot: {id, position, dir, up, pivot}
            };
            ctx.showMessage(this.$tr('Позиция камеры захвачена'), 'info');
        },

        captureSelection() {
            const ctx = this.$ctx();
            const cadview = ctx.cadview;

            if (!cadview) {
                ctx.showMessage(this.$tr('Нет активного чертежа'), 'warning');
                return;
            }

            const guids: string[] = [];
            const seen = new Set<string>();

            const extractFromLayer = (layer: any): string | undefined => {
                if (!layer || typeof layer.typedValueExpanded !== 'function') return undefined;
                try {
                    const prop = layer.typedValueExpanded('ifc.id');
                    const v = prop?.$value;
                    if (v) return String(v);
                } catch { /* ignore */ }
                return undefined;
            };

            try {
                for (const obj of cadview.layer.selectedObjects()) {
                    // selectedObjects() returns DwgEntity (e.g. DwgModel3d).
                    // IFC properties live on the entity's DwgLayer, not on the entity itself.
                    const layer = (obj as any)?.layer ?? obj;
                    const id = extractFromLayer(layer);
                    if (id && !seen.has(id)) {
                        seen.add(id);
                        guids.push(id);
                    }
                }
            } catch { /* ignore */ }

            this.capturedGuids = guids;
            ctx.showMessage(this.$tr('Захвачено IFC-объектов: {0}', guids.length), 'info');
        },

        onThumbClick(topic: typeof store.topics[0]) {
            if (!topic.snapshotDataUrl) return;
            const existing = this.snapshotWindows[topic.guid];
            if (existing) {
                existing.close();
                delete this.snapshotWindows[topic.guid];
            } else {
                this.openSnapshotWindow(topic.guid, topic.snapshotDataUrl, topic.title);
            }
        },

        openSnapshotWindow(guid: string, dataUrl: string, title: string) {
            const ctx = this.$ctx();
            const app = ctx.app;
            if (!app) return;

            const tag = `bcf-snap-${guid}`;
            const win = (app as any).addDefinedWindow({
                tag,
                id: tag,
                title: title.length > 20 ? title.slice(0, 20).trimEnd() + '…' : title,
                icon: 'image',
                actions: [],
                mount: (el: HTMLElement) => {
                    el.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;background:#111;overflow:auto;padding:8px;box-sizing:border-box;';
                    const img = document.createElement('img');
                    img.src = dataUrl;
                    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;';
                    el.appendChild(img);
                },
                unmount: () => {},
                close: async () => { delete this.snapshotWindows[guid]; },
            });
            this.snapshotWindows[guid] = win;
            (ctx.manager as any).activeWindow = win;
        },

        async createTopic() {
            if (!this.newTopic.title.trim() || !store.zip) return;

            const ctx = this.$ctx();
            const guid = crypto.randomUUID();
            const now = new Date().toISOString();
            const author = (ctx.manager as any)?.username ?? 'Unknown';

            const vpGuid = crypto.randomUUID();
            const viewpoint = buildViewpointFromCamera(
                vpGuid,
                this.capturedCamera?.viewPoint ?? [0, 0, 0],
                this.capturedCamera?.direction ?? [0, 0, -1],
                this.capturedCamera?.upVector ?? [0, 1, 0],
                this.capturedGuids,
                this.capturedCamera?.platformData,
            );
            if (!this.capturedCamera) viewpoint.camera = undefined;

            const topic = {
                guid,
                title: this.newTopic.title.trim(),
                description: this.newTopic.description.trim() || undefined,
                status: this.newTopic.status,
                priority: this.newTopic.priority || undefined,
                assignedTo: this.newTopic.assignedTo.trim() || undefined,
                creationDate: now,
                creationAuthor: author,
                comments: [],
                viewpoints: [viewpoint],
                snapshotDataUrl: this.newSnapshotBlob
                    ? await blobToDataUrl(this.newSnapshotBlob)
                    : undefined,
            };

            createNewTopicFolder(store.zip, topic, this.newSnapshotBlob ?? undefined);
            store.topics.push(topic);
            store.isDirty = true;
            store.selectedTopicGuid = guid;
            this.createFormVisible = false;
            ctx.showMessage(this.$tr('Замечание создано'), 'info');
        },
    },
});

async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
</script>

<style scoped>
/* ── Root ── */
.bcf-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  font-size: 13px;
  color: var(--v-theme-on-surface, #e0e0e0);
}

/* ── Toolbar ── */
.bcf-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--v-border-color, rgba(255,255,255,.12));
  flex-shrink: 0;
  background: var(--v-theme-surface-variant, rgba(255,255,255,.04));
}

.bcf-filename {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  opacity: 0.7;
}

.bcf-toolbar-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.bcf-tbtn {
  padding: 4px 10px;
  border: 1px solid var(--v-border-color, rgba(255,255,255,.2));
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.bcf-tbtn:hover:not(:disabled) {
  background: rgba(255,255,255,.08);
}
.bcf-tbtn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.bcf-tbtn--primary {
  border-color: var(--v-theme-primary, #42a5f5);
  color: var(--v-theme-primary, #42a5f5);
}
.bcf-tbtn--primary:hover:not(:disabled) {
  background: rgba(66,165,245,.12);
}

/* ── Empty state ── */
.bcf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex: 1;
  opacity: 0.6;
  text-align: center;
  padding: 24px;
}
.bcf-empty-icon { font-size: 40px; }
.bcf-empty p { margin: 0; font-size: 13px; }

/* ── Workspace: list + detail ── */
.bcf-workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Topic list ── */
.bcf-list {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--v-border-color, rgba(255,255,255,.12));
}

.bcf-list-empty {
  padding: 16px 12px;
  font-size: 12px;
  opacity: 0.5;
  font-style: italic;
}

.bcf-item {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--v-border-color, rgba(255,255,255,.06));
  transition: background 0.1s;
}
.bcf-item:hover { background: rgba(255,255,255,.05); }
.bcf-item--selected { background: rgba(66,165,245,.15); }
.bcf-item--selected:hover { background: rgba(66,165,245,.2); }

.bcf-item-thumb {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
}
.bcf-item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.bcf-item-thumb-empty {
  width: 100%;
  height: 100%;
  background: rgba(255,255,255,.08);
  border-radius: 4px;
}

.bcf-item-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.bcf-item-title {
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.bcf-item-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}
.bcf-item-priority {
  font-size: 10px;
  opacity: 0.55;
}
.bcf-item-assignee {
  font-size: 10px;
  opacity: 0.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Status badges ── */
.bcf-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
}
.bcf-badge--open     { background: #1565c0; color: #fff; }
.bcf-badge--active   { background: #2e7d32; color: #fff; }
.bcf-badge--progress { background: #e65100; color: #fff; }
.bcf-badge--resolved { background: #388e3c; color: #fff; }
.bcf-badge--closed   { background: rgba(255,255,255,.2); color: inherit; }
.bcf-badge--reopened { background: #b71c1c; color: #fff; }
.bcf-badge--default  { background: rgba(255,255,255,.15); color: inherit; }

/* ── Detail panel ── */
.bcf-detail {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.bcf-detail--empty {
  align-items: center;
  justify-content: center;
  opacity: 0.4;
  font-style: italic;
}

.bcf-detail-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--v-border-color, rgba(255,255,255,.1));
}
.bcf-detail-title {
  flex: 1;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
}
.bcf-detail-date {
  flex-shrink: 0;
  font-size: 11px;
  opacity: 0.5;
  padding-top: 2px;
}
.bcf-detail-desc {
  margin: 0;
  padding: 10px 14px;
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.75;
  border-bottom: 1px solid var(--v-border-color, rgba(255,255,255,.08));
}

/* ── Sections ── */
.bcf-section {
  padding: 10px 14px;
  border-bottom: 1px solid var(--v-border-color, rgba(255,255,255,.08));
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bcf-section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  opacity: 0.45;
  margin-bottom: 2px;
}

/* ── Property rows ── */
.bcf-prop-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}
.bcf-prop-row--top { align-items: flex-start; padding-top: 2px; }
.bcf-prop-row label {
  width: 110px;
  flex-shrink: 0;
  font-size: 12px;
  opacity: 0.6;
}

.bcf-select,
.bcf-input {
  flex: 1;
  padding: 4px 7px;
  border: 1px solid var(--v-border-color, rgba(255,255,255,.2));
  border-radius: 4px;
  font-size: 12px;
  background: rgba(255,255,255,.05);
  color: inherit;
  min-width: 0;
  color-scheme: dark;
}
.bcf-select:focus,
.bcf-input:focus {
  outline: none;
  border-color: var(--v-theme-primary, #42a5f5);
}
.bcf-select option {
  background: #1e2127;
  color: #e0e0e0;
}

/* ── Snapshot ── */
.bcf-snapshot {
  width: calc(100% - 28px);
  margin: 0 14px;
  max-height: 160px;
  object-fit: contain;
  border-radius: 5px;
  border: 1px solid var(--v-border-color, rgba(255,255,255,.12));
  display: block;
}
.bcf-snapshot--clickable {
  cursor: zoom-in;
  transition: opacity 0.15s, border-color 0.15s;
}
.bcf-snapshot--clickable:hover {
  opacity: 0.85;
  border-color: var(--v-theme-primary, #42a5f5);
}

.bcf-item-thumb--clickable {
  cursor: zoom-in;
}
.bcf-item-thumb--clickable:hover img {
  opacity: 0.8;
}

/* ── Viewpoints ── */
.bcf-vp-list { display: flex; flex-direction: column; gap: 4px; }
.bcf-vp-btn {
  align-self: flex-start;
  padding: 5px 12px;
  border: 1px solid var(--v-border-color, rgba(255,255,255,.2));
  border-radius: 4px;
  background: transparent;
  color: var(--v-theme-primary, #42a5f5);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.bcf-vp-btn:hover { background: rgba(66,165,245,.1); }

/* ── Comments ── */
.bcf-comment {
  background: rgba(255,255,255,.04);
  border: 1px solid var(--v-border-color, rgba(255,255,255,.08));
  border-radius: 5px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bcf-comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
}
.bcf-comment-header b { font-weight: 600; }
.bcf-comment-header time { opacity: 0.5; flex: 1; }
.bcf-comment-del {
  padding: 1px 5px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 11px;
  cursor: pointer;
  opacity: 0;
  border-radius: 3px;
  line-height: 1;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.bcf-comment:hover .bcf-comment-del { opacity: 0.5; }
.bcf-comment-del:hover { opacity: 1 !important; background: rgba(255,80,80,.15); color: #ff6b6b; }
.bcf-comment-body { font-size: 12px; line-height: 1.45; }
.bcf-comment-empty { font-size: 12px; opacity: 0.4; font-style: italic; }

/* ── Add comment ── */
.bcf-add-comment { display: flex; flex-direction: column; gap: 6px; }
.bcf-add-comment-footer { display: flex; justify-content: flex-end; }

.bcf-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1px solid var(--v-border-color, rgba(255,255,255,.2));
  border-radius: 4px;
  font-size: 12px;
  resize: vertical;
  background: rgba(255,255,255,.05);
  color: inherit;
  font-family: inherit;
}
.bcf-textarea:focus {
  outline: none;
  border-color: var(--v-theme-primary, #42a5f5);
}

/* ── Shared buttons ── */
.bcf-btn-primary {
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  background: var(--v-theme-primary, #1976d2);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.bcf-btn-primary:hover:not(:disabled) { opacity: 0.85; }
.bcf-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

.bcf-outline-btn {
  padding: 5px 12px;
  border: 1px solid var(--v-border-color, rgba(255,255,255,.2));
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.bcf-outline-btn:hover { background: rgba(255,255,255,.07); }

/* ── Close button ── */
.bcf-close-btn {
  padding: 2px 6px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.6;
  border-radius: 3px;
  line-height: 1;
  flex-shrink: 0;
}
.bcf-close-btn:hover { opacity: 1; background: rgba(255,255,255,.1); }

/* ── Inline create form ── */
.bcf-create {
  border-left: 1px solid var(--v-border-color, rgba(255,255,255,.12));
}

.bcf-create-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--v-border-color, rgba(255,255,255,.1));
  flex-shrink: 0;
}
</style>
