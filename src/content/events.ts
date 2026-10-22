// Narrative event library. Pure data: texts, appearance conditions and declarative effects.
// The interpreter lives in src/engine/events.ts. Placeholders: {team} {city} {coach} {teammate}
// {rival} {agent} {country} {opp} {vet}.
import type {
  AttrKey, Competition, EffectBag, MinigameKind, MinigameMechanic, MinigameTierId, Mode, Phase, Pos, TeamStatus,
} from '../engine/types';

export type RoleKey = 'star' | 'starter' | 'rotation' | 'bench' | 'out';

export interface EventWhen {
  phases?: Phase[];
  /** Only runs on these career modes (e.g. money assets need the full economy). */
  modes?: Mode[];
  /** Full careers with an initialized economy state; old full saves stay in legacy. */
  financeOnly?: boolean;
  /** Minimum wallet needed for the event to make sense. */
  minCash?: number;
  minAge?: number; maxAge?: number;
  minOvr?: number; maxOvr?: number;
  roles?: RoleKey[];
  minTrust?: number; maxTrust?: number;
  minMorale?: number; maxMorale?: number;
  minChem?: number; maxChem?: number;
  minFame?: number; maxFame?: number;
  minPressure?: number;
  minRep?: number;
  minFatigue?: number;
  minForm?: number; maxForm?: number;
  injured?: boolean;
  severity?: ('leve' | 'moderada' | 'grave')[];
  flags?: string[]; notFlags?: string[];
  comp?: Competition[];
  contract?: 'expiring' | 'rookie' | 'two-way' | 'long';
  teamStatus?: TeamStatus[];
  teamWinning?: boolean; teamLosing?: boolean;
  minYearsPro?: number; maxYearsPro?: number;
  beforeDeadline?: boolean;
  nba?: boolean;
  chainOnly?: boolean;
  /** Only when the user plays one of these positions. */
  positions?: Pos[];
}

export interface EventOutcome {
  weight: number;
  /** Adds weight per point of a stat above 50 (or OVR above 70). */
  boost?: { stat: 'ovr' | 'trust' | 'fame' | 'workEthic' | 'chemistry' | 'reputation' | 'morale'; per: number };
  effects: EffectBag;
  text: string;
}

export interface EventOption {
  label: string;
  desc: string;
  effects?: EffectBag;
  text?: string;
  outcomes?: EventOutcome[];
}

export interface MinigameDef {
  kind: MinigameKind;
  attempts: number;
  /** Attributes that widen the green zone. */
  attrs: AttrKey[];
  /** 0 (relaxed) to 1 (maximum pressure): narrows the zone and speeds up the marker. */
  pressure: number;
  /** Made shots needed for each tier. */
  great: number;
  ok: number;
  outcomes: Record<'great' | 'ok' | 'fail', { effects: EffectBag; text: string }>;
  // --- phase 2, all optional ---
  /** Widget that plays the challenge. Default 'meter'. */
  mechanic?: MinigameMechanic;
  /** Thematic positions (affinity in the event picker). */
  positions?: Pos[];
  /** Levels offered. Default ['normal']. */
  tiers?: MinigameTierId[];
  /** Level armed first. Default 'normal'. */
  defaultTier?: MinigameTierId;
  /** The engine picks the level from the player's state (fatigue, morale, pressure). */
  autoScale?: boolean;
  /** 'choice'/'reaction': number of options or quadrants. */
  slots?: number;
  /** 'reaction': total reaction window in ms. */
  windowMs?: number;
}

export interface EventDef {
  id: string;
  /** Interactive shooting challenge instead of (or before) plain options. */
  minigame?: MinigameDef;
  category: string;
  title: string;
  text: string;
  weight: number;
  cooldown?: number; // days
  once?: boolean;
  priority?: number; // higher = preferred when several are eligible
  when: EventWhen;
  options: EventOption[];
}

export const CATEGORY_LABEL: Record<string, string> = {
  training: 'Entrenamiento', minutes: 'Minutos', coach: 'Entrenador', teammates: 'Compañeros', agent: 'Agente',
  contract: 'Contrato', trade: 'Traspaso', injury: 'Lesión', rest: 'Descanso', media: 'Medios', rivalry: 'Rivalidad',
  personal: 'Vida personal', national: 'Selección', sponsor: 'Patrocinio', social: 'Redes sociales',
  locker: 'Vestuario', coachChange: 'Cambio de entrenador', goals: 'Objetivos', money: 'Dinero', career: 'Final de carrera',
  draft: 'Draft', clutch: 'Momento decisivo', contest: 'All-Star',
};

const SEASON: Phase[] = ['regular'];
const ANY_ACTIVE: Phase[] = ['preseason', 'regular'];

export const EVENTS: EventDef[] = [
  // ---------------- Minutes / coach ----------------
  { id: 'bench-role', category: 'minutes', title: 'Un papel desde el banquillo', weight: 10, cooldown: 200,
    text: '{coach} te cita en su despacho: quiere que salgas desde el banquillo para darle energía a la segunda unidad.',
    when: { phases: SEASON, roles: ['starter', 'rotation'], nba: true, maxOvr: 82 },
    options: [
      { label: 'Aceptar el rol', desc: 'Demostrar tu valor desde el banquillo.', effects: { trust: 8, chemistry: 4, morale: -3 }, text: 'El cuerpo técnico valora tu actitud. El vestuario también.' },
      { label: 'Exigir más minutos', desc: 'Dejar claro que eres titular.', outcomes: [
        { weight: 1, boost: { stat: 'ovr', per: 0.08 }, effects: { trust: 2, morale: 4, reputation: 2 }, text: '{coach} acepta darte una oportunidad: o rindes, o vuelves al banquillo.' },
        { weight: 2, effects: { trust: -10, chemistry: -4, pressure: 4 }, text: 'La reunión termina mal. {coach} no olvida fácilmente.' } ] },
      { label: 'Reunión privada', desc: 'Entender qué espera de ti.', effects: { trust: 4, morale: 2, flag: 'coachTalk' }, text: '{coach} te explica qué necesita: más defensa y menos pérdidas.' },
      { label: 'Hablar con tu agente', desc: 'Explorar otras salidas.', effects: { trust: -5, loyalty: -8, flag: 'tradeCurious' }, text: '{agent} empieza a tantear el mercado discretamente.' },
    ] },
  { id: 'dnp-streak', category: 'minutes', title: 'Sin minutos', weight: 12, cooldown: 90,
    text: 'Llevas varios partidos sin pisar la pista. Los periodistas locales empiezan a preguntar por ti.',
    when: { phases: SEASON, roles: ['bench'], nba: true },
    options: [
      { label: 'Trabajar en silencio', desc: 'Entrenamientos extra después de la práctica.', effects: { workEthic: 5, trust: 5, fatigue: 6, attrs: { consistency: 1 } }, text: 'Los asistentes notan que te quedas cada día. La confianza crece.' },
      { label: 'Pedir ir a la G League', desc: 'Jugar minutos de verdad.', effects: { gleague: true, trust: 3, morale: 3 }, text: 'Te asignan al filial: vas a jugar y a coger ritmo.' },
      { label: 'Quejarte en público', desc: 'Mandar un mensaje claro a la directiva.', effects: { trust: -12, fame: 4, pressure: 6, chemistry: -5 }, text: 'Tus palabras abren los informativos. {coach} no está contento.' },
    ] },
  { id: 'starter-chance', category: 'minutes', title: 'Oportunidad de titular', weight: 9, cooldown: 150,
    text: 'Una lesión en la plantilla abre un hueco en el quinteto inicial. {coach} duda entre tú y {vet}.',
    when: { phases: SEASON, roles: ['rotation', 'bench'], nba: true, minOvr: 64 },
    options: [
      { label: 'Pedir el puesto', desc: 'Dar un paso al frente.', outcomes: [
        { weight: 1, boost: { stat: 'trust', per: 0.05 }, effects: { trust: 10, morale: 6, reputation: 3 }, text: 'Te ganas la titularidad. Ahora toca mantenerla.' },
        { weight: 1, effects: { trust: -2, morale: -4 }, text: '{coach} se decanta por {vet}. Seguirás esperando tu momento.' } ] },
      { label: 'Apoyar a {vet}', desc: 'Primero el equipo.', effects: { chemistry: 8, trust: 3 }, text: '{vet} te lo agradece delante de todos. Gana el vestuario.' },
    ] },
  { id: 'coach-film', category: 'coach', title: 'Sesión de vídeo', weight: 8, cooldown: 120,
    text: '{coach} te propone sesiones de vídeo individuales tres mañanas por semana para corregir tus lecturas defensivas.',
    when: { phases: ANY_ACTIVE, nba: true, maxAge: 30 },
    options: [
      { label: 'Aceptar', desc: 'Más trabajo, mejor comprensión.', effects: { attrs: { defIQ: 2 }, trust: 5, fatigue: 4 }, text: 'Empiezas a anticipar las jugadas rivales.' },
      { label: 'Solo una sesión semanal', desc: 'Equilibrio con el descanso.', effects: { attrs: { defIQ: 1 }, trust: 1 }, text: 'Un compromiso razonable.' },
      { label: 'Rechazar', desc: 'Prefieres tu propia rutina.', effects: { trust: -6 }, text: '{coach} toma nota.' },
    ] },
  { id: 'coach-praise', category: 'coach', title: 'Elogios públicos', weight: 6, cooldown: 120,
    text: 'En rueda de prensa, {coach} dice que eres "el jugador que más ha crecido este año".',
    when: { phases: SEASON, nba: true, minForm: 3 },
    options: [
      { label: 'Agradecerlo con humildad', desc: 'Mantener los pies en el suelo.', effects: { trust: 4, chemistry: 3, reputation: 2 }, text: 'Tu respuesta refuerza la imagen de profesional serio.' },
      { label: 'Aprovechar el foco', desc: 'Reivindicarte ante los medios.', effects: { fame: 5, pressure: 4, reputation: 3 }, text: 'Los titulares hablan de ti toda la semana.' },
    ] },
  { id: 'coach-clash', category: 'coach', title: 'Choque en el entrenamiento', weight: 5, cooldown: 200,
    text: 'Tras una derrota dolorosa, {coach} te señala delante de todos por tu falta de intensidad defensiva.',
    when: { phases: SEASON, nba: true, teamLosing: true },
    options: [
      { label: 'Callar y responder en la pista', desc: 'La respuesta, con hechos.', effects: { trust: 4, form: 2, morale: -2 }, text: 'Al día siguiente eres el primero en llegar.' },
      { label: 'Encararte con él', desc: 'No vas a aceptar humillaciones.', outcomes: [
        { weight: 1, effects: { trust: -12, chemistry: -6, flag: 'coachFeud' }, text: 'El enfrentamiento trasciende a la prensa. La relación queda tocada.', },
        { weight: 1, effects: { trust: 2, reputation: 2 }, text: 'Sorprendentemente, {coach} respeta que defiendas tu posición.' } ] },
      { label: 'Pedir disculpas al grupo', desc: 'Asumir responsabilidades.', effects: { chemistry: 6, trust: 6, morale: -3 }, text: 'El vestuario cierra filas contigo.' },
    ] },
  // ---------------- Training ----------------
  { id: 'summer-shooting', category: 'training', title: 'Campus de tiro', weight: 8, cooldown: 300,
    text: 'Un reputado entrenador de tiro te ofrece trabajar con él durante cuatro semanas.',
    when: { phases: ['offseason', 'preseason'], maxAge: 32 },
    options: [
      { label: 'Contratarle ($150K)', desc: 'Inversión en tu mecánica.', effects: { money: -150000, attrs: { three: 2, mid: 1, ft: 1 } }, text: 'Tu mecánica es más limpia y repetible.' },
      { label: 'Entrenar por tu cuenta', desc: 'Gratis, pero menos eficaz.', outcomes: [
        { weight: 1, boost: { stat: 'workEthic', per: 0.05 }, effects: { attrs: { three: 1 } }, text: 'Miles de tiros después, algo mejora.' },
        { weight: 1, effects: {}, text: 'El verano pasa sin grandes cambios.' } ] },
      { label: 'Descansar', desc: 'Llegar fresco a la temporada.', effects: { fatigue: -20, morale: 4 }, text: 'Recargas pilas.' },
    ] },
  { id: 'gym-bulk', category: 'training', title: 'Ganar masa muscular', weight: 7, cooldown: 300,
    text: 'El preparador físico cree que con 5 kilos más de músculo dominarías mejor el contacto.',
    when: { phases: ['offseason', 'preseason'], maxAge: 31 },
    options: [
      { label: 'Plan de fuerza intenso', desc: 'Más fuerza, algo menos de velocidad.', effects: { attrs: { strength: 3, speed: -1, close: 1 } }, text: 'Llegas al campus más fuerte que nunca.' },
      { label: 'Plan moderado', desc: 'Ganancia equilibrada.', effects: { attrs: { strength: 1, stamina: 1 } }, text: 'Pequeñas mejoras sin perder agilidad.' },
      { label: 'Mantener el peso', desc: 'Tu juego depende de la velocidad.', effects: { attrs: { accel: 1 } }, text: 'Prefieres seguir siendo explosivo.' },
    ] },
  { id: 'extra-practice', category: 'training', title: 'Entrenamiento a deshoras', weight: 7, cooldown: 100,
    text: 'Un veterano, {vet}, te invita a entrenar con él a las 6 de la mañana durante el parón.',
    when: { phases: SEASON, nba: true, maxAge: 27 },
    options: [
      { label: 'Apuntarte', desc: 'Aprender del veterano.', effects: { attrs: { offIQ: 1, defIQ: 1 }, chemistry: 5, fatigue: 6, workEthic: 3 }, text: '{vet} te enseña trucos que no salen en ningún manual.' },
      { label: 'Declinar amablemente', desc: 'Necesitas dormir.', effects: { fatigue: -5 }, text: 'Descansas, pero te pierdes algo.' },
    ] },
  { id: 'new-move', category: 'training', title: 'Un movimiento nuevo', weight: 6, cooldown: 200,
    text: 'Llevas semanas trabajando un step-back. ¿Lo estrenas ya en partido?',
    when: { phases: SEASON, nba: true },
    options: [
      { label: 'Estrenarlo ya', desc: 'Sin miedo.', outcomes: [
        { weight: 1, boost: { stat: 'ovr', per: 0.05 }, effects: { attrs: { handle: 1, mid: 1 }, fame: 3, form: 2 }, text: 'El step-back se hace viral. Ya es parte de tu repertorio.' },
        { weight: 1, effects: { form: -2, trust: -2 }, text: 'Dos pérdidas seguidas intentándolo. {coach} te pide paciencia.' } ] },
      { label: 'Seguir puliéndolo', desc: 'Cuando esté listo.', effects: { attrs: { handle: 1 } }, text: 'Lo usarás cuando sea automático.' },
    ] },
  // ---------------- Teammates / locker room ----------------
  { id: 'teammate-dinner', category: 'teammates', title: 'Cena de equipo', weight: 6, cooldown: 150,
    text: '{teammate} organiza una cena para unir al grupo en plena racha irregular.',
    when: { phases: SEASON, nba: true },
    options: [
      { label: 'Ir y pagar la cuenta', desc: 'Gesto de liderazgo ($20K).', effects: { money: -20000, chemistry: 8, reputation: 1 }, text: 'Noche memorable. El grupo sale más unido.' },
      { label: 'Ir', desc: 'Pasar un buen rato.', effects: { chemistry: 5 }, text: 'Buena conexión con tus compañeros.' },
      { label: 'Excusarte', desc: 'Prefieres descansar.', effects: { chemistry: -4, fatigue: -4 }, text: 'Algunos lo interpretan como distancia.' },
    ] },
  { id: 'locker-conflict', category: 'locker', title: 'Tensión en el vestuario', weight: 6, cooldown: 180,
    text: '{teammate} se queja a gritos de que no le pasáis el balón. El ambiente está cargado.',
    when: { phases: SEASON, nba: true, teamLosing: true },
    options: [
      { label: 'Mediar', desc: 'Calmar las aguas.', outcomes: [
        { weight: 2, boost: { stat: 'reputation', per: 0.04 }, effects: { chemistry: 8, reputation: 3 }, text: 'Consigues que todos se escuchen. Ganas galones.' },
        { weight: 1, effects: { chemistry: -2 }, text: 'No basta. La tensión sigue latente.' } ] },
      { label: 'Ponerte de su lado', desc: 'Tiene parte de razón.', effects: { chemistry: 2, trust: -4 }, text: '{coach} no aprecia que cuestiones el sistema.' },
      { label: 'Mantenerte al margen', desc: 'No es tu guerra.', effects: { chemistry: -3 }, text: 'El problema se enquista.' },
    ] },
  { id: 'mentor-rookie', category: 'teammates', title: 'Mentor de un novato', weight: 6, cooldown: 300,
    text: 'La franquicia te pide que tutorices a un novato que llega desorientado.',
    when: { phases: ANY_ACTIVE, nba: true, minYearsPro: 5 },
    options: [
      { label: 'Aceptar el reto', desc: 'Tiempo y paciencia.', effects: { chemistry: 7, reputation: 3, trust: 3, fatigue: 3 }, text: 'El novato te sigue como a un hermano mayor.' },
      { label: 'Declinar', desc: 'Tu foco es tu juego.', effects: { trust: -2 }, text: 'Lo entienden, aunque esperaban más.' },
    ] },
  { id: 'vet-leadership', category: 'locker', title: 'Reunión de jugadores', weight: 5, cooldown: 200,
    text: 'Racha de derrotas. Los veteranos convocan una reunión solo para jugadores y te piden que hables.',
    when: { phases: SEASON, nba: true, teamLosing: true, minYearsPro: 3 },
    options: [
      { label: 'Discurso de autocrítica', desc: 'Empezar por uno mismo.', effects: { chemistry: 7, reputation: 3, morale: 2 }, text: 'Tus palabras calan. El equipo responde.' },
      { label: 'Señalar los problemas', desc: 'Hablar claro.', outcomes: [
        { weight: 1, effects: { chemistry: 4, reputation: 4 }, text: 'Duro, pero necesario. El grupo reacciona.' },
        { weight: 1, effects: { chemistry: -6 }, text: 'Algunos se lo toman como algo personal.' } ] },
    ] },
  // ---------------- Media / social ----------------
  { id: 'media-pressure', category: 'media', title: 'Bajo el foco', weight: 7, cooldown: 120,
    text: 'Una tertulia nacional cuestiona si mereces tu contrato tras varios partidos flojos.',
    when: { phases: SEASON, nba: true, maxForm: -2, minFame: 25 },
    options: [
      { label: 'Ignorar el ruido', desc: 'Concentración total.', effects: { pressure: -4, morale: -1 }, text: 'Apagas el móvil y te centras en el trabajo.' },
      { label: 'Responder en redes', desc: 'Defenderte.', outcomes: [
        { weight: 1, effects: { fame: 6, pressure: 6 }, text: 'Tu respuesta se hace viral; ahora todos esperan que lo demuestres.' },
        { weight: 1, effects: { reputation: -4, pressure: 8, trust: -3 }, text: 'El tono no gusta. La polémica crece.' } ] },
      { label: 'Entrevista exclusiva', desc: 'Contar tu versión.', effects: { pressure: -2, reputation: 2, fame: 2 }, text: 'Muestras tu lado humano. Parte de la crítica se suaviza.' },
    ] },
  { id: 'viral-dunk', category: 'social', title: 'Mate viral', weight: 6, cooldown: 150,
    text: 'Tu último mate acumula millones de reproducciones. Una marca de bebidas quiere usarlo en un anuncio.',
    when: { phases: SEASON, nba: true, minForm: 1 },
    options: [
      { label: 'Aceptar ($250K)', desc: 'Dinero rápido.', effects: { money: 250000, fame: 5 }, text: 'El anuncio se emite en horario de máxima audiencia.' },
      { label: 'Pedir más', desc: 'Tu imagen vale más.', outcomes: [
        { weight: 1, boost: { stat: 'fame', per: 0.06 }, effects: { money: 500000, fame: 6 }, text: 'La marca acepta duplicar la oferta.' },
        { weight: 1, effects: { fame: 1 }, text: 'La marca se retira. Otra vez será.' } ] },
      { label: 'Rechazar', desc: 'Prefieres no distraerte.', effects: { trust: 2 }, text: 'Tu entrenador valora tu foco.' },
    ] },
  { id: 'social-controversy', category: 'social', title: 'Polémica en redes', weight: 4, cooldown: 300,
    text: 'Un tuit tuyo de hace años resurge y genera polémica.',
    when: { phases: ANY_ACTIVE, minFame: 30 },
    options: [
      { label: 'Disculparte sinceramente', desc: 'Asumir el error.', effects: { reputation: -1, pressure: -3 }, text: 'La disculpa se percibe honesta. El tema se apaga.' },
      { label: 'Defender el mensaje', desc: 'No te arrepientes.', effects: { reputation: -6, fame: 4, pressure: 7, endorsement: -300000 }, text: 'Un patrocinador revisa vuestro acuerdo.' },
      { label: 'No decir nada', desc: 'Esperar a que pase.', effects: { pressure: 3 }, text: 'La conversación se alarga más de lo deseado.' },
    ] },
  { id: 'podcast-invite', category: 'media', title: 'Invitación a un podcast', weight: 5, cooldown: 250,
    text: 'El podcast de baloncesto más escuchado del país te invita a una entrevista larga.',
    when: { phases: ['offseason', 'preseason', 'regular'], minFame: 15 },
    options: [
      { label: 'Ir y hablar sin filtros', desc: 'Autenticidad.', outcomes: [
        { weight: 2, effects: { fame: 6, reputation: 2 }, text: 'Episodio récord de audiencia. Ganas seguidores.' },
        { weight: 1, effects: { fame: 5, chemistry: -4 }, text: 'Un comentario sobre un compañero no sienta bien.' } ] },
      { label: 'Ir con mensaje preparado', desc: 'Seguro, pero sin chispa.', effects: { fame: 2 }, text: 'Entrevista correcta.' },
      { label: 'Declinar', desc: 'Prefieres la discreción.', effects: {}, text: 'Sigues siendo un misterio para el gran público.' },
    ] },
  // ---------------- Rivalry ----------------
  { id: 'rival-trashtalk', category: 'rivalry', title: 'Provocación de {rival}', weight: 6, cooldown: 160,
    text: '{rival} declara que eres "un jugador sobrevalorado" antes del próximo duelo.',
    when: { phases: SEASON, nba: true, minFame: 20 },
    options: [
      { label: 'Responder en la pista', desc: 'Motivación extra.', outcomes: [
        { weight: 1, boost: { stat: 'ovr', per: 0.06 }, effects: { form: 4, fame: 5, reputation: 3, flag: 'rivalry' }, text: 'Gran actuación en el duelo. La rivalidad está servida.' },
        { weight: 1, effects: { form: -3, pressure: 5, flag: 'rivalry' }, text: '{rival} gana el duelo y te lo recuerda en redes.' } ] },
      { label: 'Contestar en prensa', desc: 'Ojo por ojo.', effects: { fame: 6, pressure: 5, flag: 'rivalry' }, text: 'Los medios convierten el partido en un evento.' },
      { label: 'Restarle importancia', desc: 'No entrar al trapo.', effects: { reputation: 2, pressure: -2 }, text: 'Tu calma es noticia por sí sola.' },
    ] },
  { id: 'rival-rematch', category: 'rivalry', title: 'La revancha', weight: 8, cooldown: 365,
    text: 'Vuelves a cruzarte con {rival}. Toda la liga mira este partido.',
    when: { phases: SEASON, nba: true, flags: ['rivalry'] },
    options: [
      { label: 'Ir a por todas', desc: 'Partido especial.', outcomes: [
        { weight: 1, boost: { stat: 'ovr', per: 0.07 }, effects: { form: 5, fame: 6, reputation: 4, unflag: 'rivalry' }, text: 'Exhibición. Ganas la rivalidad, al menos por este año.' },
        { weight: 1, effects: { form: -2, fatigue: 8 }, text: 'Partido durísimo. Sin vencedor claro en el duelo individual.' } ] },
      { label: 'Jugar el sistema', desc: 'Que gane el equipo.', effects: { trust: 4, chemistry: 3 }, text: 'Tu entrenador agradece la madurez.' },
    ] },
  // ---------------- Gambles: visible odds, real consequences ----------------
  { id: 'gamble-injection', category: 'injury', title: 'Infiltrarte para el partido decisivo', weight: 9, cooldown: 300,
    text: 'Arrastras {injury}. El médico puede infiltrarte para que juegues esta noche, pero si la lesión se agrava te pierdes lo que queda de temporada.',
    when: { phases: ['postseason', 'regular'], injured: true, severity: ['leve', 'moderada'], nba: true },
    options: [
      { label: 'Jugar infiltrado', desc: 'Todo o nada: el equipo te necesita.', outcomes: [
        { weight: 3, boost: { stat: 'workEthic', per: 0.02 }, effects: { playThrough: true, heal: 30, fame: 8, trust: 6, morale: 6, form: 3 }, text: 'Juegas como si nada. La afición corea tu nombre.' },
        { weight: 2, effects: { injure: 'grave', morale: -10, fame: 2 }, text: 'En la segunda parte la rodilla cede. Temporada en blanco.' } ] },
      { label: 'No arriesgar', desc: 'Primero la salud.', effects: { trust: -2, morale: -2, fame: -2 }, text: 'Lo ves desde el banquillo, con la cabeza fría.' },
    ] },
  { id: 'gamble-dunk', category: 'media', title: 'El mate imposible', weight: 6, cooldown: 500,
    text: 'En el calentamiento te retan a intentar un mate que nadie ha hecho jamás. Las cámaras ya están grabando.',
    when: { phases: ['regular'], minFame: 30, nba: true },
    options: [
      { label: 'Intentarlo', desc: 'Puede ser historia… o un esguince.', outcomes: [
        { weight: 11, boost: { stat: 'ovr', per: 0.15 }, effects: { fame: 12, endorsement: 150_000, morale: 4 }, text: 'Lo clavas. El vídeo da la vuelta al mundo.' },
        { weight: 9, effects: { injure: 'leve', fame: 2, pressure: 4 }, text: 'Caes mal. Risas en redes y unos días en la enfermería.' } ] },
      { label: 'Mejor un mate normal', desc: 'Sin riesgos.', effects: { fame: 1 }, text: 'Correcto, sin más.' },
    ] },
  { id: 'gamble-diet', category: 'training', title: 'Plan de alimentación extremo', weight: 6, cooldown: 500,
    text: 'Un nutricionista de moda te propone un plan muy estricto: menos grasa, más músculo… si tu cuerpo lo aguanta.',
    when: { phases: ['regular', 'offseason'], minAge: 19 },
    options: [
      { label: 'Seguir el plan', desc: 'Puede cambiarte el físico, para bien o para mal.', outcomes: [
        { weight: 6, boost: { stat: 'workEthic', per: 0.03 }, effects: { ovr: 4, morale: 3 }, text: 'Pierdes grasa, ganas potencia y te sientes más rápido que nunca.' },
        { weight: 4, effects: { ovr: -5, fatigue: 12, morale: -4 }, text: 'Tu cuerpo no lo asimila: pierdes fuerza y energía en pleno curso.' } ] },
      { label: 'Tu dieta de siempre', desc: 'Lo que te ha traído hasta aquí.', effects: { form: 1 }, text: 'Sin sorpresas: sigues como estabas.' },
    ] },
  { id: 'gamble-coach', category: 'training', title: 'Entrenador de élite', weight: 5, cooldown: 600,
    text: 'Un preparador que ha trabajado con estrellas se ofrece a entrenarte en privado. No es barato y su método es durísimo.',
    when: { phases: ['regular', 'offseason'], minAge: 20 },
    options: [
      { label: 'Contratarle ($300K)', desc: 'Método exigente: o das el salto o te pasas de vueltas.', outcomes: [
        { weight: 13, boost: { stat: 'workEthic', per: 0.05 }, effects: { money: -300_000, ovr: 3, workEthic: 3 }, text: 'Su método funciona: tu juego da un salto visible.' },
        { weight: 7, effects: { money: -300_000, ovr: -2, injure: 'leve' }, text: 'Sobrecarga muscular: semanas perdidas y algo de nivel por el camino.' } ] },
      { label: 'Seguir con el cuerpo técnico', desc: 'Sin gastar nada.', effects: { trust: 2 }, text: 'El club valora que confíes en su gente.' },
    ] },
  { id: 'gamble-altitude', category: 'training', title: 'Concentración en altura', weight: 5, cooldown: 600,
    text: 'Te invitan a tres semanas de entrenamiento en altura. Los pulmones lo agradecen… si el cuerpo se adapta.',
    when: { phases: ['offseason', 'regular'], minAge: 19 },
    options: [
      { label: 'Ir a la concentración', desc: 'Más resistencia y explosividad, o un bajón.', outcomes: [
        { weight: 11, effects: { ovr: 3, fatigue: -5 }, text: 'Vuelves con un fondo físico espectacular.' },
        { weight: 9, effects: { ovr: -3, fatigue: 15 }, text: 'No te adaptas: vuelves agotado y fuera de ritmo.' } ] },
      { label: 'Descansar en casa', desc: 'Recuperar y desconectar.', effects: { fatigue: -10, morale: 2 }, text: 'Desconectas y recargas pilas.' },
    ] },
  { id: 'gamble-mechanics', category: 'training', title: 'Rehacer tu tiro', weight: 5, cooldown: 700,
    text: 'Tu entrenador de tiro cree que tu mecánica tiene un techo. Propone rehacerla desde cero a mitad de temporada.',
    when: { phases: ['regular'], minAge: 19 },
    options: [
      { label: 'Rehacer la mecánica', desc: 'Un tiro nuevo… o perder el que tenías.', outcomes: [
        { weight: 1, effects: { ovr: 3, attrs: { three: 3, mid: 2 } }, text: 'El nuevo tiro sale limpio y rápido. Ahora eres una amenaza.' },
        { weight: 1, effects: { ovr: -3, attrs: { three: -3 }, morale: -4 }, text: 'Pierdes el ritmo de tiro y nada entra durante semanas.' } ] },
      { label: 'No tocar nada', desc: 'Lo que funciona, no se toca.', effects: { form: 1 }, text: 'Mantienes tu tiro de siempre.' },
    ] },
  { id: 'gamble-supplement', category: 'training', title: 'Suplemento milagro', weight: 4, cooldown: 700,
    text: 'Un compañero jura que un suplemento natural nuevo le ha cambiado el físico. Te pasa un bote.',
    when: { phases: ['regular'], minAge: 20 },
    options: [
      { label: 'Probarlo', desc: 'Puede darte un extra… o sentarte fatal.', outcomes: [
        { weight: 1, effects: { ovr: 2, form: 3 }, text: 'Te sientes más fuerte y con más chispa en cada partido.' },
        { weight: 1, effects: { ovr: -4, form: -4, pressure: 4 }, text: 'Te sienta fatal: molestias, malas noches y un bajón de juego.' } ] },
      { label: 'Ni tocarlo', desc: 'Nada que no apruebe el club.', effects: { trust: 1 }, text: 'Lo dejas en la taquilla. El médico del club te da la razón.' },
    ] },
  { id: 'gamble-party', category: 'locker', title: 'Fiesta la víspera', weight: 6, cooldown: 400,
    text: 'Tus compañeros montan una fiesta la noche antes de un partido importante.',
    when: { phases: ['regular'], minAge: 19 },
    options: [
      { label: 'Ir a la fiesta', desc: 'Unir al grupo… o llegar fatal al partido.', outcomes: [
        { weight: 1, effects: { chemistry: 7, morale: 5 }, text: 'Noche épica y al día siguiente estás fino. El vestuario, más unido que nunca.' },
        { weight: 1, effects: { form: -4, trust: -6, pressure: 8 }, text: 'Llegas sin dormir, juegas fatal y el entrenador se entera.' } ] },
      { label: 'Quedarte en casa', desc: 'Descansar.', effects: { fatigue: -8, chemistry: -2 }, text: 'Duermes ocho horas. Algún compañero lo nota.' },
    ] },
  { id: 'gamble-invest', category: 'money', title: 'Inversión arriesgada', weight: 5, cooldown: 600,
    text: 'Un conocido te ofrece entrar en una empresa emergente. Puede multiplicar tu dinero o hacerlo desaparecer.',
    when: { phases: ['regular', 'offseason'], minAge: 21 },
    options: [
      { label: 'Invertir $500K', desc: 'Alto riesgo, alta recompensa.', outcomes: [
        { weight: 2, effects: { money: 1_000_000, morale: 4 }, text: 'La empresa despega: recuperas tu dinero y un millón más.' },
        { weight: 3, effects: { money: -500_000, morale: -5, pressure: 3 }, text: 'La empresa quiebra. Adiós a la inversión.' } ] },
      { label: 'No, gracias', desc: 'El dinero, en el banco.', effects: {}, text: 'Prudencia financiera.' },
    ] },
  { id: 'gamble-allin', category: 'money', title: 'Doble o nada', weight: 9, cooldown: 300, priority: 1,
    text: 'Un inversor te propone una operación exprés: pones todo tu efectivo sobre la mesa y, en una semana, o lo doblas o lo pierdes. Sin garantías.',
    when: { modes: ['full'], financeOnly: true, phases: ['offseason', 'preseason', 'regular'], minAge: 21, minCash: 50_000 },
    options: [
      { label: 'Jugártelo todo', desc: 'Apuestas todo tu efectivo: doblarlo o quedarte en la ruina.', outcomes: [
        { weight: 1, effects: { allIn: 'double', morale: 10, fame: 5 }, text: 'La operación sale redonda. Tu cuenta se dobla y suena el teléfono.' },
        { weight: 1, effects: { allIn: 'lose', bankrupt: true, pressure: 20 }, text: 'El inversor desaparece. Pierdes todo tu efectivo y el banco ejecuta tus bienes.' } ] },
      { label: 'No jugártela', desc: 'El dinero quieto no se pierde.', effects: { morale: 2 }, text: 'Prefieres dormir tranquilo. El inversor busca a otro.' },
    ] },
  // ---------------- Injury / rest ----------------
  { id: 'injury-minor', category: 'injury', title: 'Molestias físicas', weight: 0, priority: 10,
    text: 'El cuerpo médico confirma: {injury}. Te dan opciones.',
    when: { injured: true, severity: ['leve'], chainOnly: true },
    options: [
      { label: 'Jugar con molestias', desc: 'El equipo te necesita.', effects: { playThrough: true, trust: 4, injuryRisk: 0.5 }, text: 'Saltas a la pista vendado. Arriesgado.' },
      { label: 'Seguir al cuerpo médico', desc: 'Recuperación estándar.', effects: { trust: 1 }, text: 'Paciencia: volverás al 100%.' },
      { label: 'Descanso extra', desc: 'Asegurar la recuperación.', effects: { heal: -30, fatigue: -20 }, text: 'Te tomas unos días más para llegar perfecto.' },
    ] },
  { id: 'injury-moderate', category: 'injury', title: 'Lesión: {injury}', weight: 0, priority: 10,
    text: 'Las pruebas confirman la lesión. El equipo médico propone un plan conservador, pero hay alternativas.',
    when: { injured: true, severity: ['moderada'], chainOnly: true },
    options: [
      { label: 'Plan conservador', desc: 'Respetar los plazos.', effects: { morale: -2 }, text: 'Recuperación por etapas, sin riesgos.' },
      { label: 'Acelerar la rehabilitación', desc: 'Volver antes, con riesgo.', outcomes: [
        { weight: 3, effects: { heal: 35, trust: 3 }, text: 'Tu cuerpo responde: vuelves antes de lo previsto.' },
        { weight: 1, effects: { heal: 10, injuryRisk: 1.5, flag: 'reinjuryRisk' }, text: 'Vuelves, pero algo no termina de ir bien.' } ] },
      { label: 'Especialista privado ($300K)', desc: 'Lo mejor que el dinero puede pagar.', effects: { money: -300000, heal: 25 }, text: 'Un tratamiento puntero recorta los plazos.' },
    ] },
  { id: 'injury-severe', category: 'injury', title: 'Lesión grave: {injury}', weight: 0, priority: 12,
    text: 'Es el golpe más duro de tu carrera. Te espera una larga rehabilitación.',
    when: { injured: true, severity: ['grave'], chainOnly: true },
    options: [
      { label: 'Rehabilitación con el club', desc: 'Confiar en los médicos del equipo.', effects: { morale: -8, chemistry: 3 }, text: 'Cada día es una pequeña batalla.' },
      { label: 'Centro de élite externo ($500K)', desc: 'Mejor atención, menos contacto con el equipo.', effects: { money: -500000, heal: 15, chemistry: -3, morale: -4 }, text: 'Volverás en las mejores condiciones posibles.' },
      { label: 'Aprovechar para estudiar el juego', desc: 'Vídeo y lectura táctica.', effects: { attrs: { offIQ: 2, defIQ: 2 }, morale: -5 }, text: 'Vuelves sabiendo leer el juego mejor que nunca.' },
    ] },
  { id: 'fatigue-warning', category: 'rest', title: 'Señales de fatiga', weight: 9, cooldown: 60,
    text: 'Los datos de carga muestran que estás al límite. El preparador recomienda descansar un partido.',
    when: { phases: SEASON, nba: true, minFatigue: 55 },
    options: [
      { label: 'Descansar', desc: 'Prevenir antes que curar.', effects: { fatigue: -30, trust: -1 }, text: 'Un día de descanso. Las piernas lo agradecen.' },
      { label: 'Jugar igualmente', desc: 'Cada partido cuenta.', effects: { injuryRisk: 0.6, trust: 3 }, text: 'Juegas, pero el riesgo está ahí.' },
      { label: 'Reducir carga en entrenos', desc: 'Término medio.', effects: { fatigue: -14 }, text: 'Sesiones más ligeras esta semana.' },
    ] },
  // ---------------- Agent / contract / money ----------------
  { id: 'agent-switch', category: 'agent', title: 'Una agencia te corteja', weight: 5, cooldown: 400,
    text: 'Una agencia más poderosa que {agent} te promete mejores contratos y patrocinios.',
    when: { phases: ['offseason', 'preseason', 'regular'], minRep: 35 },
    options: [
      { label: 'Cambiar de agencia', desc: 'Más influencia, menos lealtad.', effects: { flag: 'agentUpgrade', loyalty: -3 }, text: 'Firmas con la nueva agencia. Sus contactos abren puertas.' },
      { label: 'Seguir con {agent}', desc: 'Lealtad.', effects: { loyalty: 4, morale: 2 }, text: '{agent} agradece tu confianza.' },
    ] },
  { id: 'extension-talk', category: 'contract', title: 'Conversaciones de extensión', weight: 9, cooldown: 300,
    text: 'La directiva de {team} quiere hablar de tu futuro antes de que llegue la agencia libre.',
    when: { phases: SEASON, nba: true, contract: 'expiring', minOvr: 70 },
    options: [
      { label: 'Mostrar compromiso', desc: 'Quieres quedarte.', effects: { loyalty: 8, trust: 4, flag: 'wantsStay' }, text: 'La franquicia toma nota: serás prioridad este verano.' },
      { label: 'Esperar al verano', desc: 'Ver qué ofrece el mercado.', effects: { loyalty: -4, flag: 'testMarket' }, text: 'Se respetará tu decisión, pero el riesgo es mutuo.' },
    ] },
  { id: 'investment', category: 'money', title: 'Oportunidad de inversión', weight: 5, cooldown: 300,
    text: 'Un amigo de la infancia te propone invertir en su cadena de restaurantes.',
    when: { phases: ['offseason', 'preseason', 'regular'], minAge: 22 },
    options: [
      { label: 'Invertir $500K', desc: 'Alto riesgo, alta recompensa.', outcomes: [
        { weight: 1, effects: { money: 900000 }, text: 'El negocio despega. Tu inversión casi se duplica.' },
        { weight: 1, effects: { money: -500000, morale: -3 }, text: 'El negocio cierra al año. Lección aprendida.' } ] },
      { label: 'Invertir $100K', desc: 'Apoyo prudente.', outcomes: [
        { weight: 1, effects: { money: 120000, morale: 2 }, text: 'Pequeño beneficio y un amigo agradecido.' },
        { weight: 1, effects: { money: -100000 }, text: 'Pierdes la inversión, pero no la amistad.' } ] },
      { label: 'Rechazar', desc: 'Tu dinero, en un fondo indexado.', effects: { money: 40000 }, text: 'Rentabilidad modesta y tranquila.' },
    ] },
  { id: 'luxury-temptation', category: 'money', title: 'Tentación de lujo', weight: 4, cooldown: 400,
    text: 'Tu entorno insiste en que compres una mansión y un deportivo para "estar a la altura".',
    when: { phases: ['offseason', 'preseason'], minAge: 21 },
    options: [
      { label: 'Darte el capricho ($2M)', desc: 'Te lo has ganado.', effects: { money: -2000000, morale: 6, fame: 2 }, text: 'Disfrutas de tu nueva casa... y de la factura.' },
      { label: 'Algo más modesto ($300K)', desc: 'Equilibrio.', effects: { money: -300000, morale: 3 }, text: 'Un capricho razonable.' },
      { label: 'Ahorrar', desc: 'La carrera es corta.', effects: { workEthic: 2 }, text: 'Tu asesor financiero respira aliviado.' },
    ] },
  // ---------------- Sponsors ----------------
  { id: 'shoe-deal', category: 'sponsor', title: 'Contrato de zapatillas', weight: 7, cooldown: 500,
    text: 'Una marca deportiva te ofrece un contrato de zapatillas. Hay dos propuestas sobre la mesa.',
    when: { phases: ['offseason', 'preseason', 'regular'], minFame: 30, notFlags: ['shoeDeal'] },
    options: [
      { label: 'Gran marca, rol secundario', desc: '$1.5M/año, eres uno más.', effects: { endorsement: 1500000, fame: 3, flag: 'shoeDeal' }, text: 'Firmas con una marca global.' },
      { label: 'Marca emergente, tu modelo propio', desc: '$900K/año + zapatilla firma.', effects: { endorsement: 900000, fame: 7, flag: 'shoeDeal' }, text: 'Tu primera zapatilla con nombre propio.' },
      { label: 'Esperar a algo mejor', desc: 'Tu valor puede subir.', effects: {}, text: 'Paciencia comercial.' },
    ] },
  { id: 'local-sponsor', category: 'sponsor', title: 'Patrocinio local', weight: 7, cooldown: 300,
    text: 'Un concesionario de {city} quiere que seas su imagen.',
    when: { phases: ['preseason', 'regular'], nba: true, notFlags: ['localSponsor'] },
    options: [
      { label: 'Aceptar ($120K/año)', desc: 'Dinero y cercanía con la afición.', effects: { endorsement: 120000, fame: 2, loyalty: 2, flag: 'localSponsor' }, text: 'Tu cara aparece en vallas por toda la ciudad.' },
      { label: 'Rechazar', desc: 'No te interesa.', effects: { flag: 'localSponsor' }, text: 'Sin cambios.' },
    ] },
  // ---------------- National team ----------------
  { id: 'national-call', category: 'national', title: 'Llamada de {country}', weight: 8, cooldown: 330,
    text: 'El seleccionador de {country} te convoca para el torneo internacional de verano.',
    when: { phases: ['offseason'], minOvr: 66 },
    options: [
      { label: 'Aceptar con orgullo', desc: 'Jugar por tu país.', outcomes: [
        { weight: 2, boost: { stat: 'ovr', per: 0.05 }, effects: { fame: 6, reputation: 4, fatigue: 15, attrs: { offIQ: 1 }, flag: 'nationalTeam' }, text: 'Gran torneo con {country}. Vuelves con experiencia y prestigio.' },
        { weight: 1, effects: { fame: 3, fatigue: 20, injuryRisk: 0.4, flag: 'nationalTeam' }, text: 'Torneo exigente: vuelves cansado.' } ] },
      { label: 'Renunciar este verano', desc: 'Prioridad: tu club y tu cuerpo.', effects: { fatigue: -10, reputation: -2 }, text: 'Parte de la afición de {country} no lo entiende.' },
    ] },
  // ---------------- Personal ----------------
  { id: 'family-moment', category: 'personal', title: 'Un momento familiar', weight: 5, cooldown: 365,
    text: 'Un familiar cercano está enfermo y te gustaría estar a su lado unos días en plena temporada.',
    when: { phases: SEASON },
    options: [
      { label: 'Viajar a casa', desc: 'La familia es lo primero.', effects: { morale: 8, trust: -2, form: -1 }, text: 'El equipo lo entiende. Vuelves con la cabeza más tranquila.' },
      { label: 'Quedarte con el equipo', desc: 'Llamadas diarias.', effects: { morale: -6, trust: 2 }, text: 'Cumples, pero tu cabeza está en otra parte.' },
    ] },
  { id: 'charity', category: 'personal', title: 'Fundación benéfica', weight: 5, cooldown: 400,
    text: 'Te proponen crear una fundación para becar a jóvenes jugadores de tu barrio.',
    when: { phases: ['offseason', 'preseason', 'regular'], minAge: 23 },
    options: [
      { label: 'Crearla ($400K)', desc: 'Devolver lo recibido.', effects: { money: -400000, reputation: 6, fame: 3, morale: 5, flag: 'foundation' }, text: 'Tu fundación becará a 20 jóvenes este año.' },
      { label: 'Donación puntual ($50K)', desc: 'Ayudar sin compromiso largo.', effects: { money: -50000, reputation: 2 }, text: 'Un gesto que se agradece.' },
      { label: 'Más adelante', desc: 'Ahora no es el momento.', effects: {}, text: 'Quizá en el futuro.' },
    ] },
  { id: 'nightlife', category: 'personal', title: 'Noche de fiesta', weight: 5, cooldown: 200,
    text: 'Algunos compañeros te invitan a salir la noche antes de un partido importante.',
    when: { phases: SEASON, maxAge: 29 },
    options: [
      { label: 'Salir', desc: 'Solo un rato...', outcomes: [
        { weight: 1, effects: { chemistry: 4, morale: 3 }, text: 'Noche tranquila y buen ambiente.' },
        { weight: 1, effects: { form: -4, trust: -6, pressure: 4, chemistry: 2 }, text: 'Te fotografían de madrugada. Mal partido al día siguiente.' } ] },
      { label: 'Quedarte en el hotel', desc: 'Profesionalidad.', effects: { trust: 2, chemistry: -1 }, text: 'Duermes ocho horas. Se nota en la pista.' },
    ] },
  // ---------------- Coach change ----------------
  { id: 'coach-fired', category: 'coachChange', title: '{team} destituye a su entrenador', weight: 0, priority: 9,
    text: 'La directiva ha despedido a {coach}. Llega un nuevo técnico con ideas distintas.',
    when: { chainOnly: true },
    options: [
      { label: 'Presentarte el primero', desc: 'Causar buena impresión.', effects: { trust: 8, morale: 2 }, text: 'El nuevo técnico se fija en tu actitud.' },
      { label: 'Esperar acontecimientos', desc: 'Ver su sistema.', effects: {}, text: 'Toca empezar de cero.' },
      { label: 'Lamentarlo públicamente', desc: 'Defender a tu exentrenador.', effects: { trust: -5, reputation: 2, loyalty: 2 }, text: 'Un gesto de lealtad que el nuevo técnico no comparte.' },
    ] },
  // ---------------- Trade ----------------
  { id: 'trade-rumor', category: 'trade', title: 'Rumores de traspaso', weight: 7, cooldown: 120,
    text: 'Varias fuentes sitúan tu nombre en conversaciones de traspaso antes de la fecha límite.',
    when: { phases: SEASON, nba: true, beforeDeadline: true },
    options: [
      { label: 'Pedir explicaciones', desc: 'Hablar con la directiva.', effects: { loyalty: -2, trust: 1 }, text: 'Te aseguran que "nadie es intocable".' },
      { label: 'Pedir el traspaso', desc: 'Buscar un nuevo destino.', effects: { tradeRequest: true, chemistry: -5, loyalty: -10 }, text: 'Tu petición llega a todas las franquicias.' },
      { label: 'Centrarte en jugar', desc: 'Lo que tenga que ser, será.', effects: { morale: -1 }, text: 'El ruido sigue, pero tú a lo tuyo.' },
    ] },
  { id: 'contender-interest', category: 'trade', title: 'Un aspirante te quiere', weight: 6, cooldown: 300,
    text: 'Te llegan mensajes: un candidato al título ve en ti la pieza que le falta.',
    when: { phases: SEASON, nba: true, beforeDeadline: true, teamStatus: ['rebuild', 'middle'], minOvr: 72 },
    options: [
      { label: 'Mostrar interés', desc: 'Quieres ganar ya.', effects: { tradeRequest: true, loyalty: -6 }, text: '{agent} transmite tu disposición. Se activan llamadas.' },
      { label: 'Comprometerte con {team}', desc: 'Construir aquí.', effects: { loyalty: 10, trust: 5, reputation: 2 }, text: 'La afición de {city} te lo agradecerá.' },
    ] },
  // ---------------- Goals ----------------
  { id: 'milestone-challenge', category: 'goals', title: 'Reto personal', weight: 6, cooldown: 250,
    text: 'Tu entrenador personal te propone un reto: no fallar ni un solo entrenamiento extra durante un mes.',
    when: { phases: ANY_ACTIVE },
    options: [
      { label: 'Aceptar', desc: 'Disciplina total.', outcomes: [
        { weight: 2, boost: { stat: 'workEthic', per: 0.05 }, effects: { workEthic: 6, attrs: { consistency: 2 }, fatigue: 6 }, text: 'Lo cumples. Tu disciplina se convierte en hábito.' },
        { weight: 1, effects: { morale: -3, fatigue: 8 }, text: 'Fallas a mitad de mes. No pasa nada, pero escuece.' } ] },
      { label: 'Rechazar', desc: 'No necesitas retos.', effects: {}, text: 'Sigues con tu rutina.' },
    ] },
  // ---------------- G League / two-way ----------------
  { id: 'gleague-callup', category: 'minutes', title: '¡Llamada de la NBA!', weight: 10, cooldown: 30,
    text: 'Tus números en la G League llaman la atención: {team} te sube al primer equipo.',
    when: { phases: SEASON, comp: ['GLG'], minForm: 2 },
    options: [
      { label: 'Subir encantado', desc: 'Es tu oportunidad.', effects: { recall: true, morale: 8, trust: 4 }, text: 'Viajas esa misma noche para unirte al equipo NBA.' },
      { label: 'Pedir seguir jugando abajo', desc: 'Prefieres minutos.', effects: { trust: -2, attrs: { offIQ: 1 } }, text: 'Sigues acumulando experiencia en la G League.' },
    ] },
  { id: 'gleague-frustration', category: 'minutes', title: 'Atrapado en la G League', weight: 7, cooldown: 120,
    text: 'Llevas semanas en la G League y la llamada no llega.',
    when: { phases: SEASON, comp: ['GLG'] },
    options: [
      { label: 'Seguir trabajando', desc: 'Tu momento llegará.', effects: { workEthic: 3, attrs: { consistency: 1 } }, text: 'Paciencia y trabajo.' },
      { label: 'Pedir oportunidades a tu agente', desc: 'Presionar.', effects: { flag: 'tradeCurious', loyalty: -4, morale: 2 }, text: '{agent} habla con varias franquicias.' },
    ] },
  // ---------------- Career end ----------------
  { id: 'retirement-thoughts', category: 'career', title: '¿Hasta cuándo?', weight: 10, cooldown: 300,
    text: 'Tu cuerpo ya no responde como antes. Tu familia te pregunta si has pensado en retirarte.',
    when: { phases: ['offseason'], minAge: 33 },
    options: [
      { label: 'Seguir mientras disfrute', desc: 'El baloncesto es tu vida.', effects: { morale: 3 }, text: 'Seguirás compitiendo.' },
      { label: 'Plantear un último año', desc: 'Gira de despedida.', effects: { flag: 'farewell', fame: 5, morale: 4 }, text: 'Esta será tu última temporada. Cada pabellón te despedirá.' },
      { label: 'Cambiar de rol', desc: 'Veterano de vestuario.', effects: { chemistry: 8, trust: 4, reputation: 3 }, text: 'Aceptas menos minutos a cambio de liderar.' },
    ] },
  { id: 'mentor-legacy', category: 'career', title: 'Legado en el vestuario', weight: 6, cooldown: 400,
    text: 'Los jóvenes del equipo te piden consejos constantemente. El club te ofrece un rol de capitán.',
    when: { phases: ANY_ACTIVE, nba: true, minAge: 30 },
    options: [
      { label: 'Aceptar la capitanía', desc: 'Liderar.', effects: { chemistry: 8, reputation: 4, trust: 4, flag: 'captain' }, text: 'Eres el capitán de {team}.' },
      { label: 'Liderar sin títulos', desc: 'Sin brazalete.', effects: { chemistry: 4 }, text: 'Lideras con el ejemplo.' },
    ] },
  // ---------------- Expansion pack ----------------
  { id: 'contract-year', category: 'contract', title: 'Año de contrato', weight: 8, cooldown: 500,
    text: 'Es tu última temporada de contrato. Cada partido es un escaparate ante las 30 franquicias.',
    when: { phases: ['preseason', 'regular'], nba: true, contract: 'expiring' },
    options: [
      { label: 'Jugar para tus números', desc: 'Más tiros, más titulares.', effects: { form: 2, chemistry: -6, fame: 3, flag: 'statPadder' }, text: 'Tus números suben; algunos compañeros fruncen el ceño.' },
      { label: 'Jugar para el equipo', desc: 'Las victorias también se pagan.', effects: { chemistry: 5, trust: 4, reputation: 2 }, text: 'Los directivos valoran a los jugadores que hacen ganar.' },
      { label: 'Centrarte en defender', desc: 'Demostrar versatilidad.', effects: { attrs: { perD: 1, defIQ: 1 }, trust: 3 }, text: 'Te ganas fama de jugador fiable atrás.' },
    ] },
  { id: 'holdout', category: 'agent', title: 'Presión de tu agente', weight: 5, cooldown: 900,
    text: '{agent} cree que estás infrapagado y te propone no acudir al training camp para forzar una mejora.',
    when: { phases: ['preseason'], nba: true, minOvr: 77, contract: 'long' },
    options: [
      { label: 'Plantarte', desc: 'Medida de fuerza.', outcomes: [
        { weight: 1, effects: { money: 3000000, trust: -10, chemistry: -8, pressure: 8 }, text: 'La franquicia cede con un bonus, pero el vestuario lo recuerda.' },
        { weight: 1, effects: { money: -500000, trust: -14, reputation: -5, pressure: 10 }, text: 'Multas y titulares negativos. Vuelves sin nada.' } ] },
      { label: 'Ir al training camp', desc: 'Cumplir tu contrato.', effects: { trust: 5, loyalty: 6, reputation: 2 }, text: 'Tu profesionalidad se gana el respeto de la directiva.' },
    ] },
  { id: 'star-injured', category: 'minutes', title: 'La estrella cae lesionada', weight: 6, cooldown: 300,
    text: 'El mejor jugador del equipo estará varias semanas de baja. {coach} necesita que alguien dé un paso adelante.',
    when: { phases: SEASON, nba: true, roles: ['starter', 'rotation'] },
    options: [
      { label: 'Asumir el protagonismo', desc: 'Más tiros, más responsabilidad.', outcomes: [
        { weight: 1, boost: { stat: 'ovr', per: 0.07 }, effects: { form: 4, trust: 6, fame: 4, reputation: 3 }, text: 'Respondes con creces. La liga toma nota.' },
        { weight: 1, effects: { form: -3, pressure: 5 }, text: 'La presión pesa. Partidos irregulares.' } ] },
      { label: 'Mantener tu rol', desc: 'Que el sistema funcione.', effects: { chemistry: 4, trust: 2 }, text: 'Equilibrio y cabeza fría.' },
    ] },
  { id: 'new-rival-teammate', category: 'minutes', title: 'Competencia en tu puesto', weight: 6, cooldown: 500,
    text: '{team} incorpora a un jugador joven y prometedor en tu misma posición.',
    when: { phases: ['preseason', 'regular'], nba: true, maxAge: 30 },
    options: [
      { label: 'Competir sin cuartel', desc: 'El puesto es tuyo.', effects: { workEthic: 4, fatigue: 5, form: 1 }, text: 'Los entrenamientos suben de nivel. A ver quién gana.' },
      { label: 'Ejercer de mentor', desc: 'Ayudarle a crecer.', effects: { chemistry: 6, trust: 3, reputation: 2 }, text: 'El club valora tu madurez.' },
      { label: 'Pedir explicaciones', desc: '¿Qué significa este fichaje?', effects: { trust: -3, loyalty: -5, flag: 'tradeCurious' }, text: 'La respuesta no te convence del todo.' },
    ] },
  { id: 'betting-sponsor', category: 'sponsor', title: 'Patrocinador polémico', weight: 4, cooldown: 900,
    text: 'Una casa de apuestas te ofrece una suma enorme por ser su imagen.',
    when: { phases: ['offseason', 'preseason', 'regular'], minFame: 35 },
    options: [
      { label: 'Aceptar ($2M)', desc: 'Mucho dinero, mala imagen.', effects: { money: 2000000, reputation: -7, pressure: 5 }, text: 'Cobras, pero parte de la afición no lo perdona.' },
      { label: 'Rechazar', desc: 'Tu imagen no está en venta.', effects: { reputation: 3 }, text: 'Tu decisión recibe elogios.' },
    ] },
  { id: 'hospital-visit', category: 'social', title: 'Un aficionado especial', weight: 5, cooldown: 700,
    text: 'Un niño hospitalizado publica un vídeo diciendo que eres su ídolo. Se hace viral.',
    when: { phases: SEASON, minFame: 20 },
    options: [
      { label: 'Visitarle por sorpresa', desc: 'Un gesto que vale más que un titular.', effects: { reputation: 5, fame: 4, morale: 6 }, text: 'Una tarde que ninguno de los dos olvidará.' },
      { label: 'Enviarle una camiseta firmada', desc: 'Un detalle.', effects: { reputation: 2, fame: 1 }, text: 'Su sonrisa recorre las redes.' },
    ] },
  { id: 'olympic-summer', category: 'national', title: 'Verano olímpico', weight: 6, cooldown: 1400,
    text: '{country} se juega una medalla en el gran torneo del verano y cuenta contigo como pieza clave.',
    when: { phases: ['offseason'], minOvr: 74, flags: ['nationalTeam'] },
    options: [
      { label: 'Ir a por la medalla', desc: 'Historia para tu país.', outcomes: [
        { weight: 1, boost: { stat: 'ovr', per: 0.06 }, effects: { fame: 10, reputation: 6, fatigue: 18, flag: 'medal' }, text: '¡Medalla para {country}! Vuelves como héroe nacional.' },
        { weight: 2, effects: { fame: 4, fatigue: 18 }, text: 'Buen torneo, pero sin medalla. Queda la experiencia.' } ] },
      { label: 'Descansar este verano', desc: 'Tu club te lo agradecerá.', effects: { fatigue: -10, reputation: -3 }, text: 'Críticas en tu país, piernas frescas en octubre.' },
    ] },
  { id: 'postgame-presser', category: 'media', title: 'Rueda de prensa caliente', weight: 6, cooldown: 300,
    text: 'Tras una derrota con polémica arbitral, los periodistas te esperan.',
    when: { phases: SEASON, nba: true, teamLosing: true },
    options: [
      { label: 'Criticar a los árbitros', desc: 'Decir lo que todos piensan.', effects: { money: -50000, fame: 3, pressure: 4 }, text: 'La liga te multa con $50K. Tus aficionados te aplauden.' },
      { label: 'Asumir la culpa', desc: 'Primero, nosotros.', effects: { reputation: 3, chemistry: 3 }, text: 'Respuesta de líder.' },
      { label: 'Respuestas cortas', desc: 'Sin titulares.', effects: { pressure: -2 }, text: 'Nada que rascar para la prensa.' },
    ] },
  { id: 'locker-leak', category: 'locker', title: 'Filtración', weight: 4, cooldown: 900,
    text: 'Una discusión interna aparece publicada. Algunos compañeros sospechan de tu entorno.',
    when: { phases: SEASON, nba: true, minFame: 25 },
    options: [
      { label: 'Dar la cara ante el grupo', desc: 'Aclarar las cosas.', outcomes: [
        { weight: 2, effects: { chemistry: 4, reputation: 2 }, text: 'Te creen. El grupo sale reforzado.' },
        { weight: 1, effects: { chemistry: -6 }, text: 'Las dudas persisten.' } ] },
      { label: 'Ignorarlo', desc: 'No vas a justificarte.', effects: { chemistry: -4, pressure: 3 }, text: 'El silencio alimenta los rumores.' },
    ] },
  { id: 'system-change', category: 'coach', title: 'Nuevo rol táctico', weight: 6, cooldown: 600,
    text: '{coach} quiere que asumas más responsabilidad en la creación de juego, aunque no sea tu especialidad.',
    when: { phases: ['preseason', 'regular'], nba: true },
    options: [
      { label: 'Aceptar el reto', desc: 'Aprender algo nuevo.', effects: { attrs: { pass: 1, vision: 1 }, trust: 5, form: -1 }, text: 'Al principio cuesta, pero tu juego se amplía.' },
      { label: 'Pedir seguir con tu rol', desc: 'Haces mejor lo tuyo.', effects: { trust: -3 }, text: '{coach} acepta, pero no del todo convencido.' },
    ] },
  { id: 'load-management', category: 'rest', title: 'Gestión de carga', weight: 6, cooldown: 300,
    text: 'Los médicos recomiendan que descanses en un partido televisado a nivel nacional.',
    when: { phases: SEASON, nba: true, minAge: 28, minFatigue: 35 },
    options: [
      { label: 'Descansar', desc: 'Pensar en abril.', effects: { fatigue: -25, fame: -2 }, text: 'La afición rival te pita en el siguiente partido, pero tus piernas lo agradecen.' },
      { label: 'Jugar por los aficionados', desc: 'Han pagado por verte.', effects: { fame: 3, injuryRisk: 0.4 }, text: 'Partido especial, con algo de riesgo.' },
    ] },
  { id: 'sleep-expert', category: 'training', title: 'Ciencia del descanso', weight: 5, cooldown: 1000,
    text: 'Un especialista en sueño y nutrición deportiva te ofrece un plan personalizado.',
    when: { phases: ['offseason', 'preseason', 'regular'], minAge: 23 },
    options: [
      { label: 'Contratarle ($100K)', desc: 'Recuperar mejor.', effects: { money: -100000, workEthic: 4, fatigue: -15, attrs: { stamina: 1 } }, text: 'Duermes mejor y recuperas antes.' },
      { label: 'No, gracias', desc: 'Tu rutina funciona.', effects: {}, text: 'Sigues igual.' },
    ] },
  { id: 'heckler', category: 'personal', title: 'Un aficionado se pasa de la raya', weight: 4, cooldown: 700,
    text: 'Un aficionado rival te insulta desde primera fila durante todo el partido.',
    when: { phases: SEASON, nba: true },
    options: [
      { label: 'Avisar a seguridad', desc: 'Que actúen los responsables.', effects: { reputation: 2 }, text: 'El aficionado es expulsado. Bien gestionado.' },
      { label: 'Contestarle', desc: 'Ya basta.', effects: { money: -25000, pressure: 5, fame: 2 }, text: 'Multa de la liga y debate en tertulias.' },
      { label: 'Responder con canastas', desc: 'Silenciar la grada.', effects: { form: 2 }, text: 'Tu siguiente triple llega con dedicatoria.' },
    ] },
  { id: 'docuseries', category: 'media', title: 'Serie documental', weight: 4, cooldown: 1200,
    text: 'Una plataforma quiere grabar una serie sobre tu temporada, con cámaras en tu casa y en el vestuario.',
    when: { phases: ['offseason', 'preseason'], minFame: 45 },
    options: [
      { label: 'Aceptar ($1.2M)', desc: 'Exposición total.', effects: { money: 1200000, fame: 8, pressure: 8, chemistry: -3 }, text: 'Las cámaras te siguen a todas partes.' },
      { label: 'Solo el vestuario no', desc: 'Grabar fuera de la pista.', effects: { money: 500000, fame: 4 }, text: 'Un término medio que todos aceptan.' },
      { label: 'Rechazar', desc: 'Tu vida es tuya.', effects: {}, text: 'Privacidad ante todo.' },
    ] },
  { id: 'own-brand', category: 'money', title: 'Tu propia marca', weight: 4, cooldown: 1200,
    text: 'Te proponen lanzar una línea de ropa con tu nombre.',
    when: { phases: ['offseason', 'preseason'], minFame: 40, minAge: 24 },
    options: [
      { label: 'Lanzarla (inversión $800K)', desc: 'Riesgo empresarial.', outcomes: [
        { weight: 1, boost: { stat: 'fame', per: 0.04 }, effects: { money: 1600000, fame: 3 }, text: 'Se agota en semanas. Negocio redondo.' },
        { weight: 1, effects: { money: -800000 }, text: 'Las ventas no despegan. Pierdes la inversión.' } ] },
      { label: 'Licenciar tu nombre', desc: 'Poco riesgo, poco beneficio.', effects: { money: 250000 }, text: 'Ingresos modestos y seguros.' },
    ] },
  { id: 'farewell-tour', category: 'career', title: 'Gira de despedida', weight: 9, cooldown: 120,
    text: 'Cada pabellón te rinde homenaje en tu última temporada. Hoy te esperan con un vídeo especial.',
    when: { phases: SEASON, nba: true, flags: ['farewell'] },
    options: [
      { label: 'Dar un discurso', desc: 'Agradecer a todos.', effects: { fame: 3, morale: 5, reputation: 2 }, text: 'Ovación de pie en un pabellón rival.' },
      { label: 'Disfrutar en silencio', desc: 'Que hable el baloncesto.', effects: { form: 2, morale: 3 }, text: 'Partido emotivo y gran actuación.' },
    ] },
  { id: 'gleague-coach', category: 'training', title: 'El entrenador del filial', weight: 7, cooldown: 300,
    text: 'El técnico de la G League, un exjugador NBA, te ofrece trabajo individual después de cada sesión.',
    when: { phases: SEASON, comp: ['GLG'] },
    options: [
      { label: 'Aceptar', desc: 'Pulir detalles.', effects: { attrs: { offIQ: 1, consistency: 1 }, workEthic: 3, fatigue: 4 }, text: 'Pequeños detalles que marcan diferencias.' },
      { label: 'Priorizar el descanso', desc: 'Los viajes cansan.', effects: { fatigue: -8 }, text: 'Recuperas energía.' },
    ] },
  { id: 'teammate-trade-demand', category: 'locker', title: 'Un compañero quiere irse', weight: 4, cooldown: 900,
    text: '{teammate} ha pedido el traspaso y la prensa pregunta si tú también estás descontento.',
    when: { phases: SEASON, nba: true, teamLosing: true },
    options: [
      { label: 'Mostrar compromiso', desc: 'Aquí estoy y aquí sigo.', effects: { loyalty: 6, trust: 3, reputation: 1 }, text: 'La afición de {city} lo agradece.' },
      { label: 'Respuesta ambigua', desc: 'Dejar puertas abiertas.', effects: { loyalty: -4, pressure: 4, flag: 'tradeCurious' }, text: 'Los rumores sobre tu futuro se disparan.' },
    ] },
  { id: 'yoga', category: 'training', title: 'Flexibilidad y prevención', weight: 5, cooldown: 900,
    text: 'El fisio te recomienda incorporar yoga y movilidad a tu rutina diaria.',
    when: { phases: ['offseason', 'preseason', 'regular'], minAge: 25 },
    options: [
      { label: 'Incorporarlo', desc: 'Prevenir lesiones.', effects: { injuryRisk: -0.6, attrs: { stamina: 1 }, workEthic: 2 }, text: 'Tu cuerpo lo nota: menos molestias.' },
      { label: 'Seguir como siempre', desc: 'Lo tuyo es el gimnasio.', effects: {}, text: 'Sin cambios.' },
    ] },
  // ---------------- Minigames ----------------
  { id: 'mg-clutch', category: 'clutch', title: 'El último tiro', weight: 9, cooldown: 160,
    text: 'Empate a falta de 4 segundos contra {opp}. {coach} dibuja la jugada para ti. El pabellón entero contiene la respiración.',
    when: { phases: ['regular', 'postseason'], nba: true, roles: ['star', 'starter', 'rotation'] },
    minigame: { kind: 'clutch', attempts: 1, attrs: ['mid', 'three', 'consistency'], pressure: 0.8, great: 1, ok: 1,
      positions: ['PG', 'SG', 'SF', 'PF', 'C'],
      outcomes: {
        great: { effects: { fame: 6, reputation: 4, trust: 6, form: 3, morale: 5, flag: 'clutch' }, text: '¡Canasta sobre la bocina! Tus compañeros te sepultan en el centro de la pista.' },
        ok: { effects: { fame: 6, reputation: 4, trust: 6, form: 3 }, text: '¡Dentro! Victoria agónica.' },
        fail: { effects: { form: -2, pressure: 5, morale: -3 }, text: 'El balón escupe el aro. Prórroga… y derrota. Mañana habrá otra oportunidad.' },
      } },
    options: [] },
  { id: 'mg-freethrows', category: 'clutch', title: 'Dos tiros libres para ganar', weight: 8, cooldown: 160,
    text: 'Te hacen falta con un punto abajo y el reloj a cero. Dos tiros libres. Solo tú en la línea.',
    when: { phases: ['regular', 'postseason'], nba: true, roles: ['star', 'starter', 'rotation'] },
    minigame: { kind: 'freethrows', attempts: 2, attrs: ['ft', 'consistency'], pressure: 0.65, great: 2, ok: 1,
      positions: ['PG', 'SG', 'SF', 'PF', 'C'],
      outcomes: {
        great: { effects: { fame: 4, trust: 5, form: 2, reputation: 2 }, text: 'Dos de dos. Hielo en las venas: ganáis el partido.' },
        ok: { effects: { trust: 1 }, text: 'Metes uno y fallas otro. Prórroga… que ganáis por la mínima.' },
        fail: { effects: { form: -3, pressure: 6, trust: -3 }, text: 'Cero de dos. Las redes sociales no perdonan.' },
      } },
    options: [] },
  { id: 'mg-threes', category: 'contest', title: 'Concurso de triples del All-Star', weight: 10, cooldown: 300,
    text: 'La liga te invita al concurso de triples del fin de semana del All-Star. Diez balones, los mejores tiradores del mundo y millones de espectadores.',
    when: { phases: ['regular'], nba: true, minOvr: 70, minRep: 25, beforeDeadline: true },
    minigame: { kind: 'threes', mechanic: 'drag', attempts: 10, attrs: ['three', 'consistency'], pressure: 0.45, great: 7, ok: 4,
      positions: ['PG', 'SG', 'SF', 'PF'],
      outcomes: {
        great: { effects: { fame: 10, reputation: 5, morale: 6, endorsement: 200000, trophy: 'threeContest' }, text: '¡Campeón del concurso de triples! Levantas el trofeo entre confeti.' },
        ok: { effects: { fame: 4, morale: 2 }, text: 'Buena actuación, pero no alcanza para la final.' },
        fail: { effects: { fame: 1, morale: -2, pressure: 3 }, text: 'Noche fría desde el perímetro. Las redes se llenan de memes.' },
      } },
    options: [] },
  { id: 'mg-drill', category: 'training', title: 'Reto de tiro en el entrenamiento', weight: 7, cooldown: 220,
    text: '{coach} propone un reto al final de la sesión: cinco tiros desde la esquina. Quien gane elige la música del vestuario un mes.',
    when: { phases: ['regular', 'preseason'], nba: true },
    minigame: { kind: 'drill', mechanic: 'drag', attempts: 5, attrs: ['three', 'mid'], pressure: 0.2, great: 4, ok: 2,
      positions: ['PG', 'SG', 'SF', 'PF', 'C'],
      outcomes: {
        great: { effects: { attrs: { three: 1 }, trust: 4, chemistry: 3 }, text: 'Ganas el reto con autoridad. El cuerpo técnico toma nota.' },
        ok: { effects: { chemistry: 2 }, text: 'Quedas a mitad de tabla. Risas y buen ambiente.' },
        fail: { effects: { chemistry: 1, workEthic: 3 }, text: 'Último. Te quedas una hora más tirando: no volverá a pasar.' },
      } },
    options: [] },
  // ---------------- Phase 2 minigames (position themed) ----------------
  { id: 'mg-spotlight', category: 'media', title: 'La diana de la prensa', weight: 7, cooldown: 200,
    text: 'Un periodista te propone un reto para la portada: cinco dianas desde la zona de tiro y la cámara encendida. Si fallas, mañana se verá en todas partes.',
    when: { phases: ['regular', 'postseason'], nba: true, minFame: 20 },
    minigame: { kind: 'spotlight', mechanic: 'target', positions: ['SG'], attempts: 5, attrs: ['three', 'consistency'],
      pressure: 0.5, great: 4, ok: 2, tiers: ['easy', 'normal', 'hard'], defaultTier: 'normal', slots: 2,
      outcomes: {
        great: { effects: { fame: 8, reputation: 3, morale: 4, pressure: -4 }, text: 'Cinco dianas seguidas delante de la cámara. El vídeo se comparte solo.' },
        ok: { effects: { fame: 3, chemistry: 2 }, text: 'Cumples el reto justo a tiempo. Los compañeros te lo reconocen.' },
        fail: { effects: { fame: -2, pressure: 5, morale: -3 }, text: 'La cámara capta todos los fallos. El clip circula con burla.' },
      } },
    options: [] },
  { id: 'mg-dunk', category: 'contest', title: 'El mate del concurso', weight: 9, cooldown: 180,
    text: 'El concurso de mates del All-Star busca participantes. Te dan tres intentos y un pabellón entero esperando algo irrepetible.',
    when: { phases: ['regular'], nba: true, minOvr: 62, beforeDeadline: true },
    minigame: { kind: 'dunk', mechanic: 'power', positions: ['SF'], attempts: 3, attrs: ['dunk', 'vert', 'strength'],
      pressure: 0.55, great: 3, ok: 2, tiers: ['easy', 'normal', 'hard'], defaultTier: 'normal',
      outcomes: {
        great: { effects: { fame: 6, form: 3, morale: 5, chemistry: 4, attrs: { vert: 1 } }, text: 'Los tres mates entran limpios. El pabellón se levanta y tus compañeros invaden la pista.' },
        ok: { effects: { chemistry: 3, form: 1 }, text: 'Dos mates buenos y uno fallado. Aplausos y buen ambiente en el vestuario.' },
        fail: { effects: { form: -3, pressure: 4, chemistry: -2, fatigue: 4 }, text: 'Ni uno. El concurso se convierte en un chiste y las piernas te pesan.' },
      } },
    options: [] },
  { id: 'mg-boards', category: 'coach', title: 'Guerra en el rebote', weight: 7, cooldown: 220,
    text: '{coach} insiste en el vídeo: os están matando en el rebote. Te reta a cerrar el aro en cinco posesiones seguidas sin ceder una segunda oportunidad.',
    when: { phases: ['regular', 'postseason'], nba: true, roles: ['star', 'starter', 'rotation'], minOvr: 60 },
    minigame: { kind: 'boards', mechanic: 'reaction', positions: ['PF'], attempts: 5, attrs: ['dreb', 'oreb', 'strength'],
      pressure: 0.4, great: 4, ok: 2, autoScale: true, slots: 4, windowMs: 1500,
      outcomes: {
        great: { effects: { trust: 5, attrs: { dreb: 1 }, chemistry: 3, morale: 3 }, text: 'Ganas todos los rebotes del ejercicio. {coach} da la sesión por ganada.' },
        ok: { effects: { trust: 2, chemistry: 1 }, text: 'Cumples a medias. El cuerpo técnico apunta el detalle.' },
        fail: { effects: { trust: -4, fatigue: 5, chemistry: -2 }, text: 'Te ganan la posición una y otra vez. {coach} alarga el entrenamiento.' },
      } },
    options: [] },
  { id: 'mg-steal', category: 'clutch', title: 'Lectura de robo', weight: 7, cooldown: 220,
    text: 'El análisis previo señala la línea de pase que {opp} repite en los momentos calientes. Toca leerla antes de que la lance.',
    when: { phases: ['regular', 'postseason'], nba: true, roles: ['star', 'starter', 'rotation'], minOvr: 60 },
    minigame: { kind: 'steal', mechanic: 'reaction', positions: ['PG', 'SG'], attempts: 4, attrs: ['steal', 'perD', 'defIQ'],
      pressure: 0.6, great: 3, ok: 2, autoScale: true, slots: 3, windowMs: 1300,
      outcomes: {
        great: { effects: { attrs: { perD: 1 }, trust: 5, reputation: 3, form: 2 }, text: 'Robas tres balones en el momento justo. La grada rival se queda muda.' },
        ok: { effects: { trust: 2, attrs: { defIQ: 1 } }, text: 'Aciertas la mitad. {coach} valora tu lectura del partido.' },
        fail: { effects: { trust: -3, pressure: 4, morale: -2 }, text: 'Vas tarde a todas. Te castigan con canastas fáciles.' },
      } },
    options: [] },
  { id: 'mg-pass', category: 'teammates', title: 'El pase imposible', weight: 6, cooldown: 200,
    text: 'En el entrenamiento, {coach} coloca tres defensas y un solo compañero libre. Hay que encontrar el pase antes de que se cierre la línea.',
    when: { phases: ['regular', 'postseason'], nba: true, roles: ['star', 'starter', 'rotation'] },
    minigame: { kind: 'pass', mechanic: 'reaction', positions: ['PG'], attempts: 3, attrs: ['pass', 'vision'],
      pressure: 0.5, great: 3, ok: 2, tiers: ['easy', 'normal', 'hard'], defaultTier: 'normal', slots: 3, windowMs: 1500,
      outcomes: {
        great: { effects: { attrs: { pass: 1 }, trust: 5, chemistry: 5, fame: 2 }, text: 'Tres asistencias imposibles. El vestuario habla de tu visión de juego.' },
        ok: { effects: { chemistry: 3, trust: 2 }, text: 'Dos pases buenos y uno forzado. El grupo lo agradece igual.' },
        fail: { effects: { chemistry: -4, trust: -3, pressure: 3 }, text: 'Tres pérdidas seguidas. {coach} para el ejercicio y te señala.' },
      } },
    options: [] },
  { id: 'mg-close', category: 'clutch', title: 'Finalización en el uno contra uno', weight: 7, cooldown: 220,
    text: 'Última posesión del entrenamiento: {coach} te pone un defensor encima y pide que la metas como sea. Tres intentos, sin ayudas.',
    when: { phases: ['regular', 'postseason'], nba: true, roles: ['star', 'starter', 'rotation'] },
    minigame: { kind: 'close', mechanic: 'meter', positions: ['C'], attempts: 3, attrs: ['layup', 'close', 'vert'],
      pressure: 0.65, great: 3, ok: 2, autoScale: true,
      outcomes: {
        great: { effects: { attrs: { layup: 1 }, form: 3, fame: 3, trust: 2 }, text: 'Las tres finalizaciones entran con contacto. {coach} asiente sin decir nada.' },
        ok: { effects: { form: 1 }, text: 'Dos de tres. Suficiente para cerrar la sesión con buen sabor.' },
        fail: { effects: { form: -3, pressure: 4, fatigue: 4 }, text: 'Te barren dos veces y la tercera la fuerzas. El entrenador no está contento.' },
      } },
    options: [] },
  // ---------------- Pre-draft ----------------
  { id: 'predraft-agent', category: 'draft', title: 'Elegir agente', weight: 0, priority: 20,
    text: 'Con el draft en el horizonte, tres agencias quieren representarte.',
    when: { phases: ['predraft'], chainOnly: true },
    options: [
      { label: 'Agencia top', desc: 'Contratos más altos. Se queda el 6 % de tu sueldo.', effects: { agent: 'top', reputation: 3 }, text: 'Firmas con una agencia de primer nivel.' },
      { label: 'Agencia familiar', desc: 'Atención personal. Comisión del 4 %.', effects: { agent: 'family', morale: 4, loyalty: 4 }, text: 'Te sientes arropado.' },
      { label: 'Representarte tú mismo', desc: 'Sin comisiones, pero ofertas más bajas.', effects: { agent: 'self', reputation: -2 }, text: 'Valiente, pero arriesgado.' },
    ] },
  // ---------------- Assets and loans (full mode only) ----------------
  { id: 'asset-mansion', category: 'money', title: 'La casa de tus sueños', weight: 5, cooldown: 700,
    text: 'Tu agente te enseña un catálogo de propiedades: desde una mansión con vistas hasta un ático en el centro.',
    when: { modes: ['full'], financeOnly: true, phases: ['offseason', 'preseason'], minAge: 21, notFlags: ['asset:mansion'] },
    options: [
      { label: 'Comprar la mansión ($4.5M)', desc: 'Cancha privada, gimnasio y vistas. Mantenimiento alto.', effects: { buyAsset: 'mansion', morale: 5, fame: 6 }, text: 'La firma de la hipoteca pesa, pero la casa es espectacular.' },
      { label: 'Comprar un ático ($900K)', desc: 'Menos lujo, menos gastos.', effects: { buyAsset: 'apartment', morale: 3, fame: 2 }, text: 'Un ático elegante en el centro. El recibo es asumible.' },
      { label: 'Seguir de alquiler', desc: 'Tu dinero, invertido.', effects: { morale: 1 }, text: 'Prefieres no atarte a una hipoteca.' },
    ] },
  { id: 'asset-supercar', category: 'money', title: 'El coche del vestuario', weight: 5, cooldown: 600,
    text: 'Un concesionario de la ciudad te ofrece condiciones de jugador estrella para un superdeportivo.',
    when: { modes: ['full'], financeOnly: true, phases: ['offseason', 'preseason'], minAge: 20, notFlags: ['asset:supercar'] },
    options: [
      { label: 'Comprar el deportivo ($650K)', desc: 'Un superdeportivo para tu aparcamiento.', effects: { buyAsset: 'supercar', morale: 2, fame: 4 }, text: 'El aparcamiento del pabellón ya tiene dueño.' },
      { label: 'Alquilarlo un mes ($60K)', desc: 'El gusto temporal, sin compromiso.', effects: { money: -60_000, fame: 2, morale: 1 }, text: 'Disfrutas del coche sin quedártelo.' },
      { label: 'Pasar', desc: 'No necesitas más ruido.', effects: {}, text: 'No necesitas llamar la atención.' },
    ] },
  { id: 'asset-jet', category: 'money', title: 'Volar sin escalas', weight: 4, cooldown: 900,
    text: 'Una operadora de aviación privada te propone hacerte socio de su flota de jets.',
    when: { modes: ['full'], financeOnly: true, phases: ['offseason', 'preseason'], minAge: 24, notFlags: ['asset:jet'] },
    options: [
      { label: 'Comprar el jet ($9M)', desc: 'Privacidad total y horarios propios.', effects: { buyAsset: 'jet', morale: 3, fame: 8 }, text: 'Tu nombre en el fuselaje. La factura del hangar también.' },
      { label: 'Alquilar un jet por temporada ($250K)', desc: 'Comodidad sin comprar el avión.', effects: { money: -250_000, fame: 3, morale: 2 }, text: 'Viajas como una estrella sin comprar el avión.' },
      { label: 'Seguir en primera clase', desc: 'Viajar bien, sin excesos.', effects: { money: -20_000, morale: 1 }, text: 'Menos glamour, más sensatez.' },
    ] },
  { id: 'asset-entourage', category: 'money', title: 'Tu gente', weight: 5, cooldown: 600,
    text: 'Varios profesionales se ofrecen a formar tu equipo personal: preparador, fisio, cocinero y escolta.',
    when: { modes: ['full'], financeOnly: true, phases: ['offseason', 'preseason'], minAge: 22, notFlags: ['asset:entourage'] },
    options: [
      { label: 'Contratar equipo personal ($350K)', desc: 'Un séquito completo a tu alrededor.', effects: { buyAsset: 'entourage', morale: 4, fame: 3 }, text: 'Preparador, fisio, cocinero y escolta. Todo el mundo cobra.' },
      { label: 'Solo un preparador ($80K)', desc: 'Profesionalidad sin excesos.', effects: { money: -80_000, workEthic: 2, form: 2 }, text: 'Un profesional de confianza, sin séquito.' },
      { label: 'Seguir con lo básico', desc: 'Sin cambios en tu rutina.', effects: {}, text: 'Tu círculo se queda pequeño.' },
    ] },
  { id: 'asset-rentals', category: 'money', title: 'Dinero que trabaja', weight: 4, cooldown: 800,
    text: 'Tu asesor financiero te propone entrar en el mercado inmobiliario con una cartera de alquileres.',
    when: { modes: ['full'], financeOnly: true, phases: ['offseason', 'preseason'], minAge: 23, notFlags: ['asset:rentals'] },
    options: [
      { label: 'Comprar una cartera de alquileres ($1.8M)', desc: 'Inmuebles que generan ingresos.', effects: { buyAsset: 'rentals', reputation: 2 }, text: 'Los inmuebles empiezan a pagar el mantenimiento.' },
      { label: 'Entrar en un fondo inmobiliario ($300K)', desc: 'Inversión pasiva, sin gestionar pisos.', effects: { money: -300_000, workEthic: 1 }, text: 'Una inversión pasiva y aburrida. A veces es lo mejor.' },
      { label: 'No invertir', desc: 'Prefieres la liquidez.', effects: {}, text: 'Prefieres tener el dinero disponible.' },
    ] },
  { id: 'bank-loan', category: 'money', title: 'El banco te busca', weight: 6, cooldown: 500,
    text: 'Tu banco te ofrece un crédito con condiciones de estrella: el gerente de la sucursal te invita a café.',
    when: { modes: ['full'], financeOnly: true, phases: ['offseason', 'preseason', 'regular'], minAge: 22, maxAge: 36, minFame: 20 },
    options: [
      { label: 'Pedir $2M', desc: 'Deuda al 8% anual; el banco confía en tu contrato.', effects: { borrow: 2_000_000 }, text: 'El dinero entra en tu cuenta. La deuda también.' },
      { label: 'Pedir $500K', desc: 'Un crédito pequeño para caprichos o imprevistos.', effects: { borrow: 500_000 }, text: 'Un préstamo pequeño para un capricho o un imprevisto.' },
      { label: 'No endeudarte', desc: 'Cero deudas, cero preocupaciones.', effects: {}, text: 'Prefieres no deber nada.' },
    ] },
];
