<template>
  <div class="st-bar">

    <!-- Shape tools -->
    <button class="st-btn" :class="{ 'st-btn--active': tool === 'ellipse' }" @click="$emit('update:tool', 'ellipse')" title="Эллипс">
      <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="10" ry="6"/></svg>
      <span class="st-label">Эллипс</span>
    </button>

    <button class="st-btn" :class="{ 'st-btn--active': tool === 'rect' }" @click="$emit('update:tool', 'rect')" title="Прямоугольник">
      <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="1"/></svg>
      <span class="st-label">Прямоугольник</span>
    </button>

    <button class="st-btn" :class="{ 'st-btn--active': tool === 'arrow' }" @click="$emit('update:tool', 'arrow')" title="Стрелка">
      <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="13 6 19 12 13 18"/>
      </svg>
      <span class="st-label">Стрелка</span>
    </button>

    <button class="st-btn" :class="{ 'st-btn--active': tool === 'double-arrow' }" @click="$emit('update:tool', 'double-arrow')" title="Двойная стрелка">
      <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="11 6 5 12 11 18"/>
        <polyline points="13 6 19 12 13 18"/>
      </svg>
      <span class="st-label">Двойн.стрелка</span>
    </button>

    <button class="st-btn" :class="{ 'st-btn--active': tool === 'text' }" @click="$emit('update:tool', 'text')" title="Текст">
      <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="4 7 4 4 20 4 20 7"/>
        <line x1="9" y1="20" x2="15" y2="20"/>
        <line x1="12" y1="4" x2="12" y2="20"/>
      </svg>
      <span class="st-label">Текст</span>
    </button>

    <div class="st-sep" />

    <!-- Line width -->
    <div class="st-group-label">Размер</div>
    <div class="st-lw-group">
      <button
        v-for="w in LINE_WIDTHS"
        :key="w"
        class="st-lw-btn"
        :class="{ 'st-lw-btn--active': lineWidth === w }"
        :title="`${w} px`"
        @click="$emit('update:lineWidth', w)"
      >
        <svg class="st-lw-icon" viewBox="0 0 24 4" preserveAspectRatio="none">
          <line x1="0" y1="2" x2="24" y2="2" :stroke-width="w" stroke="currentColor" stroke-linecap="round"/>
        </svg>
        <span class="st-lw-num">{{ w }}</span>
      </button>
    </div>

    <div class="st-sep" />

    <!-- Color picker -->
    <label class="st-color-btn" title="Цвет">
      <span class="st-swatch" :style="{ background: color }" />
      <input
        type="color"
        class="st-color-input"
        :value="color"
        @input="$emit('update:color', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <div class="st-sep" />

    <!-- Font size (for text tool) -->
    <button
      class="st-font-btn"
      title="Уменьшить шрифт"
      @click="$emit('update:fontSize', Math.max(8, fontSize - 2))"
    >
      <span class="st-a-sm">A</span>
    </button>
    <input
      type="number"
      class="st-font-sz"
      :value="fontSize"
      min="8"
      max="96"
      @change="onFontSizeChange"
    />
    <button
      class="st-font-btn"
      title="Увеличить шрифт"
      @click="$emit('update:fontSize', Math.min(96, fontSize + 2))"
    >
      <span class="st-a-lg">A</span>
    </button>

    <div class="st-sep" />

    <!-- Undo / Redo / Clear -->
    <button class="st-btn" :disabled="!canUndo" title="Шаг назад (Ctrl+Z)" @click="$emit('undo')">
      <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="9 14 4 9 9 4"/>
        <path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
      </svg>
      <span class="st-label">Назад</span>
    </button>

    <button class="st-btn" :disabled="!canRedo" title="Шаг вперёд (Ctrl+Y)" @click="$emit('redo')">
      <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="15 14 20 9 15 4"/>
        <path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
      </svg>
      <span class="st-label">Вперёд</span>
    </button>

    <button class="st-btn st-btn--danger" title="Очистить" @click="$emit('clear')">
      <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/>
        <line x1="18" y1="9" x2="12" y2="15"/>
        <line x1="12" y1="9" x2="18" y2="15"/>
      </svg>
      <span class="st-label">Очистить</span>
    </button>

    <template v-if="!hideActions">
      <div class="st-sep" />

      <button class="st-btn st-btn--save" title="Сохранить снимок в замечание" @click="$emit('save')">
        <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        <span class="st-label">Сохранить</span>
      </button>

      <button class="st-btn" title="Закрыть без сохранения" @click="$emit('cancel')">
        <svg class="st-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span class="st-label">Отменить</span>
      </button>
    </template>

  </div>
</template>

<script setup lang="ts">
import type { ToolId } from './SnapshotEditor.vue';

const LINE_WIDTHS = [1, 2, 4, 8] as const;

defineProps<{
  tool: ToolId;
  color: string;
  fontSize: number;
  lineWidth: number;
  canUndo: boolean;
  canRedo: boolean;
  hideActions?: boolean;
}>();

const emit = defineEmits<{
  'update:tool': [v: ToolId];
  'update:color': [v: string];
  'update:fontSize': [v: number];
  'update:lineWidth': [v: number];
  'undo': [];
  'redo': [];
  'clear': [];
  'save': [];
  'cancel': [];
}>();

function onFontSizeChange(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10);
  if (!isNaN(v)) emit('update:fontSize', Math.min(96, Math.max(8, v)));
}
</script>

<style scoped>
.st-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color, 0 0 0), var(--v-border-opacity, 0.15));
  background: rgba(var(--v-theme-surface, 255 255 255), 1);
  flex-shrink: 0;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.st-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 3px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.12s, border-color 0.12s;
}
.st-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface, 0 0 0), 0.07);
}
.st-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.st-btn--active {
  border-color: rgb(var(--v-theme-primary, 25 118 210));
  background: rgba(var(--v-theme-primary, 25 118 210), 0.1);
  color: rgb(var(--v-theme-primary, 25 118 210));
}
.st-btn--danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: #ef4444;
}
.st-btn--save {
  border-color: rgb(var(--v-theme-primary, 25 118 210));
  color: rgb(var(--v-theme-primary, 25 118 210));
}
.st-btn--save:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary, 25 118 210), 0.12);
}

.st-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.st-label {
  font-size: 10px;
  line-height: 1;
}

.st-sep {
  width: 1px;
  height: 28px;
  background: rgba(var(--v-border-color, 0 0 0), 0.15);
  flex-shrink: 0;
  margin: 0 4px;
}

/* Line width */
.st-group-label {
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface, 0 0 0), 0.45);
  padding: 0 4px 0 2px;
  white-space: nowrap;
  flex-shrink: 0;
}

.st-lw-group {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.st-lw-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 3px 5px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: inherit;
  flex-shrink: 0;
  transition: background 0.12s, border-color 0.12s;
  min-width: 28px;
}
.st-lw-btn:hover {
  background: rgba(var(--v-theme-on-surface, 0 0 0), 0.07);
}
.st-lw-btn--active {
  border-color: rgb(var(--v-theme-primary, 25 118 210));
  background: rgba(var(--v-theme-primary, 25 118 210), 0.1);
  color: rgb(var(--v-theme-primary, 25 118 210));
}

.st-lw-icon {
  width: 24px;
  height: 8px;
  flex-shrink: 0;
}

.st-lw-num {
  font-size: 9px;
  line-height: 1;
}

/* Color picker */
.st-color-btn {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  flex-shrink: 0;
}
.st-color-btn:hover {
  background: rgba(var(--v-theme-on-surface, 0 0 0), 0.07);
}
.st-swatch {
  width: 22px;
  height: 22px;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.25);
  display: block;
}
.st-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  padding: 0;
  margin: 0;
  border: none;
}

/* Font size controls */
.st-font-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 3px;
  flex-shrink: 0;
  transition: background 0.12s;
}
.st-font-btn:hover {
  background: rgba(var(--v-theme-on-surface, 0 0 0), 0.07);
}
.st-a-sm {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: inherit;
}
.st-a-lg {
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  color: inherit;
}
.st-font-sz {
  width: 38px;
  padding: 2px 4px;
  border: 1px solid rgba(var(--v-border-color, 0 0 0), 0.2);
  border-radius: 3px;
  font-size: 12px;
  text-align: center;
  background: transparent;
  color: inherit;
  flex-shrink: 0;
  -moz-appearance: textfield;
}
.st-font-sz::-webkit-inner-spin-button,
.st-font-sz::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
.st-font-sz:focus {
  outline: none;
  border-color: rgb(var(--v-theme-primary, 25 118 210));
}
</style>
