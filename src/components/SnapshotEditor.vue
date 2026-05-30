<template>
  <div class="se-root" :class="`v-theme--${props.theme ?? 'light'}`" tabindex="-1" @keydown="onKeyDown">
    <SnapshotToolbar
      v-if="!readOnly"
      v-model:tool="activeTool"
      v-model:color="activeColor"
      v-model:fontSize="activeFontSize"
      v-model:lineWidth="activeLineWidth"
      :canUndo="history.length > 0"
      :canRedo="redoStack.length > 0"
      :hideActions="props.hideActions"
      @undo="undo"
      @redo="redo"
      @clear="clear"
      @save="save"
      @cancel="handleCancel"
    />
    <div class="se-viewport" ref="viewportRef">
      <div class="se-wrap" ref="wrapRef">
        <img
          :src="currentDataUrl"
          ref="imgRef"
          class="se-image"
          draggable="false"
          @load="syncCanvasSize"
        />
        <canvas
          v-if="!readOnly"
          ref="canvasRef"
          class="se-canvas"
          :class="{ 'se-canvas--text': activeTool === 'text' }"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @mouseleave="onMouseLeave"
        />
        <input
          v-if="textInput.visible"
          ref="textInputRef"
          v-model="textInput.value"
          class="se-text-input"
          :style="{
            left: textInput.x + 'px',
            top: textInput.y + 'px',
            fontSize: activeFontSize + 'px',
            color: activeColor,
          }"
          @keydown="onTextInputKeyDown"
          @keyup.stop
          @blur="onTextInputBlur"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue';
import SnapshotToolbar from './SnapshotToolbar.vue';

export type ToolId = 'ellipse' | 'rect' | 'arrow' | 'double-arrow' | 'text';

interface DrawOp {
  tool: ToolId;
  color: string;
  lineWidth: number;
  x1: number; y1: number;
  x2: number; y2: number;
  text?: string;
  fontSize?: number;
}

const props = defineProps<{
  dataUrl: string;
  guid: string;
  readOnly?: boolean;
  theme?: string;
  onSave?: (blob: Blob) => Promise<void>;
  onCancel?: () => void;
  showConfirm?: () => Promise<boolean>;
  hideActions?: boolean;
  registerSave?: (fn: () => Promise<void>) => void;
}>();

const { readOnly } = props;
const currentDataUrl = ref(props.dataUrl);

const imgRef       = ref<HTMLImageElement | null>(null);
const canvasRef    = ref<HTMLCanvasElement | null>(null);
const wrapRef      = ref<HTMLDivElement | null>(null);
const viewportRef  = ref<HTMLDivElement | null>(null);
const textInputRef = ref<HTMLInputElement | null>(null);

const activeTool      = ref<ToolId>('arrow');
const activeColor     = ref('#ff0000');
const activeFontSize  = ref(24);
const activeLineWidth = ref(2);

const history:   DrawOp[] = reactive([]);
const redoStack: DrawOp[] = reactive([]);

const drawing = ref(false);
const startX  = ref(0);
const startY  = ref(0);

const textInput = reactive({ visible: false, x: 0, y: 0, value: '' });
let textRefocused = false;

// ── Fit to viewport ───────────────────────────────────────────
function fitToViewport() {
  const viewport = viewportRef.value;
  const wrap = wrapRef.value;
  const img = imgRef.value;
  if (!viewport || !wrap || !img || !img.naturalWidth) return;

  const pad = 16;
  const maxW = viewport.clientWidth - pad;
  const maxH = viewport.clientHeight - pad;
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  wrap.style.width  = w + 'px';
  wrap.style.height = h + 'px';

  const canvas = canvasRef.value;
  if (canvas) {
    canvas.width  = w;
    canvas.height = h;
    redraw();
  }
}

let resizeObs: ResizeObserver | null = null;

onMounted(() => {
  resizeObs = new ResizeObserver(() => fitToViewport());
  if (viewportRef.value) resizeObs.observe(viewportRef.value);
});

onUnmounted(() => {
  resizeObs?.disconnect();
});

// ── Canvas sync (вызывается после @load изображения) ──────────
function syncCanvasSize() {
  fitToViewport();
}

// ── Drawing ───────────────────────────────────────────────────
function get2d(): CanvasRenderingContext2D | null {
  return canvasRef.value?.getContext('2d') ?? null;
}

function redraw(previewOp?: DrawOp) {
  const ctx = get2d();
  if (!ctx || !canvasRef.value) return;
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  for (const op of history) drawOp(ctx, op);
  if (previewOp) drawOp(ctx, previewOp);
}

function drawOp(ctx: CanvasRenderingContext2D, op: DrawOp) {
  ctx.save();
  ctx.strokeStyle = op.color;
  ctx.fillStyle   = op.color;
  ctx.lineWidth   = op.lineWidth;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  const { x1, y1, x2, y2 } = op;

  switch (op.tool) {
    case 'ellipse': {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      if (rx > 0 && ry > 0) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'rect': {
      ctx.beginPath();
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      break;
    }
    case 'arrow': {
      if (x1 !== x2 || y1 !== y2) {
        drawLine(ctx, x1, y1, x2, y2);
        drawArrowhead(ctx, x1, y1, x2, y2, op.lineWidth * 5 + 4);
      }
      break;
    }
    case 'double-arrow': {
      if (x1 !== x2 || y1 !== y2) {
        drawLine(ctx, x1, y1, x2, y2);
        drawArrowhead(ctx, x1, y1, x2, y2, op.lineWidth * 5 + 4);
        drawArrowhead(ctx, x2, y2, x1, y1, op.lineWidth * 5 + 4);
      }
      break;
    }
    case 'text': {
      if (op.text) {
        ctx.font = `bold ${op.fontSize ?? 16}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.fillText(op.text, x1, y1);
      }
      break;
    }
  }
  ctx.restore();
}

function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawArrowhead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, size: number) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

// ── Coordinate helper ──────────────────────────────────────────
function coords(e: MouseEvent): [number, number] {
  const r = canvasRef.value!.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}

// ── Mouse events ───────────────────────────────────────────────
function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  const [x, y] = coords(e);

  if (activeTool.value === 'text') {
    e.preventDefault();
    commitText(); // сохранить предыдущий текст, если был открыт инпут
    textInput.x = x;
    textInput.y = y;
    textInput.value = '';
    textInput.visible = true;
    textRefocused = false;
    nextTick(() => textInputRef.value?.focus());
    return;
  }

  drawing.value = true;
  startX.value  = x;
  startY.value  = y;
}

function onMouseMove(e: MouseEvent) {
  if (!drawing.value) return;
  const [x, y] = coords(e);
  redraw({
    tool: activeTool.value,
    color: activeColor.value,
    lineWidth: activeLineWidth.value,
    x1: startX.value, y1: startY.value,
    x2: x, y2: y,
    fontSize: activeFontSize.value,
  });
}

function onMouseUp(e: MouseEvent) {
  if (!drawing.value) return;
  drawing.value = false;
  const [x, y] = coords(e);
  const op: DrawOp = {
    tool: activeTool.value,
    color: activeColor.value,
    lineWidth: activeLineWidth.value,
    x1: startX.value, y1: startY.value,
    x2: x, y2: y,
    fontSize: activeFontSize.value,
  };
  history.push(op);
  redoStack.splice(0);
  redraw();
}

function onMouseLeave(e: MouseEvent) {
  if (!drawing.value) return;
  onMouseUp(e);
}

// ── Text tool ──────────────────────────────────────────────────
function onTextInputKeyDown(e: KeyboardEvent) {
  e.stopPropagation();
  if (e.key === 'Enter') { e.preventDefault(); commitText(); }
  else if (e.key === 'Escape') { cancelText(); }
}

function onTextInputBlur(e: FocusEvent) {
  if (!e.relatedTarget && textInput.visible && !textRefocused) {
    textRefocused = true;
    nextTick(() => textInputRef.value?.focus());
    return;
  }
  textRefocused = false;
  commitText();
}

function commitText() {
  if (!textInput.visible) return;
  const txt = textInput.value.trim();
  textInput.visible = false;
  if (!txt) return;
  history.push({
    tool: 'text',
    color: activeColor.value,
    lineWidth: activeLineWidth.value,
    x1: textInput.x, y1: textInput.y,
    x2: textInput.x, y2: textInput.y,
    text: txt,
    fontSize: activeFontSize.value,
  });
  redoStack.splice(0);
  redraw();
}

function cancelText() {
  textInput.visible = false;
}

// ── Composite & save ──────────────────────────────────────────
function getCompositeBlob(): Promise<Blob | null> {
  const img = imgRef.value;
  const canvas = canvasRef.value;
  if (!img || !canvas) return Promise.resolve(null);
  const off = document.createElement('canvas');
  off.width  = img.naturalWidth;
  off.height = img.naturalHeight;
  const offCtx = off.getContext('2d')!;
  offCtx.drawImage(img, 0, 0);
  offCtx.drawImage(canvas, 0, 0, img.naturalWidth, img.naturalHeight);
  return new Promise(resolve => off.toBlob(resolve, 'image/png'));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function save() {
  if (history.length === 0) {
    props.onCancel?.();
    return;
  }
  const blob = await getCompositeBlob();
  if (!blob) return;
  await props.onSave?.(blob);
  props.onCancel?.();
}

props.registerSave?.(save);

async function handleCancel() {
  if (history.length > 0 && props.showConfirm) {
    const confirmed = await props.showConfirm();
    if (!confirmed) return;
  }
  props.onCancel?.();
}

// ── Keyboard ───────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
  if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
}

// ── History ────────────────────────────────────────────────────
function undo() {
  const op = history.pop();
  if (op) redoStack.push(op);
  redraw();
}

function redo() {
  const op = redoStack.pop();
  if (op) history.push(op);
  redraw();
}

function clear() {
  history.splice(0);
  redoStack.splice(0);
  redraw();
}
</script>

<style scoped>
.se-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.se-viewport {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  padding: 8px;
}

.se-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  line-height: 0;
}

.se-image {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  user-select: none;
}

.se-canvas {
  position: absolute;
  inset: 0;
  cursor: crosshair;
}

.se-canvas--text {
  cursor: text;
}

.se-text-input {
  position: absolute;
  background: transparent;
  border: 1px dashed rgba(255, 255, 255, 0.6);
  outline: none;
  padding: 2px 6px;
  font-family: sans-serif;
  font-weight: bold;
  min-width: 80px;
  box-sizing: border-box;
}
</style>
