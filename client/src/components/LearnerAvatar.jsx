const SKINS = ["#5A3825", "#6F4630", "#7C5236", "#8A5A3C", "#9C6B45", "#4A2E1F"];
const HAIR = "#1B120D";
const BACKS = ["#E1EAF5", "#FBF0D6", "#DDF3E8", "#F7E1E6", "#E8E3F7", "#DFF1F7"];

function pick(list, seed, shift) {
  return list[(seed * 7 + shift * 13) % list.length];
}

function Hair({ girl, style }) {
  if (!girl) {
    return style % 2 === 0
      ? <path d="M30 40c0-13 9-21 20-21s20 8 20 21c-3-6-10-9-20-9s-17 3-20 9z" fill={HAIR} />
      : <path d="M30 41c-1-14 8-23 20-23s21 9 20 23c-2-3-4-5-6-6-4 2-9 3-14 3s-10-1-14-3c-2 1-4 3-6 6z" fill={HAIR} />;
  }
  if (style % 3 === 0) {
    return (
      <g fill={HAIR}>
        <circle cx="30" cy="24" r="9" />
        <circle cx="70" cy="24" r="9" />
        <path d="M30 42c0-14 9-22 20-22s20 8 20 22c-4-7-11-10-20-10s-16 3-20 10z" />
      </g>
    );
  }
  if (style % 3 === 1) {
    return (
      <g fill={HAIR}>
        <path d="M28 44c-1-16 9-26 22-26s23 10 22 26c-4-8-12-12-22-12s-18 4-22 12z" />
        <circle cx="50" cy="15" r="8" />
      </g>
    );
  }
  return (
    <g fill={HAIR}>
      <path d="M29 44c-1-15 8-24 21-24s22 9 21 24c-4-7-12-11-21-11s-17 4-21 11z" />
      <path d="M30 42v20M34 44v18M66 44v18M70 42v20" stroke={HAIR} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

export default function LearnerAvatar({ student, size = 64, className = "" }) {
  const seed = Number(student?.id) || 1;
  const girl = student?.gender === "Female";
  const skin = pick(SKINS, seed, 1);
  const back = pick(BACKS, seed, 2);
  const style = (seed * 5) % 6;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={`shrink-0 rounded-full ${className}`} role="img" aria-label={`Picture of ${student?.first_name || "learner"}`}>
      <rect width="100" height="100" fill={back} />
      <path d="M14 100c2-20 17-30 36-30s34 10 36 30z" fill="#1E3A6B" />
      <path d="M38 72l12 16 12-16" fill="#FFFFFF" />
      <path d="M42 72l8 11 8-11" fill="#DDA22E" />
      <rect x="44" y="58" width="12" height="14" rx="5" fill={skin} />
      <ellipse cx="50" cy="44" rx="19" ry="21" fill={skin} />
      <circle cx="31" cy="46" r="4" fill={skin} />
      <circle cx="69" cy="46" r="4" fill={skin} />
      <Hair girl={girl} style={style} />
      <circle cx="43" cy="46" r="2.3" fill="#1B120D" />
      <circle cx="57" cy="46" r="2.3" fill="#1B120D" />
      <path d="M43 55c4 4 10 4 14 0" stroke="#1B120D" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
