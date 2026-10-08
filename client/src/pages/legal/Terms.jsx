import { Link } from "react-router-dom";
import LegalLayout from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms of use">
      <p>
        These terms apply to everyone who uses the Success Academy Kitengela parent and staff portal: parents and guardians, teachers, office
        staff, bus drivers and school management. By ticking the box and signing with your name when you first sign in, you agree to them.
      </p>

      <section>
        <h2>1. Who runs the portal</h2>
        <p>
          The portal is provided by Success Academy Kitengela, Prison Road, Kitengela, P.O. Box 478-00242 (&ldquo;the school&rdquo;). The school
          decides what information is collected and why. A technical provider builds and maintains the system for the school and acts on its
          instructions.
        </p>
      </section>

      <section>
        <h2>2. Your account</h2>
        <ul>
          <li>Your account is for you alone. Do not share your password with anyone, including other staff, family members or learners.</li>
          <li>You are responsible for everything done with your account. If you believe someone else has used it, tell the school office immediately so the account can be locked.</li>
          <li>Keep your phone number and email up to date with the school office so that you receive notices and payment receipts.</li>
        </ul>
      </section>

      <section>
        <h2>3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>try to see or change information you have not been given access to, including other families&apos; children;</li>
          <li>enter false grades, attendance, payments or other records, or change records to harm or favour anyone;</li>
          <li>copy, share or post learners&apos; information, photos or results outside the portal without the school&apos;s permission;</li>
          <li>send abusive, threatening or misleading messages, or use the portal to harass anyone;</li>
          <li>attempt to break, overload or get around the portal&apos;s security.</li>
        </ul>
      </section>

      <section>
        <h2>4. Activity is recorded</h2>
        <p>
          To protect learners and staff, the portal records sign-ins, failed sign-in attempts, changes to records and refused actions, together
          with the time, the account used, the IP address, the approximate location and the type of device and browser. These records cannot be
          edited or deleted through the portal and may be used to investigate misuse, settle disputes and, where necessary, as evidence. See the{" "}
          <Link to="/privacy">Privacy Policy</Link> for details.
        </p>
      </section>

      <section>
        <h2>5. Suspending or removing accounts</h2>
        <p>
          The school may switch off or remove an account at any time if these terms are broken, if a staff member leaves the school, if a learner
          leaves, or to protect learners, staff or the system. Records created by an account remain after it is removed so that the school&apos;s
          records stay complete.
        </p>
      </section>

      <section>
        <h2>6. Fees and payments</h2>
        <p>
          Fee balances shown in the portal are for information and may take time to update. The school&apos;s official fee statement prevails if
          there is a difference. M-Pesa payments are processed by Safaricom; keep your M-Pesa confirmation message as proof of payment.
        </p>
      </section>

      <section>
        <h2>7. Availability</h2>
        <p>
          The school aims to keep the portal available but does not guarantee that it will always be available or error-free. Important
          information may also be shared by SMS, letter or at school. Report any error you notice to the school office.
        </p>
      </section>

      <section>
        <h2>8. Changes to these terms</h2>
        <p>
          The school may update these terms. When it does, you will be asked to read and accept the new version the next time you sign in.
        </p>
      </section>

      <section>
        <h2>9. Law and disputes</h2>
        <p>
          These terms are governed by the laws of Kenya. Questions or complaints should first be raised with the school office on 0748 065 956.
        </p>
      </section>
    </LegalLayout>
  );
}
