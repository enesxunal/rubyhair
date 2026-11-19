import type {Metadata} from "next";
import ShopLayout from "@/components/site-shell";
import GiftComposer from "@/components/gift-composer";
export const metadata:Metadata={title:"Geschenkgutschein – Beauty verschenken",description:"Ruby Hair Geschenkgutschein – 50 €, 100 €, 200 € oder Wunschbetrag. Persönliche Grußkarte gestalten, als Bild teilen oder per E-Mail versenden.",alternates:{canonical:"/geschenkgutschein/"}};
export default function Page(){return <ShopLayout><GiftComposer enabled={process.env.RUBY_GIFT_CARDS_LIVE_ENABLED==="true"}/></ShopLayout>}
