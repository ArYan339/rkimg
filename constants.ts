
import type { AspectRatio } from './types';

export const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

export const SAMPLE_PROMPTS: Record<string, string[]> = {
    "Miniature & Figurine Concepts": [
        "A tiny, adorable, claymation-style hamster chef in a miniature kitchen.",
        "Detailed macro shot of a miniature diorama of a fantasy forest.",
        "A small, intricately detailed figurine of a steampunk explorer.",
    ],
    "Photorealistic Transformations & Edits": [
        "A hyperrealistic portrait of a person made entirely of swirling galaxies.",
        "A photorealistic image of a cat wearing elegant Victorian clothing.",
        "Transform a simple wooden chair into a throne of ice.",
    ],
    "Artistic Styles & Creative Mashups": [
        "A cityscape in the style of Vincent van Gogh's 'Starry Night'.",
        "A medieval knight's armor designed by H.R. Giger.",
        "A serene Japanese garden painted in the cubist style.",
    ],
    "Whimsical & Fantastical Scenes": [
        "A majestic castle floating on a cloud in a vibrant sunset.",
        "An enchanted forest where all the trees have glowing, bioluminescent leaves.",
        "A friendly dragon sharing a cup of tea with a rabbit in a cozy burrow.",
    ],
};
