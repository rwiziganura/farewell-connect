import { SimplePage } from '@/components/app-pages'

export default function TermsPage() {
  return (
    <SimplePage eyebrow="Terms" title="Terms of use.">
      <div className="mt-8 max-w-3xl rounded-2xl border border-[#e8e4dd] bg-white p-6 leading-8 text-[#697586] sm:p-8">
        <p className="font-semibold text-[#172b4d]">Placeholder — terms not yet provided</p>
        <p className="mt-3">
          Approved terms of use and legal company details have not been supplied. This
          page does not establish contractual terms or describe legal rights and
          obligations.
        </p>
        <p className="mt-3">
          Replace this placeholder with reviewed terms covering the platform’s scope,
          account and provider requirements, transactions, cancellations, and dispute
          handling before relying on or publishing it as a legal agreement.
        </p>
      </div>
    </SimplePage>
  )
}
