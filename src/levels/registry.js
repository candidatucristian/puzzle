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
import TicketsScene from "./station/TicketsScene.js";
import TreeScene from "./pi/TreeScene.js";
import FlagsScene from "./flags/FlagsScene.js";
import HerbariumScene from "./herbarium/HerbariumScene.js";
import CotScene from "./cot/CotScene.js";
import TapCodeScene from "./tapcode/TapCodeScene.js";
import RallyScene from "./rally/RallyScene.js";
import OvertimeScene from "./overtime/Overtime.js";
import FireworksScene from "./colors/Fireworksscene.js";
import CompassScene from "./compass/CompassScene.js";
import BookshelfScene from "./bookshelf/BookshelfScene.js";
import ChemistryScene from "./chemistry/ChemistryScene.js";
import MoleculesScene from "./molecules/MoleculesScene.js";
import PhialsScene from "./phials/PhialsScene.js";
import BalanceScene from "./balance/BalanceScene.js";
import EquationsScene from "./equations/EquationsScene.js";
import MeasuresScene from "./measures/MeasuresScene.js";
import BilliardsScene from "./billiards/BilliardsScene.js";
import MetroScene from "./metro/MetroScene.js";
import ResistorsScene from "./resistors/ResistorsScene.js";
import RipplesScene from "./ripples/RipplesScene.js";
import VertexScene from "./vertex/VertexScene.js";
import PlotterScene from "./plotter/PlotterScene.js";
import KineticScene from "./kinetic/KineticScene.js";
import GenomeScene from "./genome/GenomeScene.js";
import CurtainScene from "./curtain/CurtainScene.js";
import TheSillScene from "./thesill/TheSillScene.js";
import VenetianScene from "./venetian/VenetianScene.js";
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
  Station: TicketsScene,
  Pi: TreeScene,
  Flags: FlagsScene,
  Herbarium: HerbariumScene,
  Cot: CotScene,
  TapCode: TapCodeScene,
  Rally: RallyScene,
  Overtime: OvertimeScene,
  Fireworks: FireworksScene,
  Compass: CompassScene,
  Bookshelf: BookshelfScene,
  Chemistry: ChemistryScene,
  Molecules: MoleculesScene,
  Phials: PhialsScene,
  Balance: BalanceScene,
  Equations: EquationsScene,
  Measures: MeasuresScene,
  Billiards: BilliardsScene,
  Metro: MetroScene,
  Resistors: ResistorsScene,
  Ripples: RipplesScene,
  Vertex: VertexScene,
  Plotter: PlotterScene,
  Kinetic: KineticScene,
  Genome: GenomeScene,
  Curtain: CurtainScene,
  TheSill: TheSillScene,
  Venetian: VenetianScene,
};

export const LEVEL_DEFINITIONS = Object.freeze(LEVEL_METADATA.map((level) => Object.freeze({
  ...level,
  scene: scenes[level.key],
})));
