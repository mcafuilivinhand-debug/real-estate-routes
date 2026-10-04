import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { CountryCombobox } from '@/components/CountryCombobox';
import { CATEGORIES, categoryLabel, type CategoryId, type Kind } from '@/lib/marketplace';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/submit')({ component: SubmitAssetPage });

const BROKER_EMAIL = 'mcafuilivinhand@gmail.com';
const WHATSAPP_NUMBER = '233557873406';

function SubmitAssetPage() {
  const [kind, setKind] = useState<Kind>('sale');
  const [country, setCountry] = useState('');
  const [emailLink, setEmailLink] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isBroker, setIsBroker] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from('user_roles').select('role')
        .eq('user_id', auth.user.id).eq('role', 'broker').maybeSingle();
      if (active) setIsBroker(!!data);
    })();
    return () => { active = false; };
  }, []);

  async function prepareRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitted(false);
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    const asset = String(form.get('asset') ?? '').trim();
    const category = String(form.get('category') ?? '') as CategoryId;
    const price = String(form.get('price') ?? '').trim();
    const details = String(form.get('details') ?? '').trim();
    const photos = form.getAll('photos').filter((item): item is File => item instanceof File && item.size > 0);
    if (photos.length > 6) { setError('Please choose no more than 6 photos.'); return; }
    const allowedTypes = ['image/jpeg','image/png','image/webp','image/gif'];
    if (photos.some(photo => !allowedTypes.includes(photo.type))) { setError('Use JPG, PNG, WEBP or GIF images only.'); return; }
    if (photos.some(photo => photo.size > 8 * 1024 * 1024)) { setError('Each photo must be 8 MB or smaller.'); return; }
    if (!country) { setError('Please choose the asset location.'); return; }

    setUploading(true);
    const photoLinks: string[] = [];
    try {
      for (const photo of photos) {
        const extension = photo.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = 'requests/' + crypto.randomUUID() + '/' + crypto.randomUUID() + '.' + extension;
        const { error: uploadError } = await supabase.storage.from('asset-request-photos').upload(path, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw uploadError;
        photoLinks.push(supabase.storage.from('asset-request-photos').getPublicUrl(path).data.publicUrl);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload your photos. Please try again.');
      setUploading(false);
      return;
    }

    // Generate the reference in the browser so a public seller can insert without
    // requesting a returned row (asset_requests SELECT is intentionally broker-only).
    const requestId = crypto.randomUUID();
    const { error: requestError } = await supabase.from('asset_requests').insert({
      id: requestId,
      owner_name: name,
      owner_phone: phone,
      kind,
      category,
      title: asset,
      location: country,
      expected_price: price,
      details,
      photo_urls: photoLinks,
    });

    if (requestError) {
      setError(requestError.message ?? 'Your request could not be saved. Please try again.');
      setUploading(false);
      return;
    }

    const message = [
      'APEXANCHOR — NEW ASSET REQUEST',
      `Request reference: ${requestId}`,
      '',
      `Owner name: ${name}`,
      `Owner phone / WhatsApp: ${phone}`,
      `Request: ${kind === 'sale' ? 'Sell' : 'Rent'}`,
      `Asset category: ${categoryLabel(category)}`,
      `Asset title: ${asset}`,
      `Location: ${country}`,
      `Expected price: ${price || 'Not specified'}`,
      '',
      'Asset details:',
      details,
      '',
      ...(photoLinks.length ? ['', 'Asset photos:', ...photoLinks] : []),
      '',
      'Please contact me about listing this asset with ApexAnchor.',
    ].join('\n');
    setEmailLink(`mailto:${BROKER_EMAIL}?subject=${encodeURIComponent('ApexAnchor asset request — ' + asset)}&body=${encodeURIComponent(message)}`);
    setWhatsappLink(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
    setSubmitted(true);
    setUploading(false);
  }

  return <div className="max-w-3xl mx-auto px-5 py-12">
    <p className="eyebrow">ApexAnchor broker channel</p>
    <h1 className="font-editorial text-5xl mt-2">Submit an asset for consideration</h1>
    <p className="text-muted-foreground mt-4 max-w-2xl">Want to sell or rent a property, vehicle, land, business or other asset? Submit the details for the ApexAnchor broker to review. Nothing is published automatically.</p>
    <div className="card-warm p-6 mt-8">
      <form onSubmit={prepareRequest} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="field-label">Your full name</label><input name="name" required maxLength={100} className="input-field mt-1" placeholder="Your name"/></div>
          <div><label className="field-label">Your phone / WhatsApp</label><input name="phone" required maxLength={40} className="input-field mt-1" placeholder="+233…"/></div>
        </div>
        <div><label className="field-label">Are you looking to sell or rent?</label><div className="segmented mt-2"><button type="button" onClick={()=>{setKind('sale');setEmailLink('');setWhatsappLink('');setSubmitted(false)}} className={kind==='sale'?'active':''}>Sell</button><button type="button" onClick={()=>{setKind('rent');setEmailLink('');setWhatsappLink('');setSubmitted(false)}} className={kind==='rent'?'active':''}>Rent</button></div></div>
        <div><label className="field-label">Asset category</label><select name="category" required className="input-field mt-1">{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div><label className="field-label">Asset title / short description</label><input name="asset" required minLength={4} maxLength={120} className="input-field mt-1" placeholder="e.g. 3-bedroom house in East Legon"/></div>
        <div><label className="field-label">Location</label><CountryCombobox value={country} onChange={value=>{setCountry(value);setEmailLink('');setWhatsappLink('');setSubmitted(false)}}/></div>
        <div><label className="field-label">Expected price (optional)</label><input name="price" maxLength={80} className="input-field mt-1" placeholder="e.g. GHS 850,000 or GHS 4,000/month"/></div>
        <div><label className="field-label">Tell us more about the asset</label><textarea name="details" required minLength={10} maxLength={4000} className="input-field mt-1 min-h-32" placeholder="Condition, size, features, documents available and anything the broker should know."/></div>
        <div><label className="field-label">Photos of your asset (optional)</label><input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="input-field mt-1 file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-2" /><p className="text-xs text-muted-foreground mt-2">Choose up to 6 photos from your phone gallery or computer. JPG, PNG, WEBP or GIF; maximum 8 MB per photo. Photos are attached to your private broker review request.</p></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={uploading} className="btn-primary w-full">{uploading ? 'Submitting your request…' : 'Submit for broker review'}</button>
      </form>
    </div>
    {(emailLink || whatsappLink) && <div className="card-warm p-6 mt-5 space-y-3">
      <p className="eyebrow text-emerald-700">{submitted ? 'Request received' : 'Request ready'}</p>
      <h2 className="font-editorial text-2xl">{submitted ? 'Your asset is awaiting broker review' : 'Choose how to contact ApexAnchor'}</h2>
      <p className="text-sm text-muted-foreground">{submitted ? 'Your request and photos have been saved securely for the ApexAnchor broker. You can also send the reference to the broker by email or WhatsApp.' : 'Your request is ready. Choose one option to send its reference to the broker.'}</p>
      <a href={emailLink} className="btn-primary w-full text-center block">Email the broker · {BROKER_EMAIL}</a>
      <a href={whatsappLink} target="_blank" rel="noreferrer" className="btn-outline w-full text-center block">WhatsApp the broker · +233 55 787 3406</a>
      {isBroker && <Link to="/broker" className="btn-outline w-full text-center block">Open broker review</Link>}
      <p className="text-xs text-muted-foreground">The broker will review the submission. Approval does not publish it; the broker must publish it separately.</p>
    </div>}
    <p className="text-xs text-muted-foreground mt-6">ApexAnchor has one authorised broker. Customers cannot publish listings or access the private Broker Desk.</p>
  </div>;
}
