<script setup lang="ts">
import ForumItem from './ForumItem.vue';
import LeftArrowIcon from './icons/LeftArrowIcon.vue';

</script>

<template>
    <div class="flex flex-col 2xl:px-20 pt-18">
        <div class="flex h-10 w-full bg-gray-200 border-b border-gray-100 text-sm font-semibold select-none rounded-md">
            <div class="flex w-16 justify-center items-center border-r border-gray-300">
                Mark
            </div>
            <div class="flex flex-1 pl-4 items-center border-r border-gray-300">
                Forums
            </div>
            <div class="hidden md:flex w-72 pl-4 items-center border-r border-gray-300">
                Last Post
            </div>
            <div class="hidden sm:flex w-20 justify-center items-center border-r border-gray-300">
                Threads
            </div>
            <div class="hidden sm:flex w-20 justify-center items-center">
                Posts
            </div>
        </div>

        <ForumItem>
            <template #main>
                <router-link to="/c/vue" class="font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                    Vue.js Ecosystem
                </router-link>
                <p class="text-xs text-slate-500 mt-0.5">พูดคุยเรื่อง Vue 3, Vite, Pinia และไลบรารีที่เกี่ยวข้อง</p>
            </template>

            <template #latest>
                <router-link to="/t/105" class="hover:underline font-medium truncate max-w-60 text-slate-700">
                    การทำ SSR ด้วย Nuxt 3...
                </router-link>
                <div class="flex justify-between items-center mt-1 text-slate-500">
                    <span>โดย @sysadmin</span>
                    <span>5 นาทีที่แล้ว</span>
                </div>
            </template>

            <template #stat-1>350</template>
            <template #stat-2>2.1k</template>
        </ForumItem>

        <ForumItem>
            <template #main>
                <router-link to="/c/vue" class="font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                    Vue.js Ecosystem
                </router-link>
                <p class="text-xs text-slate-500 mt-0.5">พูดคุยเรื่อง Vue 3, Vite, Pinia และไลบรารีที่เกี่ยวข้อง</p>
            </template>

            <template #latest>
                <router-link to="/t/105" class="hover:underline font-medium truncate max-w-60 text-slate-700">
                    การทำ SSR ด้วย Nuxt 3...
                </router-link>
                <div class="flex justify-between items-center mt-1 text-slate-500">
                    <span>โดย @sysadmin</span>
                    <span>5 นาทีที่แล้ว</span>
                </div>
            </template>

            <template #stat-1>350</template>
            <template #stat-2>2.1k</template>
        </ForumItem>
    </div>

    <div class="flex justify-center absolute bottom-10 z-50 w-screen">
        <div class="flex justify-center items-center gap-6">
            <div
                class="flex bg-gray-100 border border-gray-200 h-10 w-12 rounded-full text-center text-slate-600 text-lg justify-center items-center">
                <button class="hover:text-indigo-400 transition-colors" title="Prevoide">
                    <LeftArrowIcon />
                </button>
            </div>
            <div
                class="flex bg-gray-100 border border-gray-200 h-10 w-22 rounded-full text-center text-slate-600 text-lg justify-center items-center">
                <input class="w-16" type="number" name="page" id="page" value="1">
            </div>
            <div
                class="flex bg-gray-100 border border-gray-200 h-10 w-12 rounded-full text-center text-slate-600 text-lg justify-center items-center">
                <button class="hover:text-indigo-400 transition-colors" title="Prevoide">
                    <LeftArrowIcon class="rotate-180" />
                </button>
            </div>
        </div>
    </div>
</template>