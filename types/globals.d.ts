// Typy wspólne dla skryptów z www/js (zwykłe skrypty – wspólny zakres globalny).
// Plik tylko dla TypeScriptu (`npm run check`), nie jest ładowany w przeglądarce.

/** Węzeł mapy. Pola układu (x, y, w, h, lines, s) wypełnia `lay()`; `y` to środek węzła. */
interface MapNode {
  id: number;
  text: string;
  children: MapNode[];
  collapsed: boolean;
  /** niewidoczny kontener `root` (id 0); jego dzieci to korzenie map */
  top?: boolean;
  /** miejsce upuszczenia w trakcie przeciągania (id −1) */
  ph?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  /** strona gałęzi: 1 – prawo, −1 – lewo, 0 – układ „dół” */
  s: number;
}

/** Wynik `find()`: węzeł i jego rodzic (`null` tylko dla kontenera). */
interface Found {
  n: MapNode;
  p: MapNode | null;
}

/** Styl mapy zapisywany w pliku jako `<!--style:{…}-->` (tylko różnice od `DEF`). */
interface MapStyle {
  font: string;
  weight: string;
  palette: string;
  edge: number;
  edgeStyle: string;
  nb: number;
  radius: number;
  fill: string;
  fs: number;
  maxw: number;
  gapX: number;
  gapY: number;
  gapTree: number;
  colors: string[];
}
type StyleKey = keyof MapStyle;

/** Pozycja wyświetlana węzła (animacja sprężynowa). */
interface Pos {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Węzeł chowający się do przodka po zwinięciu/usunięciu. */
interface Ghost {
  n: MapNode;
  col: string;
  anc?: MapNode;
  d0?: number;
  k?: number;
  done?: boolean;
}

/** Element narysowany w bieżącej klatce. */
interface DrawNode {
  n: MapNode;
  col: string;
  g: SVGGElement;
  ghost?: Ghost;
}
interface DrawEdge {
  p: MapNode;
  c: MapNode;
  el: SVGPathElement;
  ghost: Ghost | null;
}

/** Trwające przeciąganie węzła. */
interface DragState {
  id: number;
  node: MapNode;
  ph: MapNode;
  pre: string;
  col: string;
  off: Map<number, [number, number]>;
  from: [number, number];
  gdx: number;
  gdy: number;
  gx: number;
  gy: number;
  cx: number;
  cy: number;
  home: DropTarget;
  target?: number;
  edgeT?: number;
}
/** Miejsce upuszczenia: rodzic i brat, przed którym wstawić (`null` = na koniec). */
interface DropTarget {
  p: MapNode;
  before: MapNode | null;
}

/** Wciśnięcie wskaźnika na mapie (przed rozpoznaniem gestu). */
interface PointerDrag {
  x: number;
  y: number;
  tx: number;
  ty: number;
  id: number;
  touch: boolean;
}

/** Trwająca edycja tekstu w węźle. */
interface EditState {
  id: number;
  isNew?: boolean;
  pre: string;
  old: string;
  back?: number;
}

/** Czynność z tabeli `ACT` (actions.js): pomoc, menu i paleta komend biorą z niej nazwę i skróty. */
interface Act {
  id: string;
  /** nazwa (w pomocy z małej litery) */
  t: string;
  ic?: string;
  /** skróty zwykłe; pierwszy jest pokazywany w menu i w palecie */
  k?: string[];
  /** skróty vim */
  v?: string[];
  /** komenda „:” (bez dwukropka) i jej inne zapisy */
  c?: string;
  ca?: string[];
  /** objaśnienie w menu (po najechaniu); w pomocy w nawiasie, jeśli nie ma `d` */
  tip?: string;
  /** dopisek w pomocy */
  d?: string;
  /** uruchom; bez `f` czynność jest tylko w pomocy (poruszanie się) */
  f?: () => unknown;
  /** powód niedostępności ('' = dostępna) */
  off?: () => string;
  /** false – nie pokazuj w palecie */
  pal?: boolean;
  /** wiersz w pomocy: false – brak, para – zamiast skrótów i nazwy */
  help?: false | [string, string];
}

/** Pozycja na liście palety komend. */
interface PalItem {
  id: string;
  t: string;
  keys: string[];
  /** powód niedostępności ('' = dostępna) */
  off: string;
  f: () => unknown;
  /** id zapamiętywane jako ostatnio użyte ('' – nie zapamiętuj) */
  rec: string;
}

/** Pozycja menu (`openMenu`). */
interface MenuItem {
  ic: string;
  t: string;
  f: () => unknown;
  id?: string;
  k?: string;
  tip?: string;
  off?: boolean;
  on?: boolean;
}
type MenuEntry = MenuItem | '-' | { head: string };

/** Pozycja panelu „Wygląd mapy”: suwak (min/max/step) albo przyciski wyboru (opts). */
interface SideItem {
  k: StyleKey;
  t: string;
  font?: number;
  opts?: [string, string][];
  min?: number;
  max?: number;
  step?: number;
  u?: string;
}

/** Elementy strony według id – typ zwracany przez `$()`. */
interface Elements {
  top: HTMLDivElement;
  main: HTMLDivElement;
  sv: SVGSVGElement;
  g: SVGGElement;
  txt: HTMLTextAreaElement;
  ed: HTMLTextAreaElement;
  edemo: HTMLButtonElement;
  help: HTMLDivElement;
  side: HTMLElement;
  menu: HTMLDivElement;
  emo: HTMLDivElement;
  pal: HTMLDivElement;
  palq: HTMLInputElement;
  pall: HTMLDivElement;
  st: HTMLDivElement;
  mode: HTMLSpanElement;
  cmd: HTMLInputElement;
  info: HTMLSpanElement;
  hint: HTMLSpanElement;
  save: HTMLSpanElement;
  bm: HTMLButtonElement;
  bu: HTMLButtonElement;
  br: HTMLButtonElement;
  bl: HTMLButtonElement;
  bf: HTMLButtonElement;
  bt: HTMLButtonElement;
  bp: HTMLButtonElement;
  // tworzone dynamicznie (pomoc, panel wyglądu)
  hx: HTMLButtonElement;
  sx: HTMLButtonElement;
  sreset: HTMLButtonElement;
  paledit: HTMLButtonElement;
  palreset: HTMLButtonElement;
  paled: HTMLDivElement;
  [k: `so-${string}`]: HTMLOutputElement;
}

// File System Access API (Chrome/Edge) – brak w lib.dom
interface FileSystemFileHandle {
  createWritable(): Promise<{ write(d: string): Promise<void>; close(): Promise<void> }>;
}
interface Window {
  showSaveFilePicker?: (o?: object) => Promise<FileSystemFileHandle>;
  showOpenFilePicker?: (o?: object) => Promise<FileSystemFileHandle[]>;
}
