# Wind in the exterior trees

The two foreground jacaranda trees, their camera-visible coverage and the
background they reveal are taken directly from the existing Blender manor
scene (`art/blender/manor.py`). No AI generation, inpainting or approximated
silhouette masks were used. The underlying Poly Haven assets retain their
CC0 licenses.

`art/blender/manor_wind.py` renders the view behind the two trees while
retaining their indirect lighting and shadows. A separate antialiased
emission pass identifies the trees, preserving the original leaf alpha maps
and foreground occlusion. Dithering and tone mapping are disabled for this
data pass. The matte is packaged losslessly.

`src/ui/manorWind.js` deforms and recomposites only those tree pixels over
the revealed background. The wind comes in gusts (`windAt`): a breeze that
never settles, and every 8 to 13 seconds a gust. The crowns lean with it,
following it with a tree's slowness. The limbs move a little out of step,
and the leaves shiver cluster by cluster, each cluster along its own line.
Every motion is along a line, never round in a loop; displacement tapers to
zero at the roots. The same wind blows the leaves torn off the trees and the
fog across the park (`src/ui/manorExterior.js`), and leans the rain.
The house, gates and other unmasked scenery retain their original pixels.
The wind stops for reduced motion or disabled ambient effects, and releases
its graphics resources when entering the house. The original still exterior
remains the fallback if a texture or graphics context is unavailable.
