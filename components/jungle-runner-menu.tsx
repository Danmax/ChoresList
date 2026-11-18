import { ArrowRight, Bug, Castle, Check, Compass, Heart, Leaf, Moon, PawPrint, Play, Sparkles, Sun, Sunset, Timer, Waves, Bone } from 'lucide-react';
import type { CSSProperties } from 'react';
import { GEMS, LEVELS, RUNNER_DIFFICULTIES, type RunnerDifficulty } from '@/lib/jungle-runner';
import styles from './jungle-runner-menu.module.css';

const WORLDS = [
  { icon: Leaf, color: '#88dfaa', description: 'Find your rhythm among the vines. Gather bananas and spring into your first adventure.' },
  { icon: Waves, color: '#79d8ef', description: 'Swing over the river, bounce off friendly hippos, and watch the water below.' },
  { icon: Sunset, color: '#ffb18a', description: 'Chase the sunset through the treetops. Time your flips and keep the adventure moving.' },
  { icon: PawPrint, color: '#ffcd7c', description: 'A roar in the undergrowth. Read the warning, dodge the pounce, and land your counter.' },
  { icon: Moon, color: '#c4b4ff', description: 'Follow the moonlight past swinging webs and diving bats. Stay quick on your feet.' },
  { icon: Bug, color: '#b6e780', description: 'Tiny creatures. Giant trouble. Bounce, dodge, and battle your way through the grove.' },
  { icon: Bone, color: '#f7ab83', description: 'Enter a prehistoric world of charging dinosaurs and volcanic surprises. Face the mighty T. rex.' },
  { icon: Sun, color: '#f7d780', description: 'Ride the stampede, leap the cliffs, and face the lion on your way to the victory oasis.' },
  { icon: Castle, color: '#c5a8ff', description: 'Return vampire spells, collect moon shields, and break the Headless Horseman’s curse.' },
];

export function JungleRunnerMenu({ mode, selectedLevel, difficulty, onMode, onLevel, onDifficulty, onStart }: {
  mode: 'adventure' | 'stage'; selectedLevel: number; difficulty: RunnerDifficulty;
  onMode: (mode: 'adventure' | 'stage') => void; onLevel: (level: number) => void;
  onDifficulty: (difficulty: RunnerDifficulty) => void; onStart: () => void;
}) {
  const adventure = mode === 'adventure';
  const world = WORLDS[selectedLevel];
  const settings = RUNNER_DIFFICULTIES[difficulty];
  const art = !adventure && selectedLevel === 8 ? '/games/monsters/sky.webp'
    : !adventure && selectedLevel === 7 ? '/games/jungle-savanna-oasis-v1.png' : '/games/johnny-hero-journey.png';
  return <div className={styles.menu}>
    <div className={styles.intro}><span className={styles.eyebrow}><Compass size={14} /> THE ADVENTURE STARTS HERE</span><h1>Choose your adventure<span>.</span></h1></div>
    <div className={styles.modes} aria-label="Run mode">
      <button type="button" aria-pressed={adventure} onClick={() => onMode('adventure')}><Compass size={20} /><span>Adventure Mode<small>All {LEVELS.length} stages</small></span><span className={styles.modeDot} aria-hidden="true" /></button>
      <button type="button" aria-pressed={!adventure} onClick={() => onMode('stage')}><Castle size={20} /><span>Select a Stage<small>Play one level</small></span><span className={styles.modeDot} aria-hidden="true" /></button>
    </div>
    <div className={styles.layout}>
      <div className={styles.options}>
        {!adventure ? <div className={styles.worlds} aria-label="Stages">{LEVELS.map((level, index) => {
          const Icon = WORLDS[index].icon;
          return <button key={level.name} type="button" aria-label={`${index + 1}. ${level.name}`} aria-pressed={selectedLevel === index} onClick={() => onLevel(index)} style={{ '--world-color': WORLDS[index].color } as CSSProperties}>
            <span className={styles.cardTop} aria-hidden="true"><Icon size={21} /><span>{String(index + 1).padStart(2, '0')}</span>{selectedLevel === index && <Check size={14} className={styles.selectedCheck} />}</span>
            <strong>{level.name}</strong><small>{index >= 6 ? 'Boss encounter' : 'Explore & collect'}</small>
          </button>;
        })}</div> : <div className={styles.journey}><span className={styles.eyebrow}>THE FULL JOURNEY</span><h2>Nine worlds.<br />One fearless monkey.</h2><p>From your first banana to the castle’s final curse. Run, swing, and fight your way through every world.</p><div className={styles.journeyIcons} aria-hidden="true">{WORLDS.map(({ icon: Icon, color }, i) => <span key={i} style={{ color }}><Icon size={20} /></span>)}</div><span className={styles.journeyNote}><Sparkles size={15} /> Collect every gem to claim the Jungle Crown.</span></div>}
        <fieldset className={styles.difficulty}><legend>Make it your adventure</legend><div>{(Object.keys(RUNNER_DIFFICULTIES) as RunnerDifficulty[]).map(value => <label key={value} data-selected={difficulty === value}>
          <input type="radio" name="runner-difficulty" value={value} checked={difficulty === value} onChange={() => onDifficulty(value)} /><span>{RUNNER_DIFFICULTIES[value].label}</span><small>{RUNNER_DIFFICULTIES[value].lives} lives</small>
        </label>)}</div><p>{settings.description}</p></fieldset>
      </div>
      <div className={styles.preview} style={{ '--preview-art': `url("${art}")` } as CSSProperties}>
        <div className={styles.previewArt} /><div className={styles.previewCopy}>
          <span className={styles.previewTag}>{adventure ? 'THE COMPLETE ADVENTURE' : `WORLD ${String(selectedLevel + 1).padStart(2, '0')} / ${String(LEVELS.length).padStart(2, '0')}`}</span>
          <h2>{adventure ? 'Into the wild.' : LEVELS[selectedLevel].name}</h2>
          <p>{adventure ? 'A jungle full of surprises. A hero ready for anything. Your story starts with a single leap.' : world.description}</p>
          <div className={styles.previewFacts}><span><Heart size={14} /> {settings.lives} lives</span><span><Timer size={14} /> {adventure ? `${LEVELS.length} stages` : `${settings.seconds}s${selectedLevel >= 6 ? ' + finale' : ' run'}`}</span>{!adventure && <span><Sparkles size={14} /> {GEMS[selectedLevel].name}</span>}</div>
        </div>
      </div>
    </div>
    <div className={styles.launch}><span><strong>{adventure ? 'Ready for the whole journey?' : LEVELS[selectedLevel].name}</strong><small>{settings.label} difficulty · {adventure ? 'Play all nine worlds' : 'A complete single-stage adventure'}</small></span><button type="button" onClick={onStart}><Play size={17} fill="currentColor" /><span>{adventure ? 'Start adventure' : `Play ${LEVELS[selectedLevel].name}`}</span><ArrowRight size={19} /></button></div>
    <p className={styles.hint}>Jump. Flip. Fight. <span>Your adventure, your pace.</span></p>
  </div>;
}
