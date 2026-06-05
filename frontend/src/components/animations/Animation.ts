import type { VariantType } from "motion-v"

const heroContainer = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.15 }
    }
}

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
}

const fadeLeft = {
    hidden: { opacity: 0, x: 40 },
    show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
}

const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' as const } }
}

const scrollUpIn = {
    
}

export { heroContainer, fadeUp, fadeLeft, scaleIn }
