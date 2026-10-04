import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { CountryCombobox } from '@/components/CountryCombobox';
import { CATEGORIES, type Kind } from '@/lib/marketplace';

export const Route = createFileRoute('/submit')({ component: SubmitAssetPage });

const BROKER_EMAIL = 'mcafuilivinhand@gmail.com';
const WHATSAPP_NUMBER = '233557873406';

function SubmitAssetPage() {
  const [kind, setKind] = useState<Kind>('sale');
  const [country, setCountry] = useState('');
  const [emailLink, setEmailLink] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [error, setError] = useState('');

  function prepareRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    const asset = String(form.get('asset') ?? '').trim();
    const category = String(form.get('category') ?? '');
    const price = String(form.get('price') ?? '').trim();
    const details = String(form.get('details') ?? '').trim();
    if (!country) { setError('Please choose the asset location.'); return; }
    const message = [
      'APEXANCHOR — NEW ASSET REQUEST',
      '',
      `Owner name: ${name}`,
      `Owner phone / WhatsApp: ${phone}`,
      `Request: ${kind === 'sale' ? 'Sell' : 'Rent'}`,
      `Asset category: ${category}`,
      `Asset title: ${asset}`,
      `Location: ${country}`,
      `Expected price: ${price || 'Not specified'}`,
      '',
      'Asset details:',
      details,
      '',
      'Please contact me about listing this asset with ApexAnchor.',
    ].join('\n');
    setEmailLink(`mailto:${BROKER_EMAIL}?subject=${encodeURIComponent('ApexAnchor asset request — ' + asset)}&body=${encodeURIComponent(message)}`);
    setWhatsappLink(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
  }

  return <div className="max-w-3xl mx-auto px-5 py-12">
    <p className="eyebrow">ApexAnchor broker channel</p>
    <h1 className="font-editorial text-5xl mt-2">Submit an asset for consideration</h1>
    <p className="text-muted-foreground mt-4 max-w-2xl">Want to sell or rent a property, vehicle, land, business or other asset? Send the details directly to our broker. We review every request before anything is published.</p>
    <div className="card-warm p-6 mt-8">
      <form onSubmit={prepareRequest} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="field-label">Your full name</label><input name="name" required maxLength={100} className="input-field mt-1" placeholder="Your name"/></div>
          <div><label className="field-label">Your phone / WhatsApp</label><input name="phone" required maxLength={40} className="input-field mt-1" placeholder="+233…"/></div>
        </div>
        <div><label className="field-label">Are you looking to sell or rent?</label><div className="segmented mt-2"><button type="button" onClick={()=>{setKind('sale');setEmailLink('');setWhatsappLink('')}} className={kind==='sale'?'active':''}>Sell</button><button type="button" onClick={()=>{setKind('rent');setEmailLink('');setWhatsappLink('')}} className={kind==='rent'?'active':''}>Rent</button></div></div>
        <div><label className="field-label">Asset category</label><select name="category" required className="input-field mt-1">{CATEGORIES.map(c=><option key={c.id} value={c.label}>{c.label}</option>)}</select></div>
        <div><label className="field-label">Asset title / short description</label><input name="asset" required minLength={4} maxLength={120} className="input-field mt-1" placeholder="e.g. 3-bedroom house in East Legon"/></div>
        <div><label className="field-label">Location</label><CountryCombobox value={country} onChange={value=>{setCountry(value);setEmailLink('');setWhatsappLink('')}}/></div>
        <div><label className="field-label">Expected price (optional)</label><input name="price" maxLength={80} className="input-field mt-1" placeholder="e.g. GHS 850,000 or GHS 4,000/month"/></div>
        <div><label className="field-label">Tell us more about the asset</label><textarea name="details" required minLength={10} maxLength={4000} className="input-field mt-1 min-h-32" placeholder="Condition, size, features, documents available and anything the broker should know."/></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button className="btn-primary w-full">Prepare my request</button>
      </form>
    </div>
    {(emailLink || whatsappLink) && <div className="card-warm p-6 mt-5 space-y-3">
      <h2 className="font-editorial text-2xl">Choose how to contact ApexAnchor</h2>
      <p className="text-sm text-muted-foreground">Your request is ready. Choose one option to send it to the broker.</p>
      <a href={emailLink} className="btn-primary w-full text-center block">Send by email · {BROKER_EMAIL}</a>
      <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn-outline w-full text-center block">Continue on WhatsApp · +233 55 787 3406</a>
      <p className="text-xs text-muted-foreground">Email opens your email app. WhatsApp opens a chat with your prepared request. Nothing is published until the broker approves it.</p>
    </div>}
    <p className="text-xs text-muted-foreground mt-6">ApexAnchor has one broker. Customers cannot publish listings or access the private Broker Desk.</p>
  </div>;
}
