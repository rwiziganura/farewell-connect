import { SimplePage } from '@/components/app-pages'

export default function PrivacyPage() {
  return (
    <SimplePage eyebrow="Privacy" title="Privacy notice.">
      <div className="mt-8 max-w-3xl rounded-2xl border border-[#e8e4dd] bg-white p-6 leading-8 text-[#697586] sm:p-8">
        <p className="font-semibold text-[#172b4d]">Placeholder — notice not yet provided</p>
        <p className="mt-3">
          Farewell Connect’s approved privacy notice has not been supplied. This page is
          not a privacy policy and does not describe the platform’s data practices.
        </p>
        <p className="mt-3">
          Replace this placeholder with a reviewed notice covering the information
          collected, its uses, service providers, retention, applicable user rights, and
          a verified privacy contact before relying on or publishing it as a policy.
        </p>
      </div>
    </SimplePage>
  )
}
