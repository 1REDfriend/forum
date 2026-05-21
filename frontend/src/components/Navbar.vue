<script setup lang="ts">
import CodeIcon from './icons/CodeIcon.vue';
import ForumIcon from './icons/ForumIcon.vue';
import HomeIcon from './icons/HomeIcon.vue';
import SearchIcon from './icons/SearchIcon.vue';

</script>

<template>
    <div
        class="fixed w-screen top-2 md:top-4 left-1/2 -translate-x-1/2 md:w-1/2 h-13 bg-gray-200/90 backdrop-blur-md border border-gray-100 rounded-full flex items-center justify-between px-6 shadow-xl z-50">

        <div class="flex items-center text-indigo-400 font-bold gap-2 cursor-pointer select-none">
            <CodeIcon/>
            <span class="text-sm tracking-wider font-mono hidden lg:inline">IT.FORUM</span>
        </div>

        <nav class="flex items-center gap-6 text-slate-400">
            <button class="hover:text-indigo-400 transition-colors" title="Home">
                <HomeIcon/>
            </button>

            <button class="hover:text-indigo-400 transition-colors" title="Forums">
                <ForumIcon/>
            </button>

            <button class="hover:text-indigo-400 transition-colors" title="Search">
                <SearchIcon/>
            </button>
        </nav>

        <div class="flex items-center">
            <button class="focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full transition-all">
                <img src="https://lh3.googleusercontent.com/a/default-user=s96-c" alt="Google Profile"
                    class="w-9 h-9 rounded-full border border-slate-700 hover:border-indigo-400 transition-colors" />
            </button>
        </div>

    </div>
</template>