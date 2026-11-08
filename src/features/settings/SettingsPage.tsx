import { useT } from '../../i18n'
import { BackupSection } from './BackupSection'
import { PrizeDataSection } from './PrizeDataSection'
import { DangerSection } from './DangerSection'

export default function SettingsPage() {
  const t = useT()
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('set.title')}</h1>
      <BackupSection />
      <PrizeDataSection />
      <DangerSection />
      <section className="card text-sm text-slate-600">
        <h2 className="mb-1 font-semibold text-slate-800">{t('about.title')}</h2>
        <p>{t('about.body')}</p>
      </section>
    </div>
  )
}
