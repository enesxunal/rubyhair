/** Fast loading shell while the protected report reads its bounded daily totals. */
export default function Loading(){
 return <main className="rh-ops-loading" role="status" aria-live="polite">
  <span>RUBY HAIR / ANALYTICS</span>
  <h1>Statistik wird geladen …</h1>
  <p>Der Bericht wird für den gewählten Zeitraum vorbereitet.</p>
  <div className="rh-ops-loading-grid" aria-hidden="true">
   {Array.from({length:4},(_,i)=><div key={i}/>)}
  </div>
 </main>;
}
