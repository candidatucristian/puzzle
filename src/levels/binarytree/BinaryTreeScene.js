import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import nativeTree from "./nativeTree.json";

const PLATE = `binarytree_native_cycles_v${nativeTree.version}`;

// The complete specimen is modeled and lit in Blender: three root forks,
// eight paper letters and seven physical brass route plates. The player
// follows L/R by eye; the scene is entirely observational.
export default class BinaryTreeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "BinaryTree" });
  }

  init(data) {
    this.skipFadeIn = data?.skipFade ?? true;
  }

  preload() {
    if (!this.textures.exists(PLATE)) {
      this.load.image(PLATE, `assets/images/BinaryTree/old-tree-native-v${nativeTree.version}.webp`);
    }
  }

  create() {
    this.beginScene();
    this.input.mouse.disableContextMenu();
    this.cameras.main.setBackgroundColor("#12150f");
    this._specimen = this.add.image(0, 0, PLATE).setOrigin(0, 0);
    this._layout(this.cameras.main.width, this.cameras.main.height);
    this.listenToResize(({ width, height }) => this._layout(width, height));
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _layout(width, height) {
    const { width: imageWidth, height: imageHeight, safeBounds } = nativeTree;
    const scale = Math.max(width / imageWidth, height / imageHeight);
    const renderedWidth = imageWidth * scale;
    const renderedHeight = imageHeight * scale;
    // One continuous photograph covers the viewport. On wide screens move
    // its crop upwards just enough to keep the bottom route rail in view.
    const centredY = (height - renderedHeight) / 2;
    const railVisibleY = height - 8 - (safeBounds.y + safeBounds.height) * scale;
    const y = Math.max(height - renderedHeight, Math.min(0, centredY, railVisibleY));
    this._specimen
      .setPosition((width - renderedWidth) / 2, y)
      .setScale(scale);
  }

  shutdown() {
    this._specimen = null;
  }
}
