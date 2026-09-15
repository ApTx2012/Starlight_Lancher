# 凋灵局部清理素材

## 横梁删除修正（2026-09-15）

- 素材：[wither-beams-removed.png](./wither-beams-removed.png)，2172 × 724。
- 方式：内置 imagegen，局部对象删除；输入为上一版清理图与用户标注的两处横梁。
- 仅使用左右横梁及其侧面的轮廓区域，补回露出的背景；其他位置仍使用之前的清晰素材。对应的横梁护盾面同时删除。
- 不重编码既有母图，不使用整张新生成图替换画面，不增加模糊或羽化。

最终提示词：

Use case: precise-object-edit.
Image 1 is the edit target: the full 3:1 Minecraft night scene. Image 2 is a location guide only, with red rectangles identifying two unwanted horizontal shoulder beams. Do NOT copy the UI, red marks, sword, star, clouds or alternate appearance from image 2.
Remove the TWO long thin horizontal brown/black bars running out sideways from the fallen Wither's upper chest to its left and right side skulls. In image 1 at normalized 2048x683 coordinates these are approximately left x978–1140 y467–527 and right x1280–1405 y487–535. ERASE these bars completely, including their top face and side face; show the existing dark blue-gray ground/background visible through the new open gaps. The left and right skulls must stay in their exact positions on the ground, separated visually from the chest in these gaps. Do not invent substitute bars, short stumps, connecting rods, upright shoulder bones, debris, ribs or decorations in these two gaps.
Preserve all other pixels/geometry/composition: the three blocky skulls, central neck, broken rib cage, spine, player's exact pose and clothes, moon, landscape, frame edges, lighting and colors. In particular do not remove or redraw the existing curved/segmented chest ribs below the two bars. Precisely restore the small exposed background behind removed bars, with crisp square voxel texture. No blur, smoothing, feathering, depth of field, re-rendering of the whole image, glow or haze. Keep the original full 3:1 frame and exact object registration, at 2172x724 if possible. This is a tiny local object removal, not a restyle.

## 上一版肩部凸出结构清理

- 素材：[wither-shoulder-cleanup.png](./wither-shoulder-cleanup.png)，2172 × 724。
- 生成方式：内置 imagegen 图像编辑工具。
- 编辑目标：`victory-clean.jpg`；辅助参考为用户标红的两处肩部异常结构及 Minecraft 凋灵截图。
- 实际使用：仅将两处肩部异常结构的清理结果合成到清晰母图。整张生成图不作为背景使用，三个头、肋骨、角色和环境保留原有素材。
- 动画在独立图层中绘制；护盾几何记录在 `wither-shield.ts`，坐标以 2048 × 682⅔ 的场景空间表示。

## 生成时使用的提示词

Use case: precise-object-edit. Asset type: a sharp replacement Wither plate for an existing Minecraft cinematic animated banner. Image 1 is the EDIT TARGET: retain its exact 3:1 panoramic framing and camera, keep every other object and the character unchanged. Image 2 is ONLY an annotation reference: its red rectangles identify two erroneous upright slabs/extra structures on the Wither's shoulders which must be removed; do not draw any red marks. Image 3 is ONLY a vanilla Minecraft Wither anatomy reference; use its simple three-headed skeletal structure, not its standing pose or blue shield.

Regenerate ONLY the fallen Wither in Image 1 cleanly, with crisp straight voxel edges, dark charcoal/black nether bone material and clean low-resolution Minecraft pixel textures. Exactly three cuboid skulls: near-left skull under the player's raised boot, central skull farther back facing upward, right skull at the right, preserving their existing centers, scale, screen orientation and silhouette as closely as possible. Retain the existing supine defeated pose, clean horizontal shoulder crossbar linking the three heads, a compact rib cage with separated squared ribs, and the central spine receding into the foreground. Remove the two upright paddle-like shoulder projections indicated by the red boxes, all extra heads, all spikes/horns, all gold mechanisms, odd rubble embedded in the body, noisy invented decorations and duplicate bones. The chest has one coherent small broken sternum opening centered exactly where the animated sword will enter (about 56% across and 72% down the full panorama). Preserve visible negative space between ribs, without random detached bits. This is a defeated non-human Minecraft boss, no blood or gore.

Keep the player's existing foot resting on the near-left skull at precisely the same height and location. Keep the character, face, volumetric brown hair, yellow clothing, armor, hands and boots absolutely unchanged. Keep the sky, moon, trees, terrain and all other regions unchanged and sharp. Do NOT add a sword or nether star: these already exist as separate animated layers. Do NOT paint any blue shielding, electricity, glow halos or particles onto the Wither; those will be separate precisely aligned animated layers. Match existing cool night illumination and subtle warm gold light on the top-facing bone planes. Reconstruct only the small pieces of ground/sky revealed by removing the two wrong shoulder slabs. No blur, no painterly smoothing, no depth-of-field blur, no sharpening halos. Output a single full panoramic 3:1 edited plate, same framing as Image 1, at the highest available resolution.
