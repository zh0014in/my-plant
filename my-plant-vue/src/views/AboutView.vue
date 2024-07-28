<script setup lang="ts">
import TheAbout from '../components/TheAbout.vue'
</script>

<template>
  <div class="about">
    <TheAbout />
  </div>
</template>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
