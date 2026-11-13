import Link from "next/link";
import {
 ArrowUpRight,Boxes,LayoutDashboard,ClipboardList,BarChart3,
 WalletCards,ExternalLink,ShieldCheck,LogOut,ChevronRight,Store,
 CircleDot,Settings2
} from "lucide-react";
import {logoutAction} from "./actions";

const sections=[
 {href:"/admin",label:"Übersicht",icon:LayoutDashboard},
 {href:"/admin/analytics",label:"Analytics",icon:BarChart3},
 {href:"/admin/produkte",label:"Produkte & Bestand",icon:Boxes},
 {href:"/admin/bestellungen",label:"Bestellungen",icon:ClipboardList},
 {href:"/admin/zahlungen",label:"Zahlungen",icon:WalletCards}
] as const;

type Area="dashboard"|"products"|"orders"|"analytics"|"payments";
const name:Record<Area,string>={
 dashboard:"Übersicht",analytics:"Analytics",products:"Produkte & Bestand",
 orders:"Bestellungen",payments:"Zahlungen"
};
const paths:Record<Area,string>={
 dashboard:"/admin",analytics:"/admin/analytics",products:"/admin/produkte",
 orders:"/admin/bestellungen",payments:"/admin/zahlungen"
};
export default function AdminShell({
 current,title,description,children
}:{current:Area;title:string;description:string;children:React.ReactNode}){
 const active=paths[current];
 return <main className="rh-admin-app">
  <aside className="rh-admin-sidebar">
   <Link href="/admin" className="rh-admin-brand" aria-label="Ruby Hair Verwaltung Startseite">
    <span className="rh-admin-brand-symbol">R.</span>
    <span><strong>RUBY HAIR</strong><small>MANAGEMENT STUDIO</small></span>
   </Link>
   <div className="rh-admin-sidebar-main">
    <p className="rh-admin-menu-title">WORKSPACE</p>
    <nav aria-label="Admin Navigation" className="rh-admin-nav">
     {sections.map(section=><Link href={section.href} key={section.href}
      aria-current={active===section.href?"page":undefined}
      className={active===section.href?"is-current":undefined}>
      <section.icon size={17} strokeWidth={1.75}/><span>{section.label}</span>
      {active===section.href&&<ChevronRight className="rh-admin-nav-chevron" size={14}/>}
     </Link>)}
    </nav>
   </div>
   <div className="rh-admin-sidebar-bottom">
    <div className="rh-admin-system-note">
     <ShieldCheck size={18}/><span><strong>Geschützter Bereich</strong><small>Demomodus · Keine Live-Zahlungen</small></span>
    </div>
    <Link href="/" target="_blank" rel="noopener noreferrer" className="rh-admin-visit">
     <ExternalLink size={16}/> Shop ansehen <ArrowUpRight size={13}/>
    </Link>
    <form action={logoutAction}><button className="rh-admin-logout" type="submit"><LogOut size={16}/> Abmelden</button></form>
   </div>
  </aside>
  <section className="rh-admin-workspace">
   <div className="rh-admin-topline">
    <div className="rh-admin-breadcrumb"><Link href="/admin"><Store size={15}/> Ruby Hair Studio</Link>
      <ChevronRight size={14}/><span>{name[current]}</span></div>
    <div className="rh-admin-topline-actions">
     <span className="rh-admin-topline-status"><CircleDot size={12}/><span className="rh-admin-status-full">DEMO / LIVE-VERKAUF AUS</span><span className="rh-admin-status-short">DEMO · CHECKOUT AUS</span></span>
     <Link href="/" target="_blank" rel="noopener noreferrer" className="rh-admin-top-shop" aria-label="Shop-Vorschau öffnen">
      <ExternalLink size={15}/> Shop-Vorschau
     </Link>
    </div>
   </div>
   <header className="rh-admin-page-heading">
    <div><span className="rh-admin-overline"><Settings2 size={13}/> RUBY HAIR / {name[current].toUpperCase()}</span>
     <h1>{title}</h1><p>{description}</p></div>
   </header>
   {children}
   <footer className="rh-admin-bottom-note">
    <span>Ruby Hair Management Studio · Interne Vorschau</span>
    <span>Keine freigeschalteten Kundenzahlungen · Datenschutz respektieren</span>
   </footer>
  </section>
 </main>;
}
