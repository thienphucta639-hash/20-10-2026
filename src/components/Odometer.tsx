import { fmt } from "../lib/data";

function Digit({ d, delay }: { d: number; delay: number }) {
  return (
    <span className="odo-digit" aria-hidden>
      <span
        className="odo-strip"
        style={{
          transform: `translateY(-${d}em)`,
          transitionDelay: `${delay}ms`,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </span>
    </span>
  );
}

export default function Odometer({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const text = fmt(value);
  return (
    <span className={`odo ${className}`} role="text" aria-label={text}>
      {text.split("").map((ch, i) =>
        /\d/.test(ch) ? (
          <Digit key={i} d={Number(ch)} delay={i * 65} />
        ) : (
          <span key={i} className="odo-sep" aria-hidden>
            {ch}
          </span>
        )
      )}
    </span>
  );
}
