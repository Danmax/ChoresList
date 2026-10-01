# DinoLand animated sprite set

Generated with the built-in image generation tool, using the original `dinoland-creatures-v1.png` atlas as a visual reference. The final transparent PNGs are in this directory.

## Shared prompt structure

Create original, colorful cartoon game art matching the character's silhouette and palette in the reference atlas. Make one transparent 1536 × 1024 sprite sheet with a spacious 2 × 2 grid. Keep exactly one complete character inside each cell, with clear empty gutters and no overlap, scenery, lettering, panels, or borders. Pose order: top left relaxed movement, top right readable warning, bottom left dynamic attack or action, bottom right recovery. Preserve facial features and costume or anatomy across all four cells; draw expressive limbs and strong directional motion suitable for a side scrolling runner.

## Character prompts

| File | Character specific direction |
| --- | --- |
| `dinoland-triceratops-anim-v1.png` | Teal and gold triceratops: walking weight shift, hoof scrape and lowered horns, forceful charge, braced recovery. |
| `dinoland-sauropod-anim-v1.png` | Friendly blue green long neck: slow step, neck lift, springy back launch, settling and looking back. |
| `dinoland-baboon-anim-v1.png` | Wild purple baboon: bouncing crouch, fruit throw windup, airborne hurl, off balance landing. |
| `dinoland-sabertooth-anim-v1.png` | Orange saber tooth tiger: prowling step, low pounce warning, stretched leap, landing crouch. |
| `dinoland-pterodactyl-anim-v1.png` | Violet pterodactyl: wide wing flap, dive warning, steep diving attack, wingbeat recovery. |
| `dinoland-mammoth-anim-v1.png` | Woolly brown mammoth: heavy step, trunk raise, charging stomp, recoil with swaying fur. |
| `dinoland-trex-anim-v1.png` | Green T. rex boss: advancing step, open mouth threat, ground shaking stomp or bite, vulnerable recovery. |

The baboon, sauropod, and other selected outputs were refined for more space between poses. Runtime code crops each cell's transparent margins so visible feet stay aligned across frames.
