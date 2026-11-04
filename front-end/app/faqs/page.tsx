import { SimplePage } from '@/components/app-pages'

const faqs = [
  {
    question: 'What is Farewell Connect?',
    answer:
      'Farewell Connect is a platform intended to help families find and compare funeral-service providers.',
  },
  {
    question: 'Are the marketplace listings and prices live?',
    answer:
      'The current marketplace includes demonstration listings and prices. Confirm availability and pricing directly with a provider before making decisions.',
  },
  {
    question: 'Does submitting a booking request confirm a service?',
    answer:
      'No. The booking experience is currently a demonstration and does not confirm or send a booking request.',
  },
  {
    question: 'What happens after provider registration?',
    answer:
      'Provider applications are pending administrator verification. The current registration page does not sign applicants in automatically.',
  },
]

export default function FaqsPage() {
  return (
    <SimplePage eyebrow="Help & support" title="Frequently asked questions.">
      <dl className="mt-8 max-w-3xl divide-y divide-[#e8e4dd] rounded-2xl border border-[#e8e4dd] bg-white px-6">
        {faqs.map(({ question, answer }) => (
          <div key={question} className="py-6">
            <dt className="font-serif text-xl text-[#172b4d]">{question}</dt>
            <dd className="mt-2 leading-7 text-[#697586]">{answer}</dd>
          </div>
        ))}
      </dl>
    </SimplePage>
  )
}
