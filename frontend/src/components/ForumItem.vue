<template>
    <div
        class="flex min-h-16 w-full bg-(--color-background-soft) hover:bg-(--color-background-mute) border-b border-(--color-border) transition-colors rounded-md">

        <div class="flex w-16 justify-center items-center border-r border-(--color-border)">
            <slot name="checkbox">
                <input type="checkbox" name="markread"
                    class="rounded border-(--color-border) bg-(--color-background-mute) text-sky-500 focus:ring-sky-500 h-4 w-4">
            </slot>
        </div>

        <div class="flex flex-col p-3 flex-1 border-r border-(--color-border) justify-center">
            <slot name="main">
                <a href="#" class="font-bold hover:text-sky-600 dark:hover:text-sky-400 transition-colors"></a>
                <p class="text-xs text-(--color-text-muted) mt-0.5"></p>
            </slot>
        </div>

        <div class="hidden md:flex flex-col w-72 p-3 border-r border-(--color-border) justify-center text-xs">
            <slot name="latest">
                <a href="#" class="hover:underline font-medium truncate max-w-60"></a>
                <div class="flex justify-between items-center mt-1 text-(--color-text-muted)">
                    <span>โดย ?</span>
                    <span>? นาทีที่แล้ว</span>
                </div>
            </slot>
        </div>

        <div class="hidden sm:flex w-20 justify-center items-center border-r border-(--color-border) text-sm font-mono">
            <slot name="stat-1">0</slot>
        </div>

        <div class="hidden sm:flex w-20 justify-center items-center text-sm font-mono">
            <slot name="stat-2">0</slot>
        </div>

    </div>
</template>