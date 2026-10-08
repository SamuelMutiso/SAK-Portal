import { Link } from "react-router-dom";
import LegalLayout from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy policy">
      <p>
        This policy explains what personal information the Success Academy Kitengela portal collects, why, who it is shared with and the rights
        you have under the Kenya Data Protection Act, 2019. When you first sign in you will be asked to confirm that you have read it and, where
        needed, to give your consent.
      </p>

      <section>
        <h2>1. Who is responsible</h2>
        <p>
          Success Academy Kitengela, Prison Road, Kitengela, P.O. Box 478-00242, is the <strong>data controller</strong>. The technical provider
          that builds and maintains the portal is a <strong>data processor</strong> and handles information only on the school&apos;s
          instructions. Contact the school office on 0748 065 956 about anything in this policy.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p><strong>Parents and guardians:</strong> name, phone number, email, the children linked to you, people you authorise to pick up your child, an emergency contact, M-Pesa phone numbers and payment confirmations, notices you have marked as seen, and your consent record.</p>
        <p className="mt-2"><strong>Learners:</strong> name, admission number, UPI and KNEC assessment number, class, date of birth, gender, boarding and transport details, attendance, marks, CBC performance levels, competencies and values, teacher comments, homework, club membership, library loans, leave-out requests, fee balance, bus boarding times, daily diary entries for Playgroup to PP2 and, only with your permission, photos of class work.</p>
        <p className="mt-2"><strong>Teachers, office staff and drivers:</strong> name, phone number, email, role, the class or route assigned to you, and the records you create or change.</p>
        <p className="mt-2"><strong>Everyone, for security:</strong> sign-in times, failed sign-in attempts, changes made, refused actions, IP address, approximate location worked out from the IP address, and device and browser type.</p>
      </section>

      <section>
        <h2>3. Why we use it</h2>
        <ul>
          <li>to run the school and keep parents informed: notices, report cards, attendance, homework, timetables, clubs and events;</li>
          <li>to keep learners safe: pick-up checks, bus boarding alerts, emergency contacts and leave-out approvals;</li>
          <li>to meet legal and examination duties, including school-based assessment records for KNEC;</li>
          <li>to manage fees and payments;</li>
          <li>to protect the system and the people in it, investigate misuse and settle disputes about who changed what.</li>
        </ul>
        <p className="mt-2">
          We rely on your <strong>consent</strong>, on the school&apos;s duties to learners and parents, on legal obligations, and on the
          school&apos;s legitimate interest in keeping its records secure.
        </p>
      </section>

      <section>
        <h2>4. Children&apos;s information</h2>
        <p>
          Under section 33 of the Data Protection Act, the school processes a child&apos;s information with the consent of a parent or guardian
          and in the child&apos;s best interests. Photos of class work in the learner portfolio are only taken with separate permission, which you
          can withdraw at any time through the school office. Learner information is only shown to that learner&apos;s parents, their teachers and
          authorised school staff.
        </p>
      </section>

      <section>
        <h2>5. Who we share it with</h2>
        <ul>
          <li><strong>Africa&apos;s Talking</strong>, to send SMS notices, alerts and receipts;</li>
          <li><strong>Safaricom (M-Pesa)</strong>, to process fee payments you start;</li>
          <li><strong>Hosting providers</strong> that store and run the portal (Vercel, Render and Neon), whose servers may be outside Kenya, under contracts that require them to protect the data;</li>
          <li><strong>ipapi.co</strong>, which receives IP addresses from security records to work out an approximate location;</li>
          <li><strong>KNEC and the Ministry of Education</strong>, where the law requires;</li>
          <li>the police or courts, only where the law requires or to protect a child.</li>
        </ul>
        <p className="mt-2">We do not sell personal information or use it for advertising.</p>
      </section>

      <section>
        <h2>6. How long we keep it</h2>
        <ul>
          <li>learner academic records, for as long as the school is required to keep school records;</li>
          <li>other learner and parent information, while the learner is at the school and for a reasonable period after they leave;</li>
          <li>security and audit records and consent records, for at least three years, so that disputes can be investigated;</li>
          <li>removed accounts are locked straight away, but records they created stay for the school&apos;s records.</li>
        </ul>
      </section>

      <section>
        <h2>7. How we protect it</h2>
        <p>
          Passwords are stored in scrambled (hashed) form, connections are encrypted, each person only sees what their role allows, repeated
          sign-in attempts are limited, and every change is recorded in a tamper-evident audit trail.
        </p>
      </section>

      <section>
        <h2>8. Your rights</h2>
        <p>Under section 26 of the Data Protection Act you have the right to:</p>
        <ul>
          <li>be told how your information is used;</li>
          <li>see the information held about you or your child;</li>
          <li>ask for wrong information to be corrected;</li>
          <li>object to some uses, or withdraw consent (this may mean you can no longer use the portal);</li>
          <li>ask for information to be deleted where the school no longer has a reason to keep it.</li>
        </ul>
        <p className="mt-2">
          Make requests through the school office. If you are unhappy with how your information is handled, you may complain to the Office of the
          Data Protection Commissioner (ODPC), <a href="https://www.odpc.go.ke">www.odpc.go.ke</a>.
        </p>
      </section>

      <section>
        <h2>9. Changes</h2>
        <p>
          If this policy changes, you will be asked to read and accept the new version the next time you sign in. See also the{" "}
          <Link to="/terms">Terms of use</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
