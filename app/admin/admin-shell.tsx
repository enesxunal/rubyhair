import Link from "next/link";
import {Boxes,LayoutDashboard,ClipboardList,BarChart3,WalletCards,ExternalLink,PackageCheck,ShieldCheck,LogOut} from "lucide-react";
import {logoutAction} from "./actions";

const sections=[
 {href:"/admin",label:"Übersicht",icon:LayoutDashboard},
 {href:"/admin/produkte",label:"Produkte & Bestand",icon:Boxes},
 {href:"/admin/bestellungen",label:"Bestellungen",icon:ClipboardList},
 {href:"/admin/analytics",label:"Statistik",icon:BarChart3},
 {href:"/admin/zahlungen",label:"Zahlungen",icon:WalletCards}
] as const;

export default function AdminShell({
 current,title,description,children
}:{current:"dashboard"|"products"|"orders"|"analytics"|"payments";title:string;description:string;children:React.ReactNode}){
 const active=current==="dashboard"?"/admin":current==="products"?"/admin/produkte":current==="analytics"?"/admin/analytics":current==="payments"?"/admin/zahlungen":"/admin/bestellungen";
 return <main className="rh-admin-app">
  <aside className="rh-admin-sidebar">
   <Link href="/admin" className="rh-admin-brand" aria-label="Ruby Hair Verwaltung Startseite">
    <span className="rh-admin-brand-symbol">R.</span>
    <span><strong>RUBY HAIR</strong><small>SHOP MANAGEMENT</small></span>
   </Link>
   <p className="rh-admin-menu-title">VERWALTUNG</p>
   <nav aria-label="Admin Navigation" className="rh-admin-nav">
    {sections.map(section=><Link href={section.href} key={section.href}
      aria-current={active===section.href?"page":undefined}
      className={active===section.href?"is-current":undefined}>
      <section.icon size={18} strokeWidth={1.7}/><span>{section.label}</span>
    </Link>)}
   </nav>
   <div className="rh-admin-sidebar-bottom">
    <div className="rh-admin-system-note"><ShieldCheck size={17}/><span>Gesicherter Bereich<br/><small>Live-Verkauf deaktiviert</small></span></div>
    <Link href="/" target="_blank" rel="noopener noreferrer" className="rh-admin-visit"><ExternalLink size={16}/> Shop-Vorschau</Link>
    <form action={logoutAction}><button className="rh-admin-logout" type="submit"><LogOut size={16}/> Abmelden</button></form>
   </div>
  </aside>
  <section className="rh-admin-workspace">
   <div className="rh-admin-topline"><div><PackageCheck size={17}/><span>Ruby Hair / Interne Verwaltung</span></div><span className="rh-admin-topline-status">TEST- UND VORSCHAUUMGEBUNG</span></div>
   <header className="rh-admin-page-heading"><div><span className="rh-admin-overline">MANAGEMENT / {current==="dashboard"?"ÜBERSICHT":current==="products"?"SORTIMENT":current==="analytics"?"STATISTIK":current==="payments"?"ZAHLUNGEN":"BESTELLUNGEN"}</span><h1>{title}</h1><p>{description}</p></div></header>
   {children}
   <footer className="rh-admin-bottom-note">Ruby Hair · Interne Vorschau. Zahlungseingänge und Kundenbestellungen sind nicht freigeschaltet.</footer>
  </section>
 </main>;
}
