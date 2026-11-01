import fs from "node:fs";
import path from "node:path";
import Script from "next/script";

// Visual preservation bridge: existing approved homepage markup is rendered
// within the Next.js App Router. Its shopping subpages are native React.
export default function HomePage(){
  const source=fs.readFileSync(path.join(process.cwd(),"src/data/home.html"),"utf8");
  const from=source.indexOf("<body>")+6;
  const to=source.lastIndexOf("<script src=");
  if(from<6||to<=from)throw new Error("Legacy homepage bridge source missing");
  const markup=source.slice(from,to).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,"");
  return <><div dangerouslySetInnerHTML={{__html:markup}}/>
    <Script src="/legacy-app.js" strategy="afterInteractive"/>
  </>;
}
