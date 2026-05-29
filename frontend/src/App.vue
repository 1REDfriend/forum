<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue';
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <header>
      <Navbar />
    </header>
    <div class="flex-1 w-full">
      <RouterView />
    </div>
  </div>
</template>
