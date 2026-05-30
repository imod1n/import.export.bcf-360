<template>
  <div class="bcf-empty">
    <div class="bcf-empty-actions">
      <button class="bcf-btn-primary" @click="$emit('open')">{{ $tr('Открыть BCF') }}</button>
      <button class="bcf-btn-primary bcf-btn-primary--green" @click="$emit('create-new')">{{ $tr('Создать новый файл') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ open: []; 'create-new': [] }>();
</script>
