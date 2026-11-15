import BinaryTreeScene from "./binarytree/BinaryTreeScene.js";
import PlantPotScene from "./plantpot/PlantPotScene.js";
import SequenceScene from "./sequence/SequenceScene.js";
import CryptexScene from "./cryptex/CryptexScene.js";
import ChessboardScene from "./chessboard/ChessboardScene.js";
import MobilePhoneScene from "./mobilephone/MobilePhoneScene.js";
import LightswitchScene from "./lightswitch/LightswitchScene.js";
import ModemScene from "./modem/ModemScene.js";
import TelescopeScene from "./telescope/TelescopeScene.js";
import WiresScene from "./wires/WiresScene.js";
import TicketsScene from "./station/TicketsScene.js";
import TreeScene from "./pi/TreeScene.js";
import FlagsScene from "./flags/FlagsScene.js";
import HerbariumScene from "./herbarium/HerbariumScene.js";
import CotScene from "./cot/CotScene.js";
import TapCodeScene from "./tapcode/TapCodeScene.js";
import RallyScene from "./rally/RallyScene.js";
import OvertimeScene from "./overtime/Overtime.js";
import CompassScene from "./compass/CompassScene.js";
import BookshelfScene from "./bookshelf/BookshelfScene.js";
import ChemistryScene from "./chemistry/ChemistryScene.js";
import MoleculesScene from "./molecules/MoleculesScene.js";
import PhialsScene from "./phials/PhialsScene.js";
import BalanceScene from "./balance/BalanceScene.js";
import EquationsScene from "./equations/EquationsScene.js";
import MeasuresScene from "./measures/MeasuresScene.js";
import AbacusScene from "./abacus/AbacusScene.js";
import RewindScene from "./rewind/RewindScene.js";
import { LEVEL_METADATA } from "./metadata.js";

// The web demo's build (vite build --mode demo, scripts/demo-build.mjs) holds only
// the puzzles in the demo's rooms (DEMO_PLACES in shared/house.js): the rest
// are left out of it, code and all. (These nine are Rooms I, II and III's.)
const DEMO_BUILD = typeof __DEMO_BUILD__ !== "undefined" && __DEMO_BUILD__;

const scenes = {
  BinaryTree: BinaryTreeScene,
  PlantPot: PlantPotScene,
  Cryptex: CryptexScene,
  Chessboard: ChessboardScene,
  MobilePhone: MobilePhoneScene,
  Modem: ModemScene,
  Cot: CotScene,
  Overtime: OvertimeScene,
  Compass: CompassScene,
  ...(DEMO_BUILD ? {} : {
    Sequence: SequenceScene,
    Lightswitch: LightswitchScene,
    Telescope: TelescopeScene,
    Wires: WiresScene,
    Station: TicketsScene,
    Pi: TreeScene,
    Flags: FlagsScene,
    Herbarium: HerbariumScene,
    TapCode: TapCodeScene,
    Rally: RallyScene,
    Bookshelf: BookshelfScene,
    Chemistry: ChemistryScene,
    Molecules: MoleculesScene,
    Phials: PhialsScene,
    Balance: BalanceScene,
    Equations: EquationsScene,
    Measures: MeasuresScene,
    Abacus: AbacusScene,
    Rewind: RewindScene,
  }),
};

export const LEVEL_DEFINITIONS = Object.freeze(LEVEL_METADATA.map((level) => Object.freeze({
  ...level,
  scene: scenes[level.key],
})));
