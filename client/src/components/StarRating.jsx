export default function StarRating({ value = 0, onChange, readOnly = false, size = 22 }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="stars" style={{ fontSize: size }}>
      {stars.map((n) => (
        <span
          key={n}
          className={n <= Math.round(value) ? 'star on' : 'star'}
          role={readOnly ? undefined : 'button'}
          onClick={() => !readOnly && onChange && onChange(n)}
        >
          ★
        </span>
      ))}
    </div>
  );
}
