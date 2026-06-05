<template>
    <div
        class="flex min-h-16 w-full bg-white/5 hover:bg-white/10 border-b border-white/10 transition-colors rounded-md">

        <div class="flex w-16 justify-center items-center border-r border-white/10">
            <slot name="checkbox">
                <input type="checkbox" name="markread"
                    class="rounded border-white/20 bg-white/10 text-sky-500 focus:ring-sky-500 h-4 w-4">
            </slot>
        </div>

        <div class="flex flex-col p-3 flex-1 border-r border-white/10 justify-center">
            <slot name="main">
                <a href="#" class="font-bold hover:text-sky-400 transition-colors"></a>
                <p class="text-xs text-slate-500 mt-0.5"></p>
            </slot>
        </div>

        <div class="hidden md:flex flex-col w-72 p-3 border-r border-white/10 justify-center text-xs">
            <slot name="latest">
                <a href="#" class="hover:underline font-medium truncate max-w-60"></a>
                <div class="flex justify-between items-center mt-1 text-slate-500">
                    <span>โดย ?</span>
                    <span>? นาทีที่แล้ว</span>
                </div>
            </slot>
        </div>

        <div class="hidden sm:flex w-20 justify-center items-center border-r border-white/10 text-sm font-mono">
            <slot name="stat-1">0</slot>
        </div>

        <div class="hidden sm:flex w-20 justify-center items-center text-sm font-mono">
            <slot name="stat-2">0</slot>
        </div>

    </div>
</template>