<template>
    <div
        class="flex min-h-16 w-full bg-gray-100 hover:bg-slate-850 border-b border-gray-200 transition-colors rounded-md">

        <div class="flex w-16 justify-center items-center border-r border-gray-300">
            <slot name="checkbox">
                <input type="checkbox" name="markread"
                    class="rounded border-gray-300 bg-slate-800 text-indigo-650 focus:ring-indigo-500 h-4 w-4">
            </slot>
        </div>

        <div class="flex flex-col p-3 flex-1 border-r border-gray-300 justify-center">
            <slot name="main">
                <a href="#" class="font-bold hover:text-indigo-400 transition-colors"></a>
                <p class="text-xs text-slate-500 mt-0.5"></p>
            </slot>
        </div>

        <div class="hidden md:flex flex-col w-72 p-3 border-r border-gray-300 justify-center text-xs">
            <slot name="latest">
                <a href="#" class="hover:underline font-medium truncate max-w-60"></a>
                <div class="flex justify-between items-center mt-1 text-slate-500">
                    <span>โดย ?</span>
                    <span>? นาทีที่แล้ว</span>
                </div>
            </slot>
        </div>

        <div class="hidden sm:flex w-20 justify-center items-center border-r border-gray-300 text-sm font-mono">
            <slot name="stat-1">0</slot>
        </div>

        <div class="hidden sm:flex w-20 justify-center items-center text-sm font-mono">
            <slot name="stat-2">0</slot>
        </div>

    </div>
</template>