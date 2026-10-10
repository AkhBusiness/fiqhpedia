/* Guides and FAQs for the "I am new" tab. */
import learnJson from "@/data/learn.json"
import type { Faq, Guide } from "@/lib/fiqh-data"

export const guides: Guide[] = learnJson.guides as Guide[]
export const faqs: Faq[] = learnJson.faqs as Faq[]
