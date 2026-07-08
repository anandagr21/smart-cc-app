import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollReveal from "./ScrollReveal";

export default function DeleteDataPage() {
  return (
    <div className="font-sans bg-surface-950 text-white antialiased overflow-x-hidden min-h-screen">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
              Delete Your Data
            </h1>
          </ScrollReveal>
          <ScrollReveal>
            <p className="text-white/40 text-sm mb-4">
              Card Analyser by Akaovia
            </p>
            <p className="text-white/55 mb-12 max-w-2xl">
              You have full control over your data. Follow the steps below to
              request deletion of your Card Analyser account and all associated
              data.
            </p>
          </ScrollReveal>

          <div className="space-y-10">
            <ScrollReveal>
              <section>
                <h2 className="text-xl font-bold text-white/90 mb-4">
                  Steps to request deletion
                </h2>
                <ol className="space-y-4 ml-2">
                  {[
                    {
                      step: "1",
                      text: "Send an email to",
                      email: "akaovia@gmail.com",
                      emailHref: "mailto:akaovia@gmail.com?subject=Account%20Deletion%20Request",
                    },
                    {
                      step: "2",
                      text: 'Use the subject line:',
                      bold: '"Account Deletion Request"',
                    },
                    {
                      step: "3",
                      text: "In the body, include the email address linked to your Card Analyser account so we can verify ownership.",
                    },
                    {
                      step: "4",
                      text: "We will confirm receipt within 48 hours and complete the deletion within 30 days. You'll receive a confirmation email once your data has been permanently removed.",
                    },
                  ].map((item) => (
                    <li key={item.step} className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-500/20 text-accent-400 font-bold text-sm flex items-center justify-center border border-accent-500/30">
                        {item.step}
                      </span>
                      <div className="text-white/55 pt-1">
                        {item.text}{" "}
                        {item.email && (
                          <a
                            href={item.emailHref}
                            className="text-accent-400 hover:text-accent-300 underline transition-colors font-medium"
                          >
                            {item.email}
                          </a>
                        )}
                        {item.bold && (
                          <strong className="text-white/70">{item.bold}</strong>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                <p className="text-white/55 mt-6 ml-2">
                  Alternatively, you can email{" "}
                  <a
                    href="mailto:aggarwal.anand14@gmail.com?subject=Account%20Deletion%20Request"
                    className="text-accent-400 hover:text-accent-300 underline transition-colors"
                  >
                    aggarwal.anand14@gmail.com
                  </a>{" "}
                  with the same subject line.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section>
                <h2 className="text-xl font-bold text-white/90 mb-4">
                  What gets deleted
                </h2>
                <ul className="list-disc list-inside text-white/55 space-y-2 ml-2">
                  <li>Account and Google Sign-In linkage</li>
                  <li>All saved credit cards (name, issuer, last 4 digits, limits, fee data)</li>
                  <li>All transaction records</li>
                  <li>Search history</li>
                  <li>Optimization preferences and personality profile</li>
                  <li>Monthly spending intelligence and insights</li>
                  <li>Submitted feedback and support history</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section>
                <h2 className="text-xl font-bold text-white/90 mb-4">
                  What may be retained
                </h2>
                <ul className="list-disc list-inside text-white/55 space-y-2 ml-2">
                  <li>
                    <strong className="text-white/70">Anonymized aggregates.</strong>{" "}
                    De-identified, aggregated data used to improve recommendation
                    accuracy. This cannot be linked back to any individual user.
                  </li>
                  <li>
                    <strong className="text-white/70">Crash logs.</strong>{" "}
                    Error and performance data in Sentry is automatically deleted
                    after 90 days and is not tied to your identity.
                  </li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section>
                <h2 className="text-xl font-bold text-white/90 mb-4">
                  Delete from within the app
                </h2>
                <p className="text-white/55">
                  You can delete individual cards or transactions at any time
                  directly in the app. Open the card or transaction detail screen
                  and use the delete option. This removes that data immediately
                  without requiring an email request.
                </p>
              </section>
            </ScrollReveal>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
