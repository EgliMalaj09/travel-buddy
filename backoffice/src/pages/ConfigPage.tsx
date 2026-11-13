import { useEffect, useState } from 'react';

import { api, errorText } from '@/api/client';
import type { components } from '@/api/schema';
import { useAuth } from '@/auth/AuthProvider';
import { Banner, Button, Field, PageHeader, Segmented, Skeleton, Switch } from '@/components';
import { formatDateTime } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';

type Config = components['schemas']['AppConfigDto'];
type Quality = 'compressed' | 'full';

const FLAG = /^[a-z][a-zA-Z0-9]{1,39}$/;

/**
 * App settings for every phone (AppConfig). Owners change them; everyone else reads them.
 * Saving sends the version it started from, so two people never overwrite each other.
 */
export function ConfigPage() {
  const { can } = useAuth();
  const canEdit = can('owner');
  const { data, error, loading, reload } = useLoad(() => api.GET('/admin/config'), []);
  const [draft, setDraft] = useState<Config | null>(null);
  const [newFlag, setNewFlag] = useState('');
  const [note, setNote] = useState<{ tone?: 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  if (loading && !draft) return <Skeleton height={320} />;
  if (!draft) return <Banner tone="err" title="The settings did not load">{error}</Banner>;

  const set = (patch: Partial<Config>) => setDraft({ ...draft, ...patch });
  const changed = JSON.stringify(draft) !== JSON.stringify(data);
  const flagError = newFlag && !FLAG.test(newFlag) ? 'camelCase letters and digits, for example printAlbumEnabled' : null;

  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      const { data: saved, error: err } = await api.PUT('/admin/config', {
        body: {
          minAppVersion: draft.minAppVersion.trim(),
          maxPhotoSizeMb: Number(draft.maxPhotoSizeMb),
          freeTripLimit: Number(draft.freeTripLimit),
          photoQualityByPlan: draft.photoQualityByPlan,
          featureFlags: draft.featureFlags,
          version: draft.version,
        },
      });
      if (saved) {
        setNote({ text: 'Saved. Phones pick it up the next time the app opens.' });
        reload();
      } else setNote({ tone: 'err', text: errorText(err) });
    } catch {
      setNote({ tone: 'err', text: 'Cannot reach the server. Nothing was saved; try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        kicker="Every phone"
        title="App settings"
        lead={`Version ${draft.version}, changed ${formatDateTime(draft.updatedAt)}.`}
        action={
          canEdit ? (
            <Button disabled={!changed || busy || !!flagError} onClick={save}>
              {busy ? 'Saving…' : 'Save settings'}
            </Button>
          ) : null
        }
      />
      {!canEdit ? <Banner>Only owners can change these settings.</Banner> : null}
      {note ? <Banner tone={note.tone}>{note.text}</Banner> : null}

      <div className="grid2">
        <section className="card pad-l">
          <h2 className="h2">Versions and limits</h2>
          <Field
            label="Minimum app version"
            value={draft.minAppVersion}
            disabled={!canEdit}
            onChange={(e) => set({ minAppVersion: e.target.value })}
            hint="Older apps show “Update the app” and stop syncing. Raise it only after the new build is in the stores."
          />
          <Field
            label="Largest photo (MB)"
            type="number"
            min={1}
            max={50}
            value={String(draft.maxPhotoSizeMb)}
            disabled={!canEdit}
            onChange={(e) => set({ maxPhotoSizeMb: Number(e.target.value) })}
          />
          <Field
            label="Free trips per account"
            type="number"
            min={0}
            max={100}
            value={String(draft.freeTripLimit)}
            disabled={!canEdit}
            onChange={(e) => set({ freeTripLimit: Number(e.target.value) })}
            hint="Used when plans arrive in Part 2."
          />
        </section>
        <section className="card pad-l">
          <h2 className="h2">Photo quality by plan</h2>
          {(['free', 'paid'] as const).map((plan) => (
            <div className="row" key={plan}>
              <div className="gr">
                <b style={{ textTransform: 'capitalize' }}>{plan}</b>
              </div>
              {canEdit ? (
                <Segmented<Quality>
                  label={`${plan} plan photo quality`}
                  value={(draft.photoQualityByPlan[plan] as Quality) ?? 'compressed'}
                  onChange={(v) => set({ photoQualityByPlan: { ...draft.photoQualityByPlan, [plan]: v } })}
                  options={[
                    { value: 'compressed', label: 'Compressed' },
                    { value: 'full', label: 'Full' },
                  ]}
                />
              ) : (
                <span className="tr">{draft.photoQualityByPlan[plan]}</span>
              )}
            </div>
          ))}
        </section>
      </div>

      <section className="card pad-l" aria-labelledby="flags">
        <h2 id="flags" className="h2">Feature switches</h2>
        <p className="cap">Turn a feature on or off for every phone without a new build.</p>
        <div className="rows">
          {Object.keys(draft.featureFlags).length === 0 ? <p className="muted">No switches yet.</p> : null}
          {Object.entries(draft.featureFlags).map(([name, on]) => (
            <div className="row" key={name}>
              <div className="gr">
                <b className="mono" style={{ textTransform: 'none', fontSize: 14, color: 'var(--ink)' }}>
                  {name}
                </b>
                <small>{on ? 'On' : 'Off'}</small>
              </div>
              <Switch
                label={name}
                checked={on}
                disabled={!canEdit}
                onChange={(v) => set({ featureFlags: { ...draft.featureFlags, [name]: v } })}
              />
              {canEdit ? (
                <Button
                  variant="ghost"
                  small
                  aria-label={`Remove ${name}`}
                  onClick={() => {
                    const rest = { ...draft.featureFlags };
                    delete rest[name];
                    set({ featureFlags: rest });
                  }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {canEdit ? (
          <form
            className="cluster"
            style={{ alignItems: 'flex-end' }}
            onSubmit={(e) => {
              e.preventDefault();
              if (!newFlag || flagError) return;
              set({ featureFlags: { ...draft.featureFlags, [newFlag]: false } });
              setNewFlag('');
            }}
          >
            <div style={{ flex: '1 1 240px' }}>
              <Field label="New switch" value={newFlag} onChange={(e) => setNewFlag(e.target.value)} error={flagError} placeholder="printAlbumEnabled" />
            </div>
            <Button type="submit" variant="alt" small disabled={!newFlag || !!flagError}>
              Add switch
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
