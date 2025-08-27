// Mock data for crowdfunding campaign
export const mockData = {
  totalGoal: 500,
  totalPreorders: 137,
  get nextSequence() {
    return this.totalPreorders + 1
  },
  get progressPercent() {
    return Math.round((this.totalPreorders / this.totalGoal) * 100)
  },
}

export const COUNTERS_MOCK = {
  totalGoal: 100,
  totalPreorders: 0,
}

export const ORDER_MOCK = {
  orderId: "demo_001",
  amount: 15000,
  currency: "HUF",
  status: "paid",
  sequenceNumber: 138,
  timeline: [
    { status: "paid", label: "Paid", active: true, completed: true },
    { status: "in_production", label: "In Production", active: false, completed: false },
    { status: "fulfilled", label: "Fulfilled", active: false, completed: false },
  ],
}

export const FAQ_MOCK = [
  {
    question: "When will I receive my book?",
    answer:
      "Books will be printed and shipped once we reach our goal of 500 preorders. Expected delivery is 6-8 weeks after the campaign ends.",
  },
  {
    question: "What if the campaign doesn't reach its goal?",
    answer: "If we don't reach 500 preorders, all payments will be fully refunded within 5-7 business days.",
  },
  {
    question: "Can I change or cancel my order?",
    answer:
      "You can cancel your preorder anytime before we reach our goal. Contact us at support@example.com for assistance.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely.",
  },
]

export const faqData = FAQ_MOCK
export const mockOrderData = ORDER_MOCK
