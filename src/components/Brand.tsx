export default function Brand({ tagline }: { tagline?: string }) {
  return (
    <div className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon.svg" alt="Ball Hawk Buddy" />
      <h1>Ball Hawk Buddy</h1>
      {tagline ? <p>{tagline}</p> : null}
    </div>
  );
}
