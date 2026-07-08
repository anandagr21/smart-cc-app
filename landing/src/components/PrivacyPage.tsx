import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollReveal from "./ScrollReveal";

const sections: { title: string; content: React.ReactNode }[] = [
  {
    title: "1. Information We Collect",
    content: (
      <div className="space-y-5">
        <div>
          <h3 className="text-white/90 font-semibold mb-1">Account Information</h3>
          <p className="text-white/55">
            When you sign in with Google, we receive your name, email address, and Google
            account ID. We use this solely to identify your account, personalize your
            experience, and sync your data across sessions.
          </p>
        </div>
        <div>
          <h3 className="text-white/90 font-semibold mb-1">Credit Card Information</h3>
          <p className="text-white/55">
            To provide card recommendations, you may add credit cards to your profile.
            We collect the card name, issuing bank, card network, and optionally the{" "}
            <strong className="text-white/70">last 4 digits</strong> of your card number
            (for your reference only — this field is completely optional). We also store
            card metadata you provide: credit limit, billing and due dates, annual fees,
            fee waiver thresholds, and reward rates. We never collect or store your full
            card number, CVV, PIN, or online banking credentials.
          </p>
        </div>
        <div>
          <h3 className="text-white/90 font-semibold mb-1">Transaction Data</h3>
          <p className="text-white/55">
            You may manually log purchase transactions with the merchant name, amount,
            currency, payment mode, and date. The backend enriches this with normalized
            merchant names and spending categories to power recommendations and
            spending insights.
          </p>
        </div>
        <div>
          <h3 className="text-white/90 font-semibold mb-1">Browser Extension</h3>
          <p className="text-white/55">
            If you install our browser extension, it detects the current merchant domain
            and attempts to extract cart or checkout totals from supported shopping sites
            (Amazon, Flipkart, Swiggy, Zomato, and others). This data is used only to
            surface card recommendations while you shop, and is not used for any other
            purpose.
          </p>
        </div>
        <div>
          <h3 className="text-white/90 font-semibold mb-1">Device & Crash Data</h3>
          <p className="text-white/55">
            We use Sentry for error monitoring. When a crash or unexpected error occurs,
            Sentry collects the error message, stack trace, device model, OS version, app
            version, and recent navigation history within the app. We also collect a 5%
            sample of app performance traces in production. This data is used exclusively
            to identify and fix bugs.
          </p>
        </div>
        <div>
          <h3 className="text-white/90 font-semibold mb-1">Usage Data</h3>
          <p className="text-white/55">
            We log your in-app searches, the optimization preferences you set (e.g.,
            prioritize cashback vs. travel rewards), and feedback you submit with
            calculation context. This helps us improve recommendation quality. We do
            not use any third-party marketing or product analytics SDKs.
          </p>
        </div>
        <div>
          <h3 className="text-white/90 font-semibold mb-1">Local Storage</h3>
          <p className="text-white/55">
            The app stores your auth token, user profile, theme preference, and
            onboarding state locally on your device using encrypted storage
            (iOS Keychain / Android Keystore). This data never leaves your device
            beyond the normal sync to our backend when you are signed in.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "2. How We Use Your Information",
    content: (
      <div>
        <p className="text-white/55 mb-3">We use the information we collect to:</p>
        <ul className="list-disc list-inside text-white/55 space-y-1.5 ml-2">
          <li>Authenticate your account and sync your data securely across devices</li>
          <li>Calculate which of your cards earns the most rewards for each transaction</li>
          <li>Generate AI-powered explanations of card recommendations and portfolio insights</li>
          <li>Track fee waiver progress and milestone benefits across your cards</li>
          <li>Provide monthly spending analysis and optimization suggestions</li>
          <li>Detect, diagnose, and fix crashes and performance issues</li>
          <li>Deliver over-the-air app updates via Expo Updates</li>
          <li>Improve recommendation accuracy based on aggregated usage patterns</li>
        </ul>
      </div>
    ),
  },
  {
    title: "3. Data Sharing & Third Parties",
    content: (
      <div>
        <p className="text-white/55 mb-3">
          We do <strong className="text-white/75">not</strong> sell, rent, or share your
          personal data with advertisers, data brokers, or analytics platforms. We share
          the minimum data necessary with the following service providers:
        </p>
        <ul className="list-disc list-inside text-white/55 space-y-1.5 ml-2 mb-3">
          <li><strong className="text-white/70">Google</strong> — for account authentication via Google Sign-In</li>
          <li><strong className="text-white/70">Sentry</strong> — for crash reporting and performance monitoring</li>
          <li><strong className="text-white/70">Expo</strong> — for over-the-air app updates (device metadata only)</li>
          <li>
            <strong className="text-white/70">AI Providers (DeepSeek, OpenAI)</strong> — your card portfolio,
            transaction details, and spending patterns are processed by AI models to
            generate recommendation explanations, portfolio narratives, and extract
            reward rules from card documentation. These providers process data under
            their respective data processing terms and do not train on your data.
          </li>
        </ul>
        <p className="text-white/55">
          All backend processing occurs on servers we operate. No third party has
          direct access to our database.
        </p>
      </div>
    ),
  },
  {
    title: "4. Data Security",
    content: (
      <p className="text-white/55">
        We implement appropriate technical and organizational measures to protect
        your data. Authentication tokens are stored in device-level encrypted storage
        (iOS Keychain / Android Keystore). All communication with our backend is
        encrypted via HTTPS. API access is authenticated via short-lived JWT tokens.
        We never store full credit card numbers — only the last 4 digits, which
        cannot be used to make purchases.
      </p>
    ),
  },
  {
    title: "5. Data Retention & Deletion",
    content: (
      <div>
        <p className="text-white/55 mb-3">
          We retain your account, card, and transaction data for as long as your account
          is active. You can delete individual cards or transactions at any time from
          within the app. To request full account deletion, visit our{" "}
          <a href="/delete-data" className="text-accent-400 hover:text-accent-300 underline transition-colors">
            data deletion page
          </a>{" "}
          or contact us at the email below. Deletion requests are processed within 30 days.
        </p>
        <p className="text-white/55">
          Crash and performance data in Sentry is automatically deleted after 90 days.
          AI provider data processing is governed by each provider's data retention
          policies.
        </p>
      </div>
    ),
  },
  {
    title: "6. Children's Privacy",
    content: (
      <p className="text-white/55">
        Card Analyser is not directed at children under 13. We do not knowingly
        collect personal information from children under 13. If we learn we have
        collected such data, we will delete it promptly.
      </p>
    ),
  },
  {
    title: "7. Changes to This Policy",
    content: (
      <p className="text-white/55">
        We may update this policy from time to time to reflect changes in our
        practices or for legal reasons. We will notify you of material changes by
        updating the date at the top of this page and, where appropriate, through
        the app.
      </p>
    ),
  },
  {
    title: "8. Contact Us",
    content: (
      <p className="text-white/55">
        If you have questions about this policy, wish to exercise your data rights,
        or want to request account deletion, contact us at{" "}
        <a
          href="mailto:akaovia@gmail.com"
          className="text-accent-400 hover:text-accent-300 underline transition-colors"
        >
          akaovia@gmail.com
        </a>{" "}
        or{" "}
        <a
          href="mailto:aggarwal.anand14@gmail.com"
          className="text-accent-400 hover:text-accent-300 underline transition-colors"
        >
          aggarwal.anand14@gmail.com
        </a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="font-sans bg-surface-950 text-white antialiased overflow-x-hidden min-h-screen">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
              Privacy Policy
            </h1>
          </ScrollReveal>
          <ScrollReveal>
            <p className="text-white/40 text-sm mb-12">
              Card Analyser — Last updated: July 8, 2026
            </p>
          </ScrollReveal>

          <div className="space-y-10">
            {sections.map((section, i) => (
              <ScrollReveal key={i}>
                <section>
                  <h2 className="text-xl font-bold text-white/90 mb-3">
                    {section.title}
                  </h2>
                  {section.content}
                </section>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
