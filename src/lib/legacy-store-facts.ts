/** Public facts from old rubyhair.de checked 2026-11-02. Not yet approved as new-shop terms. */
export const legacyStore = {
  checkedOn:"02.11.2026",
  business:"Ruby Hair", owner:"Nazmi Bulganlar",
  street:"Klara Straße 19", postalCity:"45130 Essen",
  email:"info@rubyhair.de", vatId:"DE356097157",
  shipping:{country:"Deutschland", provider:"DHL", standardEuro:4.99, maxBusinessDays:5},
  cancellationDays:14,
  paymentAgb:["Banküberweisung / Vorkasse","PayPal","VISA","Mastercard"],
  paymentHomepage:["PayPal","Kreditkarte","Klarna","SEPA"],
  urls:{
    home:"https://rubyhair.de/",
    imprint:"https://rubyhair.de/impressum/",
    terms:"https://rubyhair.de/agb/",
    cancellation:"https://rubyhair.de/widerrufsbelehrung/",
    privacy:"https://rubyhair.de/datenschutzerklaerung/",
    bonding:"https://rubyhair.de/produkt/keratin-bondings/",
    tape:"https://rubyhair.de/produkt/tape-in-extensions/",
    guide:"https://rubyhair.de/hairguide/"
  }
} as const;
