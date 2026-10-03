import BinaryTreeScene from "./binarytree/BinaryTreeScene.js";
import PlantPotScene from "./plantpot/PlantPotScene.js";
import SequenceScene from "./sequence/SequenceScene.js";
import CryptexScene from "./cryptex/CryptexScene.js";
import ChessboardScene from "./chessboard/ChessboardScene.js";
import MobilePhoneScene from "./mobilephone/MobilePhoneScene.js";
import LightswitchScene from "./lightswitch/LightswitchScene.js";
import TVScene from "./tv/TVScene.js";
import ModemScene from "./modem/ModemScene.js";
import TelescopeScene from "./telescope/TelescopeScene.js";
import WiresScene from "./wires/WiresScene.js";
import StationScene from "./station/StationScene.js";
import PiScene from "./pi/PiScene.js";
import CrossingScene from "./crossing/CrossingScene.js";
import FlagsScene from "./flags/FlagsScene.js";
import TapCodeScene from "./tapcode/TapCodeScene.js";
import RallyScene from "./rally/RallyScene.js";
import OvertimeScene from "./overtime/Overtime.js";
import FireworksScene from "./colors/Fireworksscene.js";
import CompassScene from "./compass/CompassScene.js";
import BookshelfScene from "./bookshelf/BookshelfScene.js";
import ChemistryScene from "./chemistry/ChemistryScene.js";
import BilliardsScene from "./billiards/BilliardsScene.js";
import { LEVEL_METADATA } from "./metadata.js";

const scenes = {
  BinaryTree: BinaryTreeScene,
  PlantPot: PlantPotScene,
  Sequence: SequenceScene,
  Cryptex: CryptexScene,
  Chessboard: ChessboardScene,
  MobilePhone: MobilePhoneScene,
  Lightswitch: LightswitchScene,
  TV: TVScene,
  Modem: ModemScene,
  Telescope: TelescopeScene,
  Wires: WiresScene,
  Station: StationScene,
  Pi: PiScene,
  Crossing: CrossingScene,
  Flags: FlagsScene,
  TapCode: TapCodeScene,
  Rally: RallyScene,
  Overtime: OvertimeScene,
  Fireworks: FireworksScene,
  Compass: CompassScene,
  Bookshelf: BookshelfScene,
  Chemistry: ChemistryScene,
  Billiards: BilliardsScene,
};

export const LEVEL_DEFINITIONS = Object.freeze(LEVEL_METADATA.map((level) => Object.freeze({
  ...level,
  scene: scenes[level.key],
})));

export default LEVEL_DEFINITIONS;

