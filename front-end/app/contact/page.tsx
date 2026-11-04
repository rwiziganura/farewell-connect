import { SimplePage } from '@/components/app-pages'

export default function ContactPage() {
  return (
    <SimplePage eyebrow="Contact" title="We’re here to help.">
      <div className="mt-8 max-w-2xl space-y-6 leading-8 text-[#697586]">
        <p>
          Verified support contact details have not yet been provided. Please replace the
          placeholders below with approved contact information before publishing this page.
        </p>
        <div className="rounded-2xl border border-[#e8e4dd] bg-white p-6">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-semibold text-[#172b4d]">Email</dt>
              <dd>[Add verified support email address]</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-[#172b4d]">Phone</dt>
              <dd>[Add verified support phone number]</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-[#172b4d]">Address</dt>
              <dd>[Add verified business address, if applicable]</dd>
            </div>
          </dl>
        </div>
      </div>
    </SimplePage>
  )
}
