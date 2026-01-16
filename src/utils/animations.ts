import { motion } from 'framer-motion';

// Fade In animation for page load
export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
};

// Slide Up animation for cards/modals
export const slideUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
};

// Scale animation for buttons/icons
export const scaleIn = {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: { duration: 0.2 }
};

// Stagger animation for lists
export const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
};

export const staggerItem = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
};

// Success animation (for scan feedback, etc.)
export const successBounce = {
    initial: { scale: 0 },
    animate: {
        scale: [0, 1.2, 1],
        transition: {
            duration: 0.5,
            times: [0, 0.6, 1],
            ease: 'easeOut'
        }
    }
};

// Error shake animation
export const errorShake = {
    animate: {
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.4 }
    }
};

// Scan success feedback
export const scanSuccess = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
        scale: 1,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 200,
            damping: 15
        }
    },
    exit: {
        scale: 0.8,
        opacity: 0,
        transition: { duration: 0.2 }
    }
};

// Hover effect for interactive cards
export const hoverScale = {
    whileHover: { scale: 1.02, transition: { duration: 0.2 } },
    whileTap: { scale: 0.98 }
};

// Motion component wrapper
export const MotionDiv = motion.div;
export const MotionButton = motion.button;
export const MotionCard = motion.div;
